import { prisma } from './prisma.ts';
import { Prisma } from '../generated/prisma/client.ts';
import { evaluateGate, failingCategories, type OverrideCategory, type GateSubmission } from './approvalGate.ts';

const LABEL: Record<OverrideCategory, string> = {
  VIES: 'VAT / VIES',
  IDENTITY: 'Identity',
  SUBSTANCE: 'Substance',
};

function withOverrides(id: string) {
  return prisma.submission.findUnique({ where: { id }, include: { overrides: true } });
}

// Throws a human-readable error when a submission may not be approved yet.
function gateOrThrow(sub: unknown): void {
  const gate = evaluateGate(sub as GateSubmission);
  if (gate.pending === 'SUBSTANCE') throw new Error('Substance check is still running — wait for it to finish before approving.');
  if (gate.pending === 'IDENTITY') throw new Error('The identity check is still being reviewed by Didit — wait for its answer before approving.');
  if (gate.blocking.length > 0) {
    const names = gate.blocking.map(c => LABEL[c]).join(', ');
    throw new Error(`Cannot approve: the ${names} check has not passed or been overridden.`);
  }
}

type Tx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export type Actor = { id: string; name: string };

/** One line in the statement's decision history (DecisionLog). */
async function logDecision(
  tx: Tx, sub: { id: string; companyId: string | null }, action: string, by: Actor, category?: string,
) {
  await tx.decisionLog.create({
    data: {
      submissionId: sub.id, companyId: sub.companyId, action, category: category ?? null,
      byId: by.id.slice(0, 100), byName: by.name.slice(0, 200),
    },
  });
}

/**
 * Holds the submission's row for the rest of the transaction, so a decision,
 * an override and a check finishing at the same moment happen one after the
 * other rather than each acting on a state the others have already changed.
 * Scoped to the tenant when one is given.
 */
async function lockPending(tx: Tx, id: string, companyId: string | null) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Submission" WHERE id = ${id}
    ${companyId ? Prisma.sql`AND "companyId" = ${companyId}` : Prisma.empty}
    FOR UPDATE`;
  if (rows.length === 0) throw new Error('Not found');
  const sub = await tx.submission.findUnique({ where: { id }, include: { overrides: true } });
  if (!sub) throw new Error('Not found');
  // A decision stands until the submission is reopened. Approving or denying
  // one already decided rewrote the record of who decided what, and could send
  // the buyer a second, contradicting email.
  if (sub.status !== 'PENDING_REVIEW') {
    throw new Error('This submission has already been decided. Reopen it to change the decision.');
  }
  return sub;
}

/**
 * Records a decision on a pending submission. Approval re-reads the checks
 * under the lock, so a re-run that changed them a moment earlier is seen.
 */
export async function decideSubmission(
  id: string, companyId: string | null, decision: 'APPROVED' | 'DENIED', data: Record<string, unknown>,
) {
  return prisma.$transaction(async tx => {
    const sub = await lockPending(tx, id, companyId);
    if (decision === 'APPROVED') gateOrThrow(sub);
    await logDecision(tx, sub, decision, { id: String(data.reviewedById ?? ''), name: String(data.reviewedByName ?? '') });
    return tx.submission.update({ where: { id }, data: { ...data, status: decision }, include: { overrides: true } });
  });
}

// Records a manual override of a failing check. Rejects empty reasons and
// no-op overrides (category that is not currently failing).
export async function applyOverride(
  id: string,
  category: OverrideCategory,
  reason: string,
  createdById: string,
  createdByName: string,
) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error('A reason is required to override a check.');

  // Only while the submission is pending: the overrides are the evidence for
  // a decision, and rewriting them after it was made rewrote that evidence.
  await prisma.$transaction(async tx => {
    const sub = await lockPending(tx, id, null);
    if (!failingCategories(sub as unknown as GateSubmission).includes(category)) {
      throw new Error(`The ${LABEL[category]} check is not failing — nothing to override.`);
    }
    // Replace any existing override for this category so the latest reason/author wins.
    await tx.submissionOverride.deleteMany({ where: { submissionId: id, category } });
    await tx.submissionOverride.create({
      data: { submissionId: id, category, reason: trimmed, createdById, createdByName },
    });
    await logDecision(tx, sub, 'OVERRIDE', { id: createdById, name: createdByName }, category);
  });
  return withOverrides(id);
}

export async function clearOverride(id: string, category: OverrideCategory, by: Actor) {
  await prisma.$transaction(async tx => {
    const sub = await lockPending(tx, id, null);
    const { count } = await tx.submissionOverride.deleteMany({ where: { submissionId: id, category } });
    if (count) await logDecision(tx, sub, 'OVERRIDE_CLEARED', by, category);
  });
  return withOverrides(id);
}

/**
 * Puts a decided statement back in the queue. Its overrides go (a later edit
 * must not ride an old bypass), but the decision and the overrides stay in
 * the decision history, with who reopened it.
 */
export async function reopenSubmission(id: string, companyId: string, by: Actor) {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Submission" WHERE id = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
    if (rows.length === 0) throw new Error('Not found');
    await tx.submissionOverride.deleteMany({ where: { submissionId: id } });
    await logDecision(tx, { id, companyId }, 'REOPENED', by);
    return tx.submission.update({
      where: { id },
      data: { status: 'PENDING_REVIEW', adminNote: null, reviewedById: null, reviewedByName: null, reviewedAt: null },
      include: { overrides: true },
    });
  });
}

/** Minimum gap between manual substance re-runs for one submission. */
const RECHECK_COOLDOWN_MS = 30_000;

/**
 * Claims a manual substance re-run: one statement-level update that only
 * succeeds when no run is in flight, the last one is not seconds old, and the
 * statement is still pending. Reading those first and writing afterwards let
 * two clicks at once both start a run against PubChem; and a re-run on a
 * decided statement changed the evidence behind a decision already made.
 */
export async function claimSubstanceRecheck(id: string, companyId: string | null): Promise<void> {
  const { count } = await prisma.submission.updateMany({
    where: {
      id, ...(companyId ? { companyId } : {}),
      status: 'PENDING_REVIEW',
      substanceCheckStatus: { not: 'PENDING' },
      OR: [{ substanceCheckedAt: null }, { substanceCheckedAt: { lt: new Date(Date.now() - RECHECK_COOLDOWN_MS) } }],
    },
    data: { substanceCheckStatus: 'PENDING' },
  });
  if (count === 1) return;
  const sub = await prisma.submission.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
    select: { status: true, substanceCheckStatus: true },
  });
  if (!sub) throw new Error('Not found');
  if (sub.status !== 'PENDING_REVIEW') throw new Error('This submission has already been decided. Reopen it to run the check again.');
  if (sub.substanceCheckStatus === 'PENDING') throw new Error('The substance check is already running.');
  throw new Error('This check just ran — wait a moment before running it again.');
}
