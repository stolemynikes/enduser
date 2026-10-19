// Keeping stored identity checks in step with Didit.
//
// A submission that arrives while its check is still IN_REVIEW keeps its
// session open at Didit, photos included, until the final decision lands —
// normally by webhook. A webhook can be lost (an outage on either side, a
// misconfigured secret), and then the decision was never recorded and the
// photos were never deleted. The nightly pass below re-fetches every check
// still open and records it exactly as the webhook would, and retries the
// purge of any final check whose deletion at Didit failed earlier.
import { prisma } from './prisma.ts';
import { DIDIT_ENABLED, deleteSession, retrieveDecision, type DiditDecision } from '../services/didit.ts';
import { recordEvent } from './ops.ts';
import type { Prisma } from '../generated/prisma/client.ts';

const FINAL = new Set(['APPROVED', 'DECLINED', 'EXPIRED']);
const HOUR_MS = 60 * 60 * 1000;
/** Younger than this, a check is left to its webhook. */
const MIN_AGE_MS = HOUR_MS;
/** Still undecided after this, a check is reported as stuck. */
const STUCK_MS = 7 * 24 * HOUR_MS;
/** Didit calls per night; the rest wait for the next run. */
const BATCH = 200;

/**
 * Writes a fetched decision onto the submission that owns the session, and
 * deletes the session at Didit when the outcome is final. Used by the webhook
 * and by the nightly reconcile, so a decision is recorded the same way by both.
 */
export async function recordDecision(submissionId: string, sessionId: string, decision: DiditDecision): Promise<void> {
  const purged = FINAL.has(decision.status) ? await deleteSession(sessionId) : false;
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      idVerificationStatus: decision.status,
      idLivenessPassed: decision.livenessPassed,
      idFaceMatch: decision.faceMatch,
      idVerificationWarnings: decision.warnings,
      idVerificationCheckedAt: new Date(),
      idVerificationPurged: purged,
      ...(decision.documentType ? { idDocumentType: decision.documentType } : {}),
      ...(decision.expiryDate ? { idDocumentExpiry: new Date(decision.expiryDate) } : {}),
    },
  });
}

export type ReconcileResult = {
  /** Open checks that had reached a final decision and were recorded. */
  resolved: number;
  /** Final checks whose earlier failed deletion at Didit now succeeded. */
  repurged: number;
  /** Checks still undecided, or still undeletable, after STUCK_MS. */
  stuck: number;
};

/** `only` limits the pass to these submissions; for tests, which share the database. */
export async function reconcileOpenVerifications(
  { now = Date.now(), only }: { now?: number; only?: string[] } = {},
): Promise<ReconcileResult> {
  const result: ReconcileResult = { resolved: 0, repurged: 0, stuck: 0 };
  const rows = await prisma.submission.findMany({
    where: {
      idVerificationSessionId: { not: null },
      idVerificationPurged: false,
      createdAt: { lt: new Date(now - MIN_AGE_MS) },
      // Rows from the old in-house OCR have no session and are excluded above;
      // NOT_CHECKED means identity was not collected at all.
      idVerificationStatus: { not: 'NOT_CHECKED' },
      ...(only ? { id: { in: only } } : {}),
    },
    select: { id: true, idVerificationSessionId: true, idVerificationStatus: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  });

  for (const row of rows) {
    const sessionId = row.idVerificationSessionId as string;
    const old = now - row.createdAt.getTime() > STUCK_MS;

    if (FINAL.has(row.idVerificationStatus)) {
      // Decided, but the deletion at Didit failed when it was recorded.
      if (await deleteSession(sessionId)) {
        await prisma.submission.update({ where: { id: row.id }, data: { idVerificationPurged: true } });
        result.repurged++;
      } else if (old) {
        console.error(`[didit] session ${sessionId} (submission ${row.id}) is decided but still not deleted at Didit`);
        result.stuck++;
      }
      continue;
    }

    try {
      const decision = await retrieveDecision(sessionId);
      if (FINAL.has(decision.status)) {
        await recordDecision(row.id, sessionId, decision);
        result.resolved++;
        continue;
      }
    } catch (err: any) {
      console.error(`[didit] reconcile could not fetch session ${sessionId}: ${err?.message ?? 'unknown error'}`);
    }
    if (old) {
      console.error(`[didit] identity check for submission ${row.id} is still undecided after 7 days`);
      result.stuck++;
    }
  }
  return result;
}

/**
 * Deletes at Didit the unpurged sessions of the submissions matching `where`,
 * which are about to be deleted. A submission is the only link to its session,
 * so once it is gone the photos could never be found again. Called before
 * every deletion of submissions: retention, a closed company's purge, a
 * seller deleting one, the admin clearing test data. Returns how many could
 * not be deleted, for the caller to report; the caller still deletes.
 */
export async function purgeSessionsOf(where: Prisma.SubmissionWhereInput): Promise<number> {
  if (!DIDIT_ENABLED) return 0;
  const open = await prisma.submission.findMany({
    where: { AND: [where, { idVerificationSessionId: { not: null }, idVerificationPurged: false }] },
    select: { id: true, idVerificationSessionId: true },
  });
  let failed = 0;
  for (const o of open) {
    if (await deleteSession(o.idVerificationSessionId as string)) {
      await prisma.submission.update({ where: { id: o.id }, data: { idVerificationPurged: true } });
    } else {
      failed++;
      recordEvent('didit-purge-failed');
    }
  }
  return failed;
}

/** `only` scopes it for tests. */
export function purgeBeforeRetention(cutoff: Date, { only }: { only?: string[] } = {}): Promise<number> {
  return purgeSessionsOf({ createdAt: { lt: cutoff }, ...(only ? { id: { in: only } } : {}) });
}
