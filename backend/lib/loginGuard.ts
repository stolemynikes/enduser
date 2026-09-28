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
import { prisma } from './prisma.ts';

const MAX_FAILURES = 8;
const LOCK_MINUTES = 15;

export type Account = { id: string; failedLogins: number; lockedUntil: Date | null };

export function lockedFor(account: Account | null): number {
  if (!account?.lockedUntil) return 0;
  const ms = account.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

export async function recordFailure(model: 'companyUser' | 'admin', account: Account): Promise<void> {
  const failures = account.failedLogins + 1;
  const locked = failures >= MAX_FAILURES;
  await (prisma[model] as any).update({
    where: { id: account.id },
    data: {
      failedLogins: locked ? 0 : failures,
      lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : account.lockedUntil,
    },
  });
}

export async function recordSuccess(model: 'companyUser' | 'admin', id: string): Promise<void> {
  await (prisma[model] as any).update({
    where: { id },
    data: { failedLogins: 0, lockedUntil: null },
  });
}

export const LOCKED_MESSAGE = (minutes: number) =>
  `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
