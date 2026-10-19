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

export async function recordFailure(model: 'companyUser' | 'admin', account: Account): Promise<void> {
  // Incremented in the database, not written from the value read earlier:
  // guesses sent in parallel all read the same count, and writing count + 1
  // back from each let them through without the lock ever closing.
  const after = await (prisma[model] as any).update({
    where: { id: account.id },
    data: { failedLogins: { increment: 1 } },
    select: { failedLogins: true },
  });
  if (after.failedLogins >= MAX_FAILURES) {
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
  const minutes = lockedFor(account);
  if (minutes > 0) {
    throw new GraphQLError(LOCKED_MESSAGE(minutes), { extensions: { code: 'ACCOUNT_LOCKED' } });
  }
  const result = await checkSecondFactor(model, account, code);
  if (!result.ok && result.reason === 'invalid') await recordFailure(model, account);
  else if (result.ok && account.failedLogins > 0) await recordSuccess(model, account.id);
  return result;
}
