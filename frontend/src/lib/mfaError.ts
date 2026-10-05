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

/**
 * True when the server is refusing because a second factor is required of
 * everyone and this account has none.
 *
 * Distinct from MFA_REQUIRED, which means "your password was right, now type a
 * code". This one means "you have no factor at all, go and get one", and it is
 * answered by a screen rather than a field.
 */
export function mfaEnrolmentRequired(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) return false;
  return error.errors.some(
    e => (e.extensions as { code?: string } | undefined)?.code === 'MFA_ENROLMENT_REQUIRED',
  );
}

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
