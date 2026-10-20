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
import bcrypt from 'bcrypt';
import { GraphQLError } from 'graphql';
import { LOCKED_MESSAGE, checkSecondFactorLimited, recordFailure, reserveAttempt } from './loginGuard.ts';
import { MFA_SELECT, mfaEnabled } from './mfa.ts';
import { spendOnce } from './spentTokens.ts';

type Kind = 'companyUser' | 'admin';
const PREFIX = 'su.';
const AUDIENCE = 'step-up';
const TTL_SECONDS = 120;


/**
 * What a step-up was approved for. A token is accepted only by that action: a
 * passkey prompt the person approved to change their sign-in methods must not
 * be redeemable for deleting a statement or exporting a buyer's data.
 */
export const STEP_UP_PURPOSES = ['sign-in-methods', 'delete-statement', 'buyer-data', 'decision-export', 'reveal'] as const;
export type StepUpPurpose = typeof STEP_UP_PURPOSES[number];
export function isStepUpPurpose(v: unknown): v is StepUpPurpose {
  return typeof v === 'string' && (STEP_UP_PURPOSES as readonly string[]).includes(v);
}

export function issueStepUp(kind: Kind, accountId: string, purpose: StepUpPurpose): string {
  return PREFIX + jwt.sign({ kind, pur: purpose }, process.env.COMPANY_JWT_SECRET!, {
    algorithm: 'HS256', audience: AUDIENCE, subject: accountId, expiresIn: TTL_SECONDS, jwtid: crypto.randomUUID(),
  });
}

export function isStepUpToken(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PREFIX);
}

/**
 * Valid, for this account and this purpose, and not used before — and now
 * used. The record of use is in the database (lib/spentTokens.ts), so a
 * restart does not make a spent token good again.
 */
export async function consumeStepUp(token: string, kind: Kind, accountId: string, purpose: StepUpPurpose): Promise<boolean> {
  try {
    const c = jwt.verify(token.slice(PREFIX.length), process.env.COMPANY_JWT_SECRET!, {
      algorithms: ['HS256'], audience: AUDIENCE, subject: accountId,
    }) as { kind?: string; pur?: string; jti?: string; exp?: number; iat?: number };
    if (c.kind !== kind || c.pur !== purpose) return false;
    return await spendOnce(c.jti, c.exp);
  } catch {
    return false;
  }
}

async function factors(kind: Kind, id: string) {
  const account = kind === 'admin'
    ? await prisma.admin.findUnique({ where: { id }, select: { id: true, failedLogins: true, lockedUntil: true, password: true, ...MFA_SELECT } })
      .then(a => a && { ...a, passwordHash: a.password })
    : await prisma.companyUser.findUnique({ where: { id }, select: { id: true, failedLogins: true, lockedUntil: true, passwordHash: true, ...MFA_SELECT } });
  const passkeys = await prisma.passkey.count({ where: kind === 'admin' ? { adminId: id } : { userId: id } });
  return { account, totp: !!account && mfaEnabled(account), passkeys };
}

export type ProofMethod = 'code' | 'passkey' | 'password';
export type ProofResult = { ok: true } | { ok: false; reason: 'needed' | 'invalid'; method: ProofMethod };

/**
 * Before a factor is added: an account that already has one must use it.
 *
 * An account with none yet proves itself with its password. Passing it on the
 * session alone let a stolen session — including one held in the
 * enrol-only state while two-factor is required — attach the thief's own
 * authenticator, which then cleared that state and counted as the account's
 * fresh second factor everywhere after.
 */
export async function proveExistingFactor(kind: Kind, id: string, proof: unknown): Promise<ProofResult> {
  const f = await factors(kind, id);
  if (!f.account) return { ok: false, reason: 'invalid', method: 'password' };
  if (!f.totp && f.passkeys === 0) {
    if (typeof proof !== 'string' || !proof) return { ok: false, reason: 'needed', method: 'password' };
    // Counted like a sign-in, so this is not an unlimited password oracle.
    const minutes = await reserveAttempt(kind, id);
    if (minutes > 0) throw new GraphQLError(LOCKED_MESSAGE(minutes), { extensions: { code: 'ACCOUNT_LOCKED' } });
    if (!(await bcrypt.compare(proof, f.account.passwordHash))) {
      await recordFailure(kind, f.account);
      return { ok: false, reason: 'invalid', method: 'password' };
    }
    return { ok: true };
  }
  const method = f.totp ? 'code' : 'passkey';
  if (typeof proof !== 'string' || !proof.trim()) return { ok: false, reason: 'needed', method };
  if (isStepUpToken(proof)) return (await consumeStepUp(proof, kind, id, 'sign-in-methods')) ? { ok: true } : { ok: false, reason: 'invalid', method };
  if (!f.totp) return { ok: false, reason: 'needed', method };
  const second = await checkSecondFactorLimited(kind, f.account, proof);
  return second.ok ? { ok: true } : { ok: false, reason: 'invalid', method };
}
