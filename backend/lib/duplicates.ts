// "You have approved this before."
//
// A seller's repeat customer orders the same solvent every quarter and fills in
// the same declaration every time. Reviewing it from scratch each time is the
// work this removes: when the same person (or the same company) asks for the
// same substances and says roughly the same thing about why, the reviewer gets
// told so, with a link to the decision they already made.
//
// It never decides anything. The previous approval is shown as context next to
// the approve button — the gate in lib/approvalGate.ts is unchanged, so a
// repeat buyer whose identity check just failed is still blocked.
import { prisma } from './prisma.ts';
import { statementSimilarity } from './matchKeys.ts';

/** Below this, two statements have nothing in common worth mentioning. */
const MIN_SIMILARITY = 0.35;
/** How many prior approvals to show in full. More than a few is noise. */
const MAX_MATCHES = 3;
/**
 * How far back to look.
 *
 * Belt to retention's braces rather than the control itself: submissions are
 * deleted eighteen months after they were made, so a row older than this does
 * not exist to be found. Kept as an explicit bound so the intent survives
 * somebody changing the retention period without reading this file.
 */
const WINDOW_MONTHS = 18;

/**
 * What the reviewer is told, in full.
 *
 * The count and the oldest date exist because recognition rolls: every new
 * approval becomes the anchor for the next one, so a buyer ordering twice a
 * year is "approved before" indefinitely, and a shortcut that never expires
 * stops being a decision. Showing how long the chain has run lets a person
 * notice that and call for a fresh look — which keeps the judgement where it
 * belongs instead of letting the platform quietly decide that a regular
 * customer no longer needs reviewing.
 */
export type PriorApprovals = {
  matches: DuplicateMatch[];
  /** Every match, not only the ones shown. */
  total: number;
  /**
   * The oldest approval still held — which is *not* necessarily the first one
   * ever. Nothing outlives the eighteen-month retention, so a buyer who has
   * been coming back for three years looks eighteen months old here. The
   * dashboard says so, because read as "first contact" this number would
   * mislead in exactly the way that matters.
   */
  oldestAt: string | null;
};

export type DuplicateMatch = {
  id: string;
  buyerName: string;
  approvedAt: string | null;
  approvedByName: string | null;
  /** 0–100, how closely the stated use reads like this one. */
  statementMatch: number;
  /** Which fingerprints agreed — 'DOCUMENT' is the same person, 'VAT' the same company. */
  matchedOn: ('DOCUMENT' | 'VAT' | 'SUBSTANCE')[];
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  statement: string;
  reviewedAt: Date | null;
  reviewedByName: string | null;
  idDocumentNumberHash: string | null;
  vatNumberHash: string | null;
  substanceKeyHash: string | null;
};

/**
 * Prior approvals in this tenant that look like the same request.
 *
 * Both halves must agree: who is asking (document or VAT fingerprint) and what
 * they are asking for (substance fingerprint). Matching on the substance alone
 * would flag every acetone order a seller has ever approved, which is the kind
 * of signal reviewers learn to ignore.
 */
export async function findPriorApprovals(submission: {
  id: string;
  companyId?: string | null;
  statement: string;
  idDocumentNumberHash?: string | null;
  vatNumberHash?: string | null;
  substanceKeyHash?: string | null;
}): Promise<PriorApprovals> {
  const none: PriorApprovals = { matches: [], total: 0, oldestAt: null };
  const { companyId, substanceKeyHash } = submission;
  if (!companyId || !substanceKeyHash) return none;

  const who: { idDocumentNumberHash?: string; vatNumberHash?: string }[] = [];
  if (submission.idDocumentNumberHash) who.push({ idDocumentNumberHash: submission.idDocumentNumberHash });
  if (submission.vatNumberHash) who.push({ vatNumberHash: submission.vatNumberHash });
  if (who.length === 0) return none;

  const since = new Date();
  since.setMonth(since.getMonth() - WINDOW_MONTHS);

  const where = {
    companyId,
    id: { not: submission.id },
    status: 'APPROVED' as const,
    isTest: false,
    substanceKeyHash,
    createdAt: { gte: since },
    OR: who,
  };

  // Counted and dated separately from the rows that get loaded, so the summary
  // is honest even when there are more matches than are worth decrypting.
  const [total, oldest] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findFirst({
      where, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
    }),
  ]);
  if (total === 0) return none;

  const candidates = (await prisma.submission.findMany({
    where,
    orderBy: { reviewedAt: 'desc' },
    // The fingerprints have already narrowed this to one buyer's history; the
    // cap is there so a pathological row count cannot be loaded and decrypted.
    take: 20,
    select: {
      id: true, firstName: true, lastName: true, statement: true,
      reviewedAt: true, reviewedByName: true,
      idDocumentNumberHash: true, vatNumberHash: true, substanceKeyHash: true,
    },
  })) as unknown as Candidate[];

  const matches = candidates
    .map(c => {
      const matchedOn: DuplicateMatch['matchedOn'] = ['SUBSTANCE'];
      if (submission.idDocumentNumberHash && c.idDocumentNumberHash === submission.idDocumentNumberHash) {
        matchedOn.unshift('DOCUMENT');
      }
      if (submission.vatNumberHash && c.vatNumberHash === submission.vatNumberHash) {
        matchedOn.push('VAT');
      }
      return {
        id: c.id,
        buyerName: `${c.firstName} ${c.lastName}`.trim(),
        approvedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
        approvedByName: c.reviewedByName,
        statementMatch: Math.round(statementSimilarity(submission.statement, c.statement) * 100),
        matchedOn,
      };
    })
    // The same person and the same substances is already a strong signal, so a
    // low text score does not disqualify a document match — it just ranks lower.
    .filter(m => m.matchedOn.includes('DOCUMENT') || m.statementMatch >= MIN_SIMILARITY * 100)
    .sort((a, b) => b.statementMatch - a.statementMatch)
    .slice(0, MAX_MATCHES);

  return {
    matches,
    total,
    oldestAt: oldest ? oldest.createdAt.toISOString() : null,
  };
}
