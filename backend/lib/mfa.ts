// Enrolment, verification and recovery for the second factor.
//
// Shared by both account kinds on purpose. A seller's owner can read every
// buyer's passport number in their tenant; a platform admin can do it in every
// tenant. The same control belongs on both, and one implementation means one
// place where a mistake can hide.
//
// The flow is deliberately two-step: a secret is written when enrolment starts,
// but the second factor only switches on once a valid code proves the app
// really has it. Enabling on the strength of a scan alone is how people lock
// themselves out of their own account.
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { prisma } from './prisma.ts';
import { decryptField, encryptField } from './cipher.ts';
import { formatSecretForTyping, generateSecret, otpauthUri, verifyTotp } from './totp.ts';

export type AccountKind = 'companyUser' | 'admin';

/** What the apps will show as the heading for this entry. */
const ISSUER = 'eustatement';

/** How many recovery codes an enrolment hands out. */
const RECOVERY_CODE_COUNT = 10;

export type MfaAccount = {
  id: string;
  totpSecret: string | null;
  totpEnabledAt: Date | null;
  totpLastCounter: number | null;
};

export function mfaEnabled(account: Pick<MfaAccount, 'totpEnabledAt'> | null | undefined): boolean {
  return account?.totpEnabledAt != null;
}

/**
 * Is a second factor required of everyone?
 *
 * Off by default, and that is deliberate rather than timid: switching it on
 * before the people who run the platform have enrolled locks them out of their
 * own product, and an account with no factor has nothing to offer at the next
 * sign-in. Enrol, then set this.
 */
export const MFA_REQUIRED = process.env.REQUIRE_MFA === '1';

/**
 * Does this account satisfy the requirement?
 *
 * A passkey counts. It has to: a passkey is the stronger of the two — it cannot
 * be handed to a look-alike domain — so a rule that only accepted an
 * authenticator app would push people towards the weaker factor in the name of
 * security.
 */
export async function hasSecondFactor(kind: AccountKind, id: string): Promise<boolean> {
  // One query, not two. This runs on every request once the requirement is on,
  // so the app-or-passkey question is answered by selecting the flag alongside
  // a single related row rather than by a flag lookup followed by a count.
  const account = await (prisma[kind] as any).findUnique({
    where: { id },
    select: {
      totpEnabledAt: true,
      passkeys: kind === 'companyUser' ? { select: { id: true }, take: 1 } : undefined,
    },
  });
  if (!account) return false;
  if (account.totpEnabledAt) return true;
  // Admin passkeys have no relation on the model (the column is a plain id, so
  // one table can serve both account kinds), so that side still needs its own
  // look — but it is one indexed row, not a count over all of them.
  if (kind === 'admin') {
    return (await prisma.passkey.findFirst({
      where: { adminId: id }, select: { id: true },
    })) != null;
  }
  return (account.passkeys?.length ?? 0) > 0;
}

// --- Recovery codes ----------------------------------------------------------

/**
 * Ten codes, grouped for reading off a screen. Base32 without the ambiguous
 * characters, because these get written on paper and then typed back.
 */
function newRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
  const bytes = crypto.randomBytes(10);
  const chars = [...bytes].map(b => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5, 10)}`;
}

/** Codes are compared by digest, never stored in a form that can be read back. */
function hashRecoveryCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Replaces every unused code with a fresh set and returns the plaintext once.
 *
 * Returning them once is the whole contract: they are shown on the screen that
 * asked for them and never again, which is why the caller must tell the person
 * to write them down before navigating away.
 */
export async function issueRecoveryCodes(kind: AccountKind, id: string): Promise<string[]> {
  const owner = kind === 'admin' ? { adminId: id } : { userId: id };
  await prisma.recoveryCode.deleteMany({ where: { ...owner, usedAt: null } });

  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) codes.push(newRecoveryCode());

  await prisma.recoveryCode.createMany({
    data: codes.map(code => ({ ...owner, codeHash: hashRecoveryCode(code) })),
  });
  return codes;
}

export async function recoveryCodesLeft(kind: AccountKind, id: string): Promise<number> {
  const owner = kind === 'admin' ? { adminId: id } : { userId: id };
  return prisma.recoveryCode.count({ where: { ...owner, usedAt: null } });
}

/**
 * Spends a recovery code. The update is conditional on the row still being
 * unused, so two logins racing on one code resolve to a single winner.
 */
async function consumeRecoveryCode(kind: AccountKind, id: string, code: string): Promise<boolean> {
  const owner = kind === 'admin' ? { adminId: id } : { userId: id };
  const row = await prisma.recoveryCode.findFirst({
    where: { ...owner, codeHash: hashRecoveryCode(code), usedAt: null },
    select: { id: true },
  });
  if (!row) return false;
  const { count } = await prisma.recoveryCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1;
}

// --- Enrolment ---------------------------------------------------------------

export type Enrolment = {
  /** Grouped in fours, for someone typing it into an app by hand. */
  secret: string;
  otpauthUri: string;
  /** An inline SVG data URI, so no image is fetched from anywhere. */
  qrSvg: string;
};

/**
 * Starts enrolment: a fresh secret, stored encrypted and not yet in force.
 *
 * Starting again replaces the pending secret, which is what should happen when
 * someone abandons a half-finished scan. It cannot replace a secret already in
 * force — turning the factor off is its own mutation, with its own checks.
 */
export async function startEnrolment(
  kind: AccountKind, id: string, account: string,
): Promise<Enrolment> {
  const secret = generateSecret();
  await (prisma[kind] as any).update({
    where: { id },
    data: { totpSecret: encryptField(secret, 'totpSecret'), totpLastCounter: null },
  });

  const uri = otpauthUri({ secret, account, issuer: ISSUER });
  const svg = await QRCode.toString(uri, { type: 'svg', margin: 1, width: 180 });
  return {
    secret: formatSecretForTyping(secret),
    otpauthUri: uri,
    qrSvg: `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`,
  };
}

export type ConfirmResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; reason: 'not-started' | 'bad-code' };

/**
 * Switches the factor on, but only on a code the pending secret really produces.
 *
 * Turning it on also ends the sessions that existed before it. A second factor
 * is checked when someone signs in, so without this it would protect future
 * sign-ins and leave the present untouched: a person who enables it *because*
 * they fear their account is compromised would have left the intruder's 30-day
 * token working. The caller is handed a fresh token so the person doing the
 * enrolling is not the one who gets signed out.
 *
 * The precise contract is "sessions older than about a second", not "all
 * sessions". `sessionsValidFrom` is compared against the token's `iat`, which
 * JWT records only to the second, and authContext allows a second of grace so
 * that a token minted in the same second as a cut-off is not treated as older
 * than it. A session from the same second therefore survives. That is
 * immaterial against the threat this exists for — a stolen session is hours or
 * days old, never one second — but it is not the absolute claim the phrase
 * "signed out everywhere" suggests, so it is written down here.
 */
export async function confirmEnrolment(
  kind: AccountKind, id: string, code: string,
): Promise<ConfirmResult> {
  const row = await (prisma[kind] as any).findUnique({
    where: { id },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!row?.totpSecret) return { ok: false, reason: 'not-started' };

  const secret = decryptField(row.totpSecret, 'totpSecret');
  const check = verifyTotp(secret, code);
  if (!check.ok) return { ok: false, reason: 'bad-code' };

  await (prisma[kind] as any).update({
    where: { id },
    data: {
      totpEnabledAt: row.totpEnabledAt ?? new Date(),
      totpLastCounter: check.counter,
      sessionsValidFrom: new Date(),
    },
  });
  return { ok: true, recoveryCodes: await issueRecoveryCodes(kind, id) };
}

/**
 * Turns the factor off and destroys the secret and every remaining code.
 *
 * Also ends every session, this one included. Removing a second factor is
 * exactly what an intruder with a stolen session would do first, so the account
 * is signed out everywhere and the password is needed to come back.
 */
export async function disableMfa(kind: AccountKind, id: string): Promise<void> {
  const owner = kind === 'admin' ? { adminId: id } : { userId: id };
  await prisma.recoveryCode.deleteMany({ where: owner });
  await (prisma[kind] as any).update({
    where: { id },
    data: {
      totpSecret: null, totpEnabledAt: null, totpLastCounter: null,
      sessionsValidFrom: new Date(),
    },
  });
}

// --- Checking a code at sign-in ---------------------------------------------

export type SecondFactorResult =
  | { ok: true; usedRecoveryCode: boolean }
  | { ok: false; reason: 'missing' | 'invalid' };

/**
 * Checks the second factor for an account that has one.
 *
 * A recovery code is accepted wherever a generated code is, because the person
 * whose phone is gone needs exactly one way in and it must not be a support
 * ticket. Both paths are single-use: the TOTP step is recorded so a code cannot
 * be replayed inside its window, and a recovery code is spent.
 *
 * Callers must only reach this after the password has been verified. Checking it
 * earlier would tell an unauthenticated guesser which accounts have MFA, which
 * is a map of which ones are worth attacking.
 */
export async function checkSecondFactor(
  kind: AccountKind, account: MfaAccount, code: string | null | undefined,
): Promise<SecondFactorResult> {
  // An account whose only factor is a passkey has no code to check here; the
  // passkey ceremony is its own path (lib/passkeys.ts) and the sign-in form
  // routes to it. This function is only about the app.
  if (!mfaEnabled(account) || !account.totpSecret) return { ok: true, usedRecoveryCode: false };

  const typed = String(code ?? '').trim();
  if (!typed) return { ok: false, reason: 'missing' };

  // A recovery code carries letters, a generated one never does — so the shape
  // decides which path to take, and a wrong guess cannot probe both.
  if (/[A-Za-z]/.test(typed)) {
    const spent = await consumeRecoveryCode(kind, account.id, typed);
    return spent ? { ok: true, usedRecoveryCode: true } : { ok: false, reason: 'invalid' };
  }

  const secret = decryptField(account.totpSecret, 'totpSecret');
  const check = verifyTotp(secret, typed, { lastCounter: account.totpLastCounter });
  if (!check.ok) return { ok: false, reason: 'invalid' };

  await (prisma[kind] as any).update({
    where: { id: account.id },
    data: { totpLastCounter: check.counter },
  });
  return { ok: true, usedRecoveryCode: false };
}

/** Fields every caller needs to select to be able to check the second factor. */
export const MFA_SELECT = {
  totpSecret: true, totpEnabledAt: true, totpLastCounter: true,
} as const;
