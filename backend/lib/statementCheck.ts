// Checking that a statement PDF is genuine.
//
// The buyer's copy carries a reference and a short code. Anyone holding the
// PDF — the buyer, or an authority they show it to — can enter both on the
// check page and see that the platform holds such a statement: when it was
// submitted, to which seller, and its status now. Nothing about the buyer is
// shown; the holder already has the PDF.
//
// The code is an HMAC of the reference under a key derived from the server's
// own secret, so it cannot be computed or guessed without the server, and a
// reference alone (which appears in emails) proves nothing. Every wrong guess
// gets the same answer, and the route is rate-limited.
import crypto from 'node:crypto';
import { prisma } from './prisma.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[0-9A-F]{20}$/;

function key(): Buffer {
  // Derived for this one purpose, so the code is useless as anything else.
  return crypto.createHmac('sha256', process.env.ENCRYPTION_KEY ?? 'unset').update('statement-check:v1').digest();
}

export function statementCheckCode(reference: string): string {
  return crypto.createHmac('sha256', key()).update(reference.toLowerCase()).digest('hex').slice(0, 20).toUpperCase();
}

export function statementCheckUrl(appUrl: string, reference: string): string {
  return `${appUrl.replace(/\/+$/, '')}/statement-check/${reference}?c=${statementCheckCode(reference)}`;
}

export type StatementCheck =
  | { result: 'GENUINE'; submittedAt: string; sellerName: string | null; status: string }
  | { result: 'GENUINE_NOT_HELD' }
  | { result: 'UNKNOWN' };

const STATUS: Record<string, string> = { PENDING_REVIEW: 'Awaiting review', APPROVED: 'Approved', DENIED: 'Declined' };

export async function checkStatement(reference: unknown, code: unknown): Promise<StatementCheck> {
  const ref = typeof reference === 'string' ? reference.trim() : '';
  const typed = typeof code === 'string' ? code.trim().toUpperCase().replace(/[\s-]/g, '') : '';
  if (!UUID.test(ref) || !CODE.test(typed)) return { result: 'UNKNOWN' };
  const expected = Buffer.from(statementCheckCode(ref));
  if (!crypto.timingSafeEqual(expected, Buffer.from(typed))) return { result: 'UNKNOWN' };

  const s = await prisma.submission.findUnique({
    where: { id: ref },
    select: { createdAt: true, status: true, company: { select: { name: true } } },
  });
  // The code is right, so the statement existed; it has since been deleted,
  // most likely by the retention period.
  if (!s) return { result: 'GENUINE_NOT_HELD' };
  return {
    result: 'GENUINE',
    submittedAt: s.createdAt.toISOString(),
    sellerName: s.company?.name ?? null,
    status: STATUS[s.status] ?? s.status,
  };
}
