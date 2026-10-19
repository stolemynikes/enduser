// What a support session may change.
//
// Platform support opens a seller's account to look and to help. Every
// mutation in a support session is refused unless it is on the short list
// below — default-deny, enforced once for the whole API, so a new mutation is
// closed to support until someone decides otherwise. The list held one
// resolver-by-resolver check each, and the gaps were exactly where it was
// forgotten: switching company or enrolling a factor turned a support session
// into an ordinary owner session; invitations, roles, deletions and clearing
// the "support opened your account" notice were all open to it.
import { GraphQLError, Kind, type OperationDefinitionNode } from 'graphql';

const SUPPORT_MUTATIONS = new Set([
  // Opening a document number needs the admin's own second factor and is
  // logged as support (lib/reveal.ts).
  'revealDocumentNumber',
  // Re-running a check changes no data a person entered.
  'recheckCompanySubmissionSubstance',
]);

export function assertSupportMayRun(operation: OperationDefinitionNode | null | undefined, support: boolean | undefined) {
  if (!support || !operation || operation.operation !== 'mutation') return;
  for (const sel of operation.selectionSet.selections) {
    // A fragment at the top of a mutation could hide what it runs; refused.
    if (sel.kind !== Kind.FIELD || !SUPPORT_MUTATIONS.has(sel.name.value)) {
      throw new GraphQLError('Not available in a support session.', { extensions: { code: 'FORBIDDEN' } });
    }
  }
}
