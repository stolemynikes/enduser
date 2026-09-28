// Bot protection for the endpoints anyone on the internet can reach.
//
// Rate limiting counts requests per address; it cannot tell a person from a
// script, and it is defeated by spreading the work across hosts. Turnstile
// answers the other question — is there a browser and a human behind this —
// which is what the public form, the logins and the reset request actually need.
//
// Inert until TURNSTILE_SECRET is set, so development and tests are unaffected.
import 'dotenv/config';

const SECRET = process.env.TURNSTILE_SECRET;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

export const TURNSTILE_ENABLED = !!SECRET;

/**
 * Throws when the caller cannot show a valid, unused challenge token. Fails
 * closed: if Cloudflare cannot be reached, the request is refused rather than
 * waved through, because the endpoints behind this are the expensive ones.
 */
export async function verifyHumanOrThrow(token: string | undefined, remoteIp?: string): Promise<void> {
  if (!TURNSTILE_ENABLED) return;
  if (!token) throw new Error('Please complete the anti-robot check and try again.');

  let outcome: { success?: boolean; 'error-codes'?: string[] };
  try {
    const body = new URLSearchParams({ secret: SECRET as string, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    outcome = await res.json() as typeof outcome;
  } catch (err: any) {
    console.error(`[turnstile] verification unreachable: ${err?.message ?? 'unknown error'}`);
    throw new Error('We could not complete the anti-robot check. Please try again.');
  }

  if (!outcome.success) {
    console.warn(`[turnstile] rejected: ${(outcome['error-codes'] ?? []).join(', ') || 'no reason given'}`);
    throw new Error('The anti-robot check did not pass. Please try again.');
  }
}
