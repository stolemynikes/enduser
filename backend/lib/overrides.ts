import { prisma } from './prisma.ts';
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
export async function assertApprovable(id: string): Promise<void> {
  const sub = await withOverrides(id);
  if (!sub) throw new Error('Submission not found.');
  const gate = evaluateGate(sub as unknown as GateSubmission);
  if (gate.pending === 'SUBSTANCE') throw new Error('Substance check is still running — wait for it to finish before approving.');
  if (gate.pending === 'IDENTITY') throw new Error('The identity check is still being reviewed by Didit — wait for its answer before approving.');
  if (gate.blocking.length > 0) {
    const names = gate.blocking.map(c => LABEL[c]).join(', ');
    throw new Error(`Cannot approve: the ${names} check has not passed or been overridden.`);
  }
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

  const sub = await withOverrides(id);
  if (!sub) throw new Error('Submission not found.');
  if (!failingCategories(sub as unknown as GateSubmission).includes(category)) {
    throw new Error(`The ${LABEL[category]} check is not failing — nothing to override.`);
  }

  // Replace any existing override for this category so the latest reason/author wins.
  await prisma.submissionOverride.deleteMany({ where: { submissionId: id, category } });
  await prisma.submissionOverride.create({
    data: { submissionId: id, category, reason: trimmed, createdById, createdByName },
  });
  return withOverrides(id);
}

export async function clearOverride(id: string, category: OverrideCategory) {
  await prisma.submissionOverride.deleteMany({ where: { submissionId: id, category } });
  return withOverrides(id);
}
