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

/**
 * True when an action needs a second factor and the account has none set up —
 * the document-number reveal answers this way. Shown as a pointer to the
 * Account tab, not as a wrong code.
 */
export function needsMfaSetup(error: unknown): boolean {
  return CombinedGraphQLErrors.is(error)
    && error.errors.some(e => (e.extensions as { code?: string } | undefined)?.code === 'MFA_SETUP_REQUIRED');
}

/**
 * The sentence to show when a code-protected action fails. Only a failure the
 * server reports as a bad code is called one: a dropped connection or a
 * refused request is not the code's fault, and saying it is makes people burn
 * a fresh code on a problem the code cannot fix.
 */
export function secondFactorMessage(error: unknown): string {
  const signal = mfaSignal(error);
  if (signal === 'required') return 'Enter the code from your authenticator app.';
  if (signal === 'invalid') return 'That code is not valid. Try the next one your app shows.';
  // Too many wrong codes: the server's own sentence says how long to wait.
  if (CombinedGraphQLErrors.is(error)) {
    const locked = error.errors.find(e => (e.extensions as { code?: string } | undefined)?.code === 'ACCOUNT_LOCKED');
    if (locked) return locked.message;
  }
  return 'The document number could not be shown. Check your connection and try again.';
}
