// Registry of the Didit sessions this server started.
//
// The browser hands the submit mutation a session id; this store is what makes
// that id trustworthy. It guarantees (a) the session was started by this server
// for this form, so an id observed elsewhere cannot be replayed in, and (b)
// single use, so one verification cannot be spent across several submissions.
//
// It lives in Postgres rather than memory: a restart used to strand every buyer
// mid-verification — their session vanished and they had to pay for a second
// one — and two instances would each have seen half the traffic. It holds no
// personal data, only opaque ids and a cached status.
import { prisma } from '../lib/prisma.ts';
import type { DiditVerificationStatus } from './didit.ts';

const TTL_MS = 60 * 60 * 1000; // 1 hour — hosted flow plus finishing the form

// Capacity used to be a single global bucket of 1000. That bucket was itself
// the vulnerability: anyone willing to open sessions could fill it and every
// seller's identity step answered "server busy" for an hour, while the monthly
// verification allowance burned. Budgets are now per caller and per tenant, so
// one abuser exhausts only their own share.
const MAX_PER_IP = 3;
const MAX_PER_COMPANY = 50;
/** A ceiling well above legitimate concurrent use, as a last stop. */
const MAX_LIVE_SESSIONS = 5000;
// Minimum gap between decision fetches for one session, so a browser polling in
// a tight loop cannot be turned into an amplifier against Didit.
const POLL_INTERVAL_MS = 3000;

/** A session is live while it is unexpired and unspent. */
function liveWhere(sessionId: string) {
  return { sessionId, consumedAt: null, expiresAt: { gt: new Date() } };
}

export type CapacityVerdict = { ok: true } | { ok: false; reason: 'ip' | 'company' | 'global' };

/**
 * May this caller start another verification? Checked per address and per
 * tenant before the global ceiling, so a flood is contained to whoever is
 * causing it.
 */
export async function checkCapacity(ipHash: string | null, companyId: string | null): Promise<CapacityVerdict> {
  const live = { consumedAt: null, expiresAt: { gt: new Date() } };
  const [fromIp, forCompany, total] = await Promise.all([
    ipHash ? prisma.verificationSession.count({ where: { ...live, ipHash } }) : Promise.resolve(0),
    companyId ? prisma.verificationSession.count({ where: { ...live, companyId } }) : Promise.resolve(0),
    prisma.verificationSession.count({ where: live }),
  ]);
  if (fromIp >= MAX_PER_IP) return { ok: false, reason: 'ip' };
  if (companyId && forCompany >= MAX_PER_COMPANY) return { ok: false, reason: 'company' };
  if (total >= MAX_LIVE_SESSIONS) return { ok: false, reason: 'global' };
  return { ok: true };
}

export async function registerSession(
  sessionId: string, companyId: string | null, ipHash: string | null,
): Promise<void> {
  await prisma.verificationSession.create({
    data: { sessionId, companyId, ipHash, expiresAt: new Date(Date.now() + TTL_MS) },
  });
}

/** True when this server started the session and it has not been spent yet. */
export async function isKnownSession(sessionId: string): Promise<boolean> {
  return (await prisma.verificationSession.count({ where: liveWhere(sessionId) })) > 0;
}

/**
 * Does this session belong to this company's form, and is it still unspent?
 * Checked before the decision is fetched so an unfinished verification can be
 * refused without spending it.
 */
export async function sessionMatches(sessionId: string, companyId: string | null): Promise<boolean> {
  const row = await prisma.verificationSession.findFirst({
    where: liveWhere(sessionId),
    select: { companyId: true },
  });
  return row != null && row.companyId === companyId;
}

/** Whether enough time has passed to fetch a fresh decision for this session. */
export async function shouldRefresh(sessionId: string): Promise<boolean> {
  const row = await prisma.verificationSession.findFirst({
    where: liveWhere(sessionId),
    select: { lastCheckedAt: true },
  });
  if (!row) return false;
  return row.lastCheckedAt == null || Date.now() - row.lastCheckedAt.getTime() >= POLL_INTERVAL_MS;
}

export async function cacheStatus(sessionId: string, status: DiditVerificationStatus): Promise<void> {
  await prisma.verificationSession.updateMany({
    where: liveWhere(sessionId),
    data: { status, lastCheckedAt: new Date() },
  });
}

export async function cachedStatus(sessionId: string): Promise<DiditVerificationStatus | null> {
  const row = await prisma.verificationSession.findFirst({
    where: liveWhere(sessionId),
    select: { status: true },
  });
  return (row?.status as DiditVerificationStatus) ?? null;
}

/**
 * Spend the session. Returns false when it is unknown, expired, already used,
 * or belongs to a different company's form — in every one of those cases the
 * submission must be refused rather than trusted.
 *
 * The update is conditional on the row still being unspent, so two submissions
 * racing on one session resolve to a single winner in the database.
 */
export async function consumeSession(sessionId: string, companyId: string | null): Promise<boolean> {
  const { count } = await prisma.verificationSession.updateMany({
    where: { ...liveWhere(sessionId), companyId },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}

/** Drops spent and expired rows. Called from the nightly maintenance job. */
export async function pruneSessions(): Promise<number> {
  const { count } = await prisma.verificationSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
