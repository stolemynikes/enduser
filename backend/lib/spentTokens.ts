// One-time credentials, spent once — across restarts.
//
// Passkey tickets and step-up tokens are signed and valid for two minutes;
// what makes them single-use is a record that one was spent. That record lived
// in process memory, so a restart forgot it and a captured, already-used
// credential worked again for the rest of its lifetime. The primary key makes
// spending atomic: of two requests presenting the same jti, one insert wins.
import { prisma } from './prisma.ts';

/** True the first time a jti is presented, false every time after. */
export async function spendOnce(jti: string | undefined, exp: number | undefined): Promise<boolean> {
  if (!jti || !exp) return false;
  try {
    await prisma.spentToken.create({ data: { jti, expiresAt: new Date(exp * 1000) } });
    return true;
  } catch (err: any) {
    if (err?.code === 'P2002') return false;
    throw err;
  }
}

/** Drops records of credentials that have expired anyway. Nightly. */
export async function pruneSpentTokens(): Promise<number> {
  const { count } = await prisma.spentToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
