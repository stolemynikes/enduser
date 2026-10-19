// Limits on how much work one GraphQL document may ask for.
//
// A depth limit sees how *deep* a query goes and nothing about how *wide*. That
// gap was exploitable two ways:
//
//   - One request carrying many aliased copies of submitEndUserStatement created
//     one submission per copy, while the rate limiter — which counts HTTP
//     requests — saw a single request.
//   - Fifty aliased copies of a list query returned fifty pages of decrypted
//     rows, and a hundred aliased public lookups did so with no account at all.
//
// So documents are now bounded by three things a caller cannot argue with: how
// many mutations they contain, how many fields in total, and how many rows the
// list fields ask for.
import { GraphQLError, type ASTVisitor, type FieldNode, type SelectionSetNode, type ValidationContext, Kind } from 'graphql';

/** Mutations execute in series and each one is a side effect; one per request. */
const MAX_MUTATIONS = 1;
/** Generous for the dashboards' largest query, absurd for an amplifier. */
const MAX_FIELDS = 300;
/** Total rows a single document may request across every list field. */
const MAX_ROWS = 500;
/** Assumed page size when a list field names no limit. */
const DEFAULT_ROWS = 100;
/**
 * What a list field may actually return when the page size arrives in a
 * variable. Validation runs before variables are coerced, so a document asking
 * `limit: $l` used to be charged the default 100 while the resolver happily
 * served its own maximum of 200 — five aliases cost 1000 rows against a 500
 * budget. An unknown page size is now charged at the ceiling.
 */
const MAX_PAGE = 200;

/**
 * List fields whose resolver reads a fixed number of rows whatever page it is
 * asked for, charged that number. teamDecisions filters in memory after
 * decrypting, so it always reads up to its cap: five aliased copies asking for
 * a page of 100 each used to pass a 500-row budget while decrypting 25,000.
 * At its real cost, one copy is the whole budget.
 */
const FIXED_ROWS: Record<string, number> = {
  teamDecisions: MAX_ROWS,
  adminCompanies: MAX_PAGE,
  // Five count queries over the tenant's statements per copy; uncharged, a
  // document of aliased copies multiplied them freely.
  companySubmissionCounts: 50,
  // Renders a PDF of every acceptance on file: one per request is enough.
  legalAcceptanceRecord: MAX_ROWS,
};

const LIST_FIELDS = new Set(['companySubmissions', 'submissions', 'adminCompanies', 'accessRequests', 'companyMembers', 'notifications', 'teamDecisions', ...Object.keys(FIXED_ROWS)]);

/**
 * Walks an operation with every fragment expanded in place, so a field reached
 * through `...Spread` or `... on Type` costs the same as one written out — and
 * a fragment spread from ten places costs ten times. Counting the document's
 * Field nodes instead charged a fragment once however often it was reused, and
 * never saw a mutation that sat inside one.
 */
function walk(
  context: ValidationContext,
  selectionSet: SelectionSetNode,
  onField: (node: FieldNode, depth: number) => void,
  depth: number,
  seen: ReadonlySet<string>,
): void {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      onField(sel, depth);
      if (sel.selectionSet) walk(context, sel.selectionSet, onField, depth + 1, seen);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      walk(context, sel.selectionSet, onField, depth, seen);
    } else {
      const name = sel.name.value;
      // A cycle is invalid and reported by its own rule; just do not follow it.
      if (seen.has(name)) continue;
      const fragment = context.getFragment(name);
      if (fragment) walk(context, fragment.selectionSet, onField, depth, new Set([...seen, name]));
    }
  }
}

export function costLimit() {
  return (context: ValidationContext): ASTVisitor => {
    let mutations = 0;
    let fields = 0;
    let rows = 0;
    let reportedFields = false;
    let reportedRows = false;

    return {
      OperationDefinition(node) {
        const isMutation = node.operation === 'mutation';
        walk(context, node.selectionSet, (field, depth) => {
          // Top-level fields of a mutation are the mutations themselves,
          // wherever a fragment put them.
          if (isMutation && depth === 0) mutations += 1;

          fields += 1;
          if (fields > MAX_FIELDS && !reportedFields) {
            reportedFields = true;
            context.reportError(new GraphQLError(
              `Query is too large: more than ${MAX_FIELDS} fields.`, { nodes: [field] },
            ));
          }
          if (!LIST_FIELDS.has(field.name.value)) return;

          const fixed = FIXED_ROWS[field.name.value];
          const limitArg = field.arguments?.find(a => a.name.value === 'limit');
          // A field that reads a fixed number of rows whatever it is asked
          // for is charged that number. Otherwise: no limit argument means
          // the resolver's own default; a literal costs what it says; a
          // variable is unknown here, so it costs the most it could become.
          const asked = fixed ?? (limitArg == null
            ? DEFAULT_ROWS
            : limitArg.value.kind === Kind.INT ? Number(limitArg.value.value) : MAX_PAGE);
          rows += Number.isFinite(asked) ? asked : MAX_PAGE;
          if (rows > MAX_ROWS && !reportedRows) {
            reportedRows = true;
            context.reportError(new GraphQLError(
              `Query asks for too many rows at once (limit ${MAX_ROWS}). Use paging.`,
              { nodes: [field] },
            ));
          }
        }, 0, new Set());

        if (mutations > MAX_MUTATIONS) {
          context.reportError(new GraphQLError(
            `A request may contain at most ${MAX_MUTATIONS} mutation. Send them as separate requests.`,
            { nodes: [node] },
          ));
        }
      },
    };
  };
}
