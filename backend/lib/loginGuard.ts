// Per-account brute-force protection.
//
// The IP limiter cannot see an attack spread across many addresses, which is
// what credential stuffing is. This counts failures against the *account*, so a
// distributed attempt locks the target rather than racing an IP budget that
// resets per host.
//
// The lock is short and self-clearing: long enough to make guessing useless,
// short enough that locking a victim out is a nuisance rather than a denial of
// service against them.
import { GraphQLError } from 'graphql';
import { prisma } from './prisma.ts';
import { checkSecondFactor, type MfaAccount, type SecondFactorResult } from './mfa.ts';

const MAX_FAILURES = 8;
const LOCK_MINUTES = 15;

export type Account = { id: string; failedLogins: number; lockedUntil: Date | null };

export function lockedFor(account: Account | null): number {
  if (!account?.lockedUntil) return 0;
  const ms = account.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/**
 * Takes one attempt from the account's budget before the attempt is judged.
 * Returns 0 when the attempt may go ahead, otherwise the minutes left on the
 * lock.
 *
 * The count is taken first, atomically and conditionally, because judging
 * first and counting afterwards let a burst through: every request in a
 * parallel burst read "not locked", was judged, and only then counted. With
 * the reservation, at most MAX_FAILURES attempts can be in flight per lock
 * window, however many are sent at once.
 */
export async function reserveAttempt(model: 'companyUser' | 'admin', id: string): Promise<number> {
  const now = new Date();
  const { count } = await (prisma[model] as any).updateMany({
    where: { id, failedLogins: { lt: MAX_FAILURES }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    data: { failedLogins: { increment: 1 } },
  });
  if (count === 1) return 0;
  const account = await (prisma[model] as any).findUnique({ where: { id }, select: { failedLogins: true, lockedUntil: true } });
  if (!account) return LOCK_MINUTES;
  if (!account.lockedUntil || account.lockedUntil < now) {
    // The budget is spent and the lock not yet written: write it now.
    await (prisma[model] as any).update({
      where: { id }, data: { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) },
    });
    return LOCK_MINUTES;
  }
  return lockedFor(account);
}

// A reserved attempt is never given back. A refund is an anonymous
// decrement: under concurrency it can land on another request's reservation,
// so a burst of harmless requests could hand a guesser's slots back. A step
// that proved the password but has not finished — the code not yet typed, the
// passkey not yet signed — keeps its slot until the sign-in completes
// (recordSuccess clears the count) or the window runs out.

/**
 * After a reserved attempt failed: closes the lock once the budget is spent.
 * The attempt itself was already counted by reserveAttempt.
 */
export async function recordFailure(model: 'companyUser' | 'admin', account: Account): Promise<void> {
  const now = await (prisma[model] as any).findUnique({ where: { id: account.id }, select: { failedLogins: true } });
  if (now && now.failedLogins >= MAX_FAILURES) {
    await (prisma[model] as any).update({
      where: { id: account.id },
      data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
    });
  }
}

export async function recordSuccess(model: 'companyUser' | 'admin', id: string): Promise<void> {
  await (prisma[model] as any).update({
    where: { id },
    data: { failedLogins: 0, lockedUntil: null },
  });
}

/**
 * Compared against when the account is unknown, so a missing account costs the
 * same bcrypt work as a wrong password and the two cannot be told apart by
 * timing. One copy, because a sign-in path that forgot it would be the oracle.
 */
export const DUMMY_HASH = '$2b$12$K8pQZ1sTBFQ9DfP6y0kZsuQ0tHfZ0Uu7uN3sT2mN5nGZ8vKcX2h5S';

export const LOCKED_MESSAGE = (minutes: number) =>
  `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;

/**
 * The second factor, checked outside sign-in — revealing a document number,
 * turning two-factor off, issuing new recovery codes — under the same
 * per-account limit as sign-in.
 *
 * These are reached with a session already in hand, which is exactly what a
 * stolen one is. Six digits is a small space: without a count, a stolen
 * session could keep guessing until a code matched, limited only by the
 * per-IP budget, which an attack spread over many addresses never meets.
 */
export async function checkSecondFactorLimited(
  model: 'companyUser' | 'admin', account: MfaAccount & Account, code: string | null | undefined,
): Promise<SecondFactorResult> {
  // Nothing typed is not a guess, so it takes nothing from the budget.
  if (!String(code ?? '').trim()) return checkSecondFactor(model, account, code);
  const minutes = await reserveAttempt(model, account.id);
  if (minutes > 0) {
    throw new GraphQLError(LOCKED_MESSAGE(minutes), { extensions: { code: 'ACCOUNT_LOCKED' } });
  }
  const result = await checkSecondFactor(model, account, code);
  if (result.ok) await recordSuccess(model, account.id);
  else await recordFailure(model, account);
  return result;
}
