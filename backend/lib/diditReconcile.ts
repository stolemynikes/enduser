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
import { documentKey } from './matchKeys.ts';
import type { Prisma } from '../generated/prisma/client.ts';

const FINAL = new Set(['APPROVED', 'DECLINED', 'EXPIRED']);

/** Buyers younger than this are refused. Shared with the submit mutation. */
export const MINIMUM_AGE = 18;

/**
 * The platform's own rules on top of Didit's answer: a passport or identity
 * card, and a buyer of age. The submit mutation enforces them when the answer
 * is already final; an answer that arrives later (IN_REVIEW turning APPROVED,
 * by webhook or the nightly reconcile) used to be stored as APPROVED without
 * them, and APPROVED is what the approval gate trusts.
 */
export function policyFailure(d: DiditDecision): string | null {
  if (d.status !== 'APPROVED') return null;
  if (d.documentType == null) return 'Document type not accepted (passport or identity card only)';
  if (d.age != null && d.age < MINIMUM_AGE) return `Buyer is under ${MINIMUM_AGE}`;
  return null;
}
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
  const failure = policyFailure(decision);
  // An answer that arrives after the submission (IN_REVIEW turning APPROVED)
  // carries the document too. Recorded here as the submit path records it, so
  // a late approval is not left without the verified name and number, or with
  // the name check never made.
  let identity: Record<string, unknown> = {};
  if (!failure && decision.status === 'APPROVED') {
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { companyId: true, firstName: true, lastName: true, submittedFirstName: true, submittedLastName: true },
    });
    if (sub) {
      const typed = {
        firstName: sub.submittedFirstName ?? sub.firstName,
        lastName: sub.submittedLastName ?? sub.lastName,
      };
      const name = verifiedName(decision, typed);
      const number = decision.documentNumber?.slice(0, 50) ?? null;
      identity = {
        ...(name ?? {}),
        ...(name?.idNameMatches === false
          ? { idVerificationWarnings: [nameMismatchWarning(name), decision.warnings].filter(Boolean).join('; ').slice(0, 1000) }
          : {}),
        ...(name && !('firstName' in name) ? { firstName: typed.firstName, lastName: typed.lastName } : {}),
        idDocumentName: decision.fullName?.slice(0, 200) ?? null,
        idDocumentNumber: number,
        ...(sub.companyId ? { idDocumentNumberHash: documentKey(sub.companyId, number) } : {}),
      };
    }
  }
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      // Stored as declined, with the reason in the warnings, so the gate
      // blocks it and the reviewer sees why.
      idVerificationStatus: failure ? 'DECLINED' : decision.status,
      idLivenessPassed: decision.livenessPassed,
      idFaceMatch: decision.faceMatch,
      idVerificationWarnings: failure
        ? [failure, decision.warnings].filter(Boolean).join('; ').slice(0, 1000)
        : decision.warnings,
      idVerificationCheckedAt: new Date(),
      idVerificationPurged: purged,
      ...(decision.documentType ? { idDocumentType: decision.documentType } : {}),
      ...(decision.expiryDate ? { idDocumentExpiry: new Date(decision.expiryDate) } : {}),
      ...identity,
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

/**
 * `only` limits the pass to these submissions and `batch` the Didit calls;
 * both for tests, which share the database.
 *
 * Least-recently-tried first, and every try is stamped: a check that never
 * resolves moves to the back instead of holding the front of the queue, so
 * newer lost webhooks are still reached. A stuck check is reported once.
 */
export async function reconcileOpenVerifications(
  { now = Date.now(), only, batch = BATCH }: { now?: number; only?: string[]; batch?: number } = {},
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
    select: { id: true, idVerificationSessionId: true, idVerificationStatus: true, createdAt: true, idStuckReportedAt: true },
    orderBy: [{ idReconciledAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    take: batch,
  });

  for (const row of rows) {
    const sessionId = row.idVerificationSessionId as string;
    const old = now - row.createdAt.getTime() > STUCK_MS;
    let done = false;

    if (FINAL.has(row.idVerificationStatus)) {
      // Decided, but the deletion at Didit failed when it was recorded.
      if (await deleteSession(sessionId)) {
        await prisma.submission.update({ where: { id: row.id }, data: { idVerificationPurged: true } });
        result.repurged++;
        done = true;
      }
    } else {
      try {
        const decision = await retrieveDecision(sessionId);
        if (FINAL.has(decision.status)) {
          await recordDecision(row.id, sessionId, decision);
          result.resolved++;
          done = true;
        }
      } catch (err: any) {
        console.error(`[didit] reconcile could not fetch session ${sessionId}: ${err?.message ?? 'unknown error'}`);
      }
    }
    if (done) continue;

    const report = old && !row.idStuckReportedAt;
    if (report) {
      console.error(FINAL.has(row.idVerificationStatus)
        ? `[didit] session ${sessionId} (submission ${row.id}) is decided but still not deleted at Didit`
        : `[didit] identity check for submission ${row.id} is still undecided after 7 days`);
      result.stuck++;
    }
    await prisma.submission.update({
      where: { id: row.id },
      data: { idReconciledAt: new Date(now), ...(report ? { idStuckReportedAt: new Date(now) } : {}) },
    });
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

/** Letters only, lower case, accents removed, split into words. */
function nameWords(s: string): string[] {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
}

/** "JAN PIETER" → "Jan Pieter"; a name already in mixed case is left alone. */
function documentCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

/**
 * The buyer's name once a document has been verified. The document is the
 * authority: when the typed name matches it, the typed spelling is kept (it is
 * the same name, as the buyer writes it); when it does not, the name from the
 * document takes its place and the typed one is kept apart, so emails, the
 * dashboard and the PDF never carry a name nobody verified. The mismatch
 * itself still blocks approval until a reviewer overrides it.
 */
export function verifiedName(
  decision: Pick<DiditDecision, 'status' | 'fullName' | 'firstName' | 'lastName'>,
  typed: { firstName: string; lastName: string },
) {
  if (decision.status !== 'APPROVED' || !decision.fullName) return null;
  const matches = nameMatchesDocument(typed.firstName, typed.lastName, decision.fullName);
  if (matches || !decision.firstName || !decision.lastName) {
    return { idNameMatches: matches, submittedFirstName: null, submittedLastName: null };
  }
  return {
    idNameMatches: false,
    firstName: documentCase(decision.firstName).slice(0, 200),
    lastName: documentCase(decision.lastName).slice(0, 200),
    submittedFirstName: typed.firstName,
    submittedLastName: typed.lastName,
  };
}

/** The reviewer's note on a mismatch, naming what was typed. */
export function nameMismatchWarning(v: ReturnType<typeof verifiedName>): string {
  const typed = v?.submittedFirstName ? ` ("${`${v.submittedFirstName} ${v.submittedLastName ?? ''}`.trim()}")` : '';
  return `The name on the form${typed} does not match the document`;
}

/**
 * Whether the name typed on the form is the name on the verified document:
 * every word of the surname, and the first word of the given name, must
 * appear on the document (which may carry more given names). Null when there
 * is no document name to compare with.
 */
export function nameMatchesDocument(first: unknown, last: unknown, documentName: string | null | undefined): boolean | null {
  if (!documentName) return null;
  const doc = new Set(nameWords(documentName));
  const given = nameWords(String(first ?? ''));
  const surname = nameWords(String(last ?? ''));
  if (given.length === 0 || surname.length === 0) return false;
  return doc.has(given[0]) && surname.every(w => doc.has(w));
}
