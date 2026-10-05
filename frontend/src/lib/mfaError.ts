// Reading the second-factor state off a failed sign-in.
//
// The server answers with a machine-readable code rather than a sentence,
// because the form has to tell three situations apart and a UI should never
// have to match on prose that a copy edit can change:
//
//   MFA_REQUIRED — the password was right; now ask for a code
//   MFA_INVALID  — a code was given and it was wrong
//   anything else — the credentials themselves were refused
import { CombinedGraphQLErrors } from '@apollo/client';

export type MfaSignal = 'required' | 'invalid' | null;

/** Which second-factor state, if any, a caught error is reporting. */
export function mfaSignal(error: unknown): MfaSignal {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const e of error.errors) {
    const code = (e.extensions as { code?: string } | undefined)?.code;
    if (code === 'MFA_REQUIRED') return 'required';
    if (code === 'MFA_INVALID') return 'invalid';
  }
  return null;
}
