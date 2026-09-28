// Signature verification for Didit webhooks.
//
// The webhook route is public and unauthenticated, so the signature is the only
// thing standing between an attacker and a forged "Approved" for someone else's
// session. Nothing in the payload is acted on until this passes, and even then
// the decision itself is re-fetched from the API rather than read out of the
// body.
import 'dotenv/config';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.ts';

const SECRET = process.env.DIDIT_WEBHOOK_SECRET;

export const WEBHOOK_CONFIGURED = !!SECRET;

// Didit's documented replay window.
const MAX_SKEW_MS = 300 * 1000;

// The V2 path has to parse the body, sort every key and re-serialise it twice
// before it can decide anything — work an unauthenticated caller was able to
// demand with an 833 KB body, at ~16 ms of server time each. Real deliveries are
// small, so anything larger is refused before that work starts.
const MAX_V2_BODY = 32 * 1024;

// Duplicate delivery is expected (Didit retries), so an event is processed at
// most once. Recorded in Postgres rather than memory, so a restart cannot cause
// a redelivered event to be processed twice and two instances cannot both claim
// the same one — the primary key is what decides.
const SEEN_TTL_MS = 60 * 60 * 1000;

/** Returns false when this event was already handled. */
export async function claimEvent(eventId: string): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: { eventId, expiresAt: new Date(Date.now() + SEEN_TTL_MS) },
    });
    return true;
  } catch {
    // Unique violation: another delivery (or another instance) got there first.
    return false;
  }
}

/** Drops expired rows. Called from the nightly maintenance job. */
export async function pruneEvents(): Promise<number> {
  const { count } = await prisma.webhookEvent.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

function hmac(payload: string | Buffer): string {
  return crypto.createHmac('sha256', SECRET as string).update(payload).digest('hex');
}

function matches(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  // timingSafeEqual throws on a length mismatch, so compare lengths first —
  // length is not a secret, the digest is.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Recursively sort object keys. Didit's V2 signature is computed over the
// payload re-serialised with sorted keys and unescaped Unicode; JSON.stringify
// already leaves non-ASCII unescaped and renders whole floats as integers,
// which matches their Python side.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

// Python's json.dumps defaults to ", " / ": " separators; a compact serialiser
// uses "," / ":". Which one Didit signs is not pinned down in the docs, so both
// candidates are tried. This path is only reached when the raw-bytes signature
// header is absent.
function v2Candidates(raw: Buffer): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    return [];
  }
  const compact = JSON.stringify(sortKeys(parsed));
  if (compact === undefined) return [];
  return [compact, pythonStyle(parsed)];
}

// Mirror of Python's json.dumps(obj, sort_keys=True, ensure_ascii=False)
// default separators (", " between items, ": " after keys).
function pythonStyle(value: unknown): string {
  const enc = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(enc).join(', ')}]`;
    if (v && typeof v === 'object') {
      const entries = Object.keys(v as Record<string, unknown>)
        .sort()
        .map(k => `${JSON.stringify(k)}: ${enc((v as Record<string, unknown>)[k])}`);
      return `{${entries.join(', ')}}`;
    }
    return JSON.stringify(v) ?? 'null';
  };
  return enc(value);
}

export type WebhookCheck = { ok: true } | { ok: false; reason: string };

/**
 * Verify a raw webhook request. `raw` must be the exact bytes received — the
 * route mounts express.raw() so nothing re-serialises the body before this.
 */
export function verifyWebhook(raw: Buffer, headers: Record<string, unknown>): WebhookCheck {
  if (!SECRET) return { ok: false, reason: 'webhook secret not configured' };

  const header = (name: string): string => {
    const v = headers[name];
    return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0] ?? '') : '';
  };

  // Cheapest checks first: a forged delivery should cost a string comparison,
  // not a megabyte of JSON work.
  const rawSigHeader = header('x-signature');
  const v2Header = header('x-signature-v2');
  if (!rawSigHeader && !v2Header) {
    return { ok: false, reason: 'no usable signature header' };
  }

  const timestamp = Number(header('x-timestamp'));
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { ok: false, reason: 'missing or invalid x-timestamp' };
  }
  // Didit documents seconds, but a 13-digit value is unambiguously milliseconds
  // and reading it as seconds puts the event ~50,000 years in the future, which
  // rejects every delivery. Choosing the unit is arithmetic, not a security
  // decision — the replay window below is what actually bounds replay.
  const sentAtMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const skewMs = Date.now() - sentAtMs;
  if (Math.abs(skewMs) > MAX_SKEW_MS) {
    // The magnitude is the whole diagnosis: a few seconds over means a slow
    // retry, hours means clock skew, millennia means the unit changed again.
    return {
      ok: false,
      reason: `timestamp outside the 300s replay window (x-timestamp=${timestamp}, off by ${Math.round(skewMs / 1000)}s)`,
    };
  }

  // Preferred: signature over the exact bytes we received. One HMAC, no
  // re-serialisation, so nothing can drift between their encoder and ours.
  if (rawSigHeader) {
    return matches(hmac(raw), rawSigHeader) ? { ok: true } : { ok: false, reason: 'x-signature mismatch' };
  }

  if (raw.length > MAX_V2_BODY) {
    return { ok: false, reason: `body too large for the v2 signature path (${raw.length} bytes)` };
  }
  for (const candidate of v2Candidates(raw)) {
    if (matches(hmac(candidate), v2Header)) return { ok: true };
  }
  return { ok: false, reason: 'x-signature-v2 mismatch' };

  // X-Signature-Simple only covers the envelope, not the payload — treating it
  // as proof of authenticity would let a caller keep the outer fields and swap
  // everything else, so it is never accepted.
}
