// Time-based one-time passwords (RFC 6238), on top of HOTP (RFC 4226).
//
// Written out rather than pulled in. The algorithm is thirty lines of HMAC and
// a modulus, it is specified with official test vectors, and both RFCs publish
// those vectors — so this can be *proved* correct in a test file rather than
// trusted. For the one control that stands between a stolen password and every
// buyer's passport number, that is the better trade: a dependency here would be
// unverifiable code in the authentication path, and the audit surface of the
// package plus its own dependencies is larger than the thing it implements.
//
// Deliberately absent: SMS. A phone number is transferable by anyone who can
// convince a carrier, and the whole point of this is to stop an attacker who
// already has the password.
import crypto from 'node:crypto';

/** Authenticator apps expect a 30-second step and 6 digits. */
const STEP_SECONDS = 30;
const DIGITS = 6;

/**
 * How many steps either side of now are accepted.
 *
 * One step back and forward tolerates a phone whose clock drifts and a person
 * who types slowly, at the cost of widening the guessing window threefold —
 * which is why the per-account failure counter matters more here than it does
 * for passwords: six digits is a small space.
 */
const WINDOW_STEPS = 1;

// RFC 4648 base32, which is what every authenticator app reads.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  // Padding and spacing are how people transcribe these by hand; strip both.
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh shared secret. 20 bytes is the RFC 4226 recommendation. */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * HOTP for one counter value (RFC 4226 §5.3): HMAC the counter, then take four
 * bytes from a position the last nibble of the digest chooses.
 */
export function hotp(secret: Buffer, counter: number, algorithm = 'sha1', digits = DIGITS): string {
  const message = Buffer.alloc(8);
  // Counters are well inside 2^53, so splitting into two 32-bit halves is exact.
  message.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  message.writeUInt32BE(counter % 0x1_0000_0000, 4);

  const digest = crypto.createHmac(algorithm, secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** Which 30-second step a moment in time falls in. */
export function counterFor(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / STEP_SECONDS);
}

/** The code an app would be showing right now, for a base32 secret. */
export function totp(secretBase32: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secretBase32), counterFor(atMs));
}

export type TotpCheck =
  | { ok: true; counter: number }
  | { ok: false; reason: 'malformed' | 'mismatch' | 'reused' };

/**
 * Checks a typed code against the accepted window.
 *
 * Returns the counter it matched so the caller can store it: a code stays valid
 * for the rest of its step, and without remembering the last one used, a code
 * read over someone's shoulder — or captured by a proxy — can be replayed for
 * up to a minute. `lastCounter` is what closes that.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  { atMs = Date.now(), lastCounter = null }: { atMs?: number; lastCounter?: number | null } = {},
): TotpCheck {
  const typed = String(code ?? '').replace(/[\s-]/g, '');
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(typed)) return { ok: false, reason: 'malformed' };

  let secret: Buffer;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const now = counterFor(atMs);
  for (let drift = -WINDOW_STEPS; drift <= WINDOW_STEPS; drift++) {
    const counter = now + drift;
    const expected = hotp(secret, counter);
    // Constant-time: the digits of a valid code are the secret here.
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(typed, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      if (lastCounter != null && counter <= lastCounter) return { ok: false, reason: 'reused' };
      return { ok: true, counter };
    }
  }
  return { ok: false, reason: 'mismatch' };
}

/**
 * The URI an authenticator app scans.
 *
 * The label carries the account so a person with several entries can tell them
 * apart, and the issuer is what the app shows as the heading.
 */
export function otpauthUri({
  secret, account, issuer,
}: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Grouped in fours, because people read these off a screen and type them. */
export function formatSecretForTyping(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}
