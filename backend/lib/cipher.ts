import 'dotenv/config';
import crypto from 'node:crypto';

const PREFIX_V1 = 'enc:v1:';
// v2 binds each ciphertext to the column it belongs to, so a value cannot be
// lifted from one field into another by anyone with database write access — a
// passport number moved into the address column would previously decrypt
// cleanly. Existing v1 values keep working and are upgraded when rewritten.
const PREFIX_V2 = 'enc:v2:';

function loadKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('ENCRYPTION_KEY must be set to 64 hex characters (generate with: openssl rand -hex 32)');
  }
  return Buffer.from(hex, 'hex');
}

const key = loadKey();

export function encryptField(plain: string, field?: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  if (field) cipher.setAAD(Buffer.from(field, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const prefix = field ? PREFIX_V2 : PREFIX_V1;
  return `${prefix}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptField(value: string, field?: string): string {
  const version = value.startsWith(PREFIX_V2) ? PREFIX_V2 : value.startsWith(PREFIX_V1) ? PREFIX_V1 : null;
  if (!version) return value; // legacy plaintext row
  const [ivB64, tagB64, dataB64] = value.slice(version.length).split(':');
  // The tag length is pinned. Without it, GCM accepts a truncated tag, and a
  // 4-byte tag is a forgery budget of 2^32 rather than 2^128.
  const tag = Buffer.from(tagB64, 'base64');
  if (tag.length !== 16) throw new Error('Encrypted value is malformed.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'), { authTagLength: 16 });
  // The tag only verifies against the column the value was written for.
  if (version === PREFIX_V2 && field) decipher.setAAD(Buffer.from(field, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

// Submission PII fields stored encrypted at rest
export const PII_FIELDS = [
  'email', 'orderNumber', 'firstName', 'lastName',
  'street', 'zipCode', 'place', 'country',
  'companyName', 'vatNumber', 'substances', 'casNumbers',
  'statement', 'statementTranslation', 'idDocumentName', 'idDocumentNumber', 'adminNote',
  // What VIES returned about the buyer's business (for a sole trader, a
  // person's name and home address) and the verification's own remarks.
  // Older rows hold these in plain text; decryptField passes those through.
  'viesName', 'viesAddress', 'idVerificationWarnings',
] as const;

export function encryptData<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const f of PII_FIELDS) {
    if (typeof out[f] === 'string') out[f] = encryptField(out[f] as string, f);
  }
  return out as T;
}

export function decryptRecord<T>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const out: Record<string, unknown> = { ...(record as Record<string, unknown>) };
  for (const f of PII_FIELDS) {
    if (typeof out[f] === 'string') out[f] = decryptField(out[f] as string, f);
  }
  return out as T;
}
