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
import { DIDIT_ENABLED, deleteSession, type DiditVerificationStatus } from './didit.ts';
import { recordEvent } from '../lib/ops.ts';

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
  // Counted separately: the row itself is pruned once the session expires.
  recordEvent('didit-session-started');
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

// Pruning. A session no submission took over still has the buyer's document
// photos at Didit: they finished (or started) the hosted flow and then left,
// were refused after it (under age, wrong document), or the submission failed
// after the session was spent. Only a submission purges its own session, so
// these are purged here instead.
const DAY_MS = 24 * 60 * 60 * 1000;
/** Past expiry before a session is purged, so a submission still in flight when it expired is not raced. */
const PURGE_GRACE_MS = 60 * 60 * 1000;
/** After this, a session Didit keeps refusing to delete is dropped and logged for reconciliation. */
const PURGE_GIVE_UP_MS = 30 * DAY_MS;
/** Didit deletions per night; the rest wait for the next run. */
const MAX_PURGES_PER_RUN = 1000;
const PAGE = 500;

/**
 * `only` limits the run to these sessions; for tests, which share the database.
 *
 * Drops expired rows. An expired session no submission took over is deleted at
 * Didit first, and its row is only dropped once that worked, so a failed purge
 * is retried the next night. Called from the nightly maintenance job.
 */
export async function pruneSessions({ only }: { only?: string[] } = {}): Promise<{ pruned: number; gaveUp: number }> {
  const now = Date.now();
  let pruned = 0;
  let gaveUp = 0;
  let purges = 0;
  let after = '';
  for (;;) {
    const rows = await prisma.verificationSession.findMany({
      where: { expiresAt: { lt: new Date(now) }, sessionId: { gt: after, ...(only ? { in: only } : {}) } },
      select: { sessionId: true, expiresAt: true },
      orderBy: { sessionId: 'asc' },
      take: PAGE,
    });
    if (rows.length === 0) break;
    after = rows[rows.length - 1].sessionId;

    const taken = new Set(
      (await prisma.submission.findMany({
        where: { idVerificationSessionId: { in: rows.map(r => r.sessionId) } },
        select: { idVerificationSessionId: true },
      })).map(s => s.idVerificationSessionId),
    );

    const drop: string[] = [];
    for (const { sessionId, expiresAt } of rows) {
      // The submission owns its session's purge (and the webhook may still need it).
      if (taken.has(sessionId)) { drop.push(sessionId); continue; }
      const age = now - expiresAt.getTime();
      if (age < PURGE_GRACE_MS) continue;
      if (DIDIT_ENABLED) {
        // Over the nightly budget: untouched, so it is neither purged nor given up on.
        if (purges >= MAX_PURGES_PER_RUN) continue;
        purges++;
        if (await deleteSession(sessionId)) { recordEvent('didit-purge-abandoned'); drop.push(sessionId); continue; }
      }
      // Given up on only after a failed attempt (or with Didit switched off,
      // when no attempt is possible), never for want of one.
      if (age > PURGE_GIVE_UP_MS) {
        console.error(`[didit] giving up purging abandoned session ${sessionId}; delete it at Didit by hand`);
        gaveUp++;
        recordEvent('didit-purge-gaveup');
        drop.push(sessionId);
      }
    }
    if (drop.length) {
      pruned += (await prisma.verificationSession.deleteMany({ where: { sessionId: { in: drop } } })).count;
    }
  }
  return { pruned, gaveUp };
}
