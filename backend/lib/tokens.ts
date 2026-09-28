// One-time values that travel in a link: invites, resets, confirmations.
//
// Generated from the CSPRNG and stored only as a digest. Prisma's cuid() is not
// a secret — it encodes a timestamp, a counter and a machine fingerprint, so
// consecutive values share most of their characters.
import crypto from 'node:crypto';

export function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Stable pseudonym for a value that must be counted but not stored — an address, an email. */
export function pseudonym(value: string): string {
  return crypto.createHmac('sha256', process.env.ENCRYPTION_KEY ?? 'unset')
    .update(value.trim().toLowerCase()).digest('hex');
}
