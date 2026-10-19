// Proving a second factor you already have, for one sensitive action.
//
// A code is typed; a passkey has to sign a challenge first. To let a passkey
// stand where a code is asked for, a passkey assertion made for this purpose
// is exchanged for a step-up token: short-lived, bound to one account, usable
// once. It is passed in the same `credential`/`proof` field a code would be.
//
// It is also the gate on adding a factor. Before this, a session alone could
// register a new passkey or authenticator app on an account that already had
// a factor — so a stolen session could mint its own "fresh second factor" and
// then pass every check that asks for one.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.ts';
import { checkSecondFactorLimited } from './loginGuard.ts';
import { MFA_SELECT, mfaEnabled } from './mfa.ts';

type Kind = 'companyUser' | 'admin';
const PREFIX = 'su.';
const AUDIENCE = 'step-up';
const TTL_SECONDS = 120;

/** jti → expiry, so a token works once. One instance (see the Dockerfile). */
const spent = new Map<string, number>();

export function issueStepUp(kind: Kind, accountId: string): string {
  return PREFIX + jwt.sign({ kind }, process.env.COMPANY_JWT_SECRET!, {
    algorithm: 'HS256', audience: AUDIENCE, subject: accountId, expiresIn: TTL_SECONDS, jwtid: crypto.randomUUID(),
  });
}

export function isStepUpToken(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PREFIX);
}

/** Valid, for this account, and not used before — and now used. */
export function consumeStepUp(token: string, kind: Kind, accountId: string): boolean {
  try {
    const c = jwt.verify(token.slice(PREFIX.length), process.env.COMPANY_JWT_SECRET!, {
      algorithms: ['HS256'], audience: AUDIENCE, subject: accountId,
    }) as { kind?: string; jti?: string; exp?: number };
    if (c.kind !== kind || !c.jti) return false;
    const now = Date.now();
    for (const [k, exp] of spent) if (exp < now) spent.delete(k);
    if (spent.has(c.jti)) return false;
    spent.set(c.jti, (c.exp ?? 0) * 1000);
    return true;
  } catch {
    return false;
  }
}

async function factors(kind: Kind, id: string) {
  const account = kind === 'admin'
    ? await prisma.admin.findUnique({ where: { id }, select: { id: true, failedLogins: true, lockedUntil: true, ...MFA_SELECT } })
    : await prisma.companyUser.findUnique({ where: { id }, select: { id: true, failedLogins: true, lockedUntil: true, ...MFA_SELECT } });
  const passkeys = await prisma.passkey.count({ where: kind === 'admin' ? { adminId: id } : { userId: id } });
  return { account, totp: !!account && mfaEnabled(account), passkeys };
}

export type ProofResult = { ok: true } | { ok: false; reason: 'needed'; method: 'code' | 'passkey' } | { ok: false; reason: 'invalid' };

/**
 * Before a factor is added: an account that already has one must use it.
 * An account with none yet is enrolling its first, and passes.
 */
export async function proveExistingFactor(kind: Kind, id: string, proof: unknown): Promise<ProofResult> {
  const f = await factors(kind, id);
  if (!f.account) return { ok: false, reason: 'invalid' };
  if (!f.totp && f.passkeys === 0) return { ok: true };
  const method = f.totp ? 'code' : 'passkey';
  if (typeof proof !== 'string' || !proof.trim()) return { ok: false, reason: 'needed', method };
  if (isStepUpToken(proof)) return consumeStepUp(proof, kind, id) ? { ok: true } : { ok: false, reason: 'invalid' };
  if (!f.totp) return { ok: false, reason: 'needed', method };
  const second = await checkSecondFactorLimited(kind, f.account, proof);
  return second.ok ? { ok: true } : { ok: false, reason: 'invalid' };
}
