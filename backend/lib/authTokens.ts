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
 * Issues a token and invalidates any earlier unused one of the same kind, so a
 * second "reset my password" click cannot leave two live links behind.
 */
export async function issueToken(userId: string, kind: AuthTokenKind): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.authToken.deleteMany({ where: { userId, kind, usedAt: null } });
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
  return count === 1 ? row.userId : null;
}

/** Drops expired and spent rows. Called from the nightly maintenance job. */
export async function pruneAuthTokens(): Promise<number> {
  const { count } = await prisma.authToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
