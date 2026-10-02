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
import { GraphQLError, type ASTVisitor, type ValidationContext, Kind } from 'graphql';

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

const LIST_FIELDS = new Set(['companySubmissions', 'submissions', 'adminCompanies', 'companyMembers', 'notifications']);

export function costLimit() {
  return (context: ValidationContext): ASTVisitor => {
    let mutations = 0;
    let fields = 0;
    let rows = 0;

    return {
      OperationDefinition(node) {
        if (node.operation !== 'mutation') return;
        mutations += node.selectionSet.selections.filter(s => s.kind === Kind.FIELD).length;
        if (mutations > MAX_MUTATIONS) {
          context.reportError(new GraphQLError(
            `A request may contain at most ${MAX_MUTATIONS} mutation. Send them as separate requests.`,
            { nodes: [node] },
          ));
        }
      },
      Field(node) {
        fields += 1;
        if (fields === MAX_FIELDS + 1) {
          context.reportError(new GraphQLError(
            `Query is too large: more than ${MAX_FIELDS} fields.`, { nodes: [node] },
          ));
        }
        if (!LIST_FIELDS.has(node.name.value)) return;

        const limitArg = node.arguments?.find(a => a.name.value === 'limit');
        // No limit argument at all: the resolver's own default applies.
        // A literal: charge what it says. Anything else (a variable, an
        // expression) is unknown here, so charge the most it could become.
        const asked = limitArg == null
          ? DEFAULT_ROWS
          : limitArg.value.kind === Kind.INT ? Number(limitArg.value.value) : MAX_PAGE;
        rows += Number.isFinite(asked) ? asked : MAX_PAGE;
        if (rows > MAX_ROWS) {
          context.reportError(new GraphQLError(
            `Query asks for too many rows at once (limit ${MAX_ROWS}). Use paging.`,
            { nodes: [node] },
          ));
        }
      },
    };
  };
}
