// Using the factor you already have, before adding another.
//
// The server refuses to add a passkey or an authenticator app to an account
// that already has a factor until that factor is used (STEP_UP_REQUIRED). It
// says which: a code from the app, or the passkey. For a passkey the browser
// signs a challenge and the server returns a one-time token that is sent as
// the proof; a code is typed by the person. An account with no factor yet
// proves itself with its password before adding the first.
import { gql, type ApolloClient } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client';
import { startAuthentication } from '@simplewebauthn/browser';

export type ProofMethod = 'code' | 'passkey' | 'password';

/** The factor the server is asking for, or null when this is another error. */
export function stepUpNeeded(err: unknown): ProofMethod | null {
  if (!CombinedGraphQLErrors.is(err)) return null;
  for (const e of err.errors) {
    if (e.extensions?.code === 'STEP_UP_REQUIRED') {
      const m = e.extensions?.method;
      return m === 'code' || m === 'password' ? m : 'passkey';
    }
  }
  return null;
}

const OPS = {
  company: {
    START: gql`mutation StartStepUp($purpose: String!) { startStepUp(purpose: $purpose) { optionsJson ticket } }`,
    FINISH: gql`mutation FinishStepUp($ticket: String!, $responseJson: String!, $purpose: String!) { finishStepUp(ticket: $ticket, responseJson: $responseJson, purpose: $purpose) }`,
    started: 'startStepUp', finished: 'finishStepUp',
  },
  admin: {
    START: gql`mutation StartAdminStepUp($purpose: String!) { startAdminStepUp(purpose: $purpose) { optionsJson ticket } }`,
    FINISH: gql`mutation FinishAdminStepUp($ticket: String!, $responseJson: String!, $purpose: String!) { finishAdminStepUp(ticket: $ticket, responseJson: $responseJson, purpose: $purpose) }`,
    started: 'startAdminStepUp', finished: 'finishAdminStepUp',
  },
} as const;

/** What the proof is for; the server only accepts it for that (lib/stepUp.ts). */
export type StepUpPurpose = 'sign-in-methods' | 'delete-statement' | 'buyer-data' | 'decision-export';

/** Signs a challenge with an existing passkey and returns the one-time proof. */
export async function passkeyProof(client: ApolloClient, account: 'company' | 'admin', purpose: StepUpPurpose): Promise<string> {
  const ops = OPS[account];
  const { data: began } = await client.mutate<any>({ mutation: ops.START, variables: { purpose } });
  const { optionsJson, ticket } = began[ops.started];
  const assertion = await startAuthentication({ optionsJSON: JSON.parse(optionsJson) });
  const { data: done } = await client.mutate<any>({
    mutation: ops.FINISH, variables: { ticket, responseJson: JSON.stringify(assertion), purpose },
  });
  return done[ops.finished] as string;
}
