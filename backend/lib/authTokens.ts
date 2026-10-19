// One-time links sent by email: password reset and address verification.
//
// Only a hash of the token is stored. The raw value exists in the email and
// nowhere else, so a leaked database cannot be used to take over an account —
// the same reasoning that applies to passwords.
import crypto from 'node:crypto';
import { prisma } from './prisma.ts';

export type AuthTokenKind = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

const TTL_MS: Record<AuthTokenKind, number> = {
  PASSWORD_RESET: 60 * 60 * 1000,          // an hour: long enough to find the mail
  EMAIL_VERIFICATION: 7 * 24 * 60 * 60 * 1000,
};

function hash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issues a token. Earlier unused links of the same kind stay valid until one of
 * them is used (consumeToken then spends the rest). Revoking them here let
 * anyone who knows an address cancel the link its owner was about to click,
 * just by asking for another — every link goes to the owner's own inbox, so
 * leaving them live gives a stranger nothing.
 */
export async function issueToken(userId: string, kind: AuthTokenKind): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.authToken.create({
    data: { userId, kind, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_MS[kind]) },
  });
  return token;
}

/**
 * Spends a token. Returns the user id, or null when the token is unknown,
 * expired or already used. The update is conditional, so two clicks on the same
 * link cannot both succeed.
 */
export async function consumeToken(token: string, kind: AuthTokenKind): Promise<string | null> {
  const row = await prisma.authToken.findUnique({
    where: { tokenHash: hash(token) },
    select: { id: true, userId: true, kind: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.kind !== kind || row.usedAt != null || row.expiresAt < new Date()) return null;

  const { count } = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  // One link used: every other live link of this kind is spent with it.
  await prisma.authToken.updateMany({
    where: { userId: row.userId, kind, usedAt: null },
    data: { usedAt: new Date() },
  });
  return row.userId;
}

/** Drops expired and spent rows. Called from the nightly maintenance job. */
export async function pruneAuthTokens(): Promise<number> {
  const { count } = await prisma.authToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
