// Data lifecycle: how long a submission is kept, and what closing a company
// account actually does.
import { prisma } from './prisma.ts';
import { deleteSubmissions } from './submissionDelete.ts';

/** Every submission is deleted this long after it was made. */
export const RETENTION_MONTHS = 18;

/** A closed account is recoverable for this long before it is purged. */
export const DELETION_GRACE_DAYS = 30;

/**
 * Purges companies whose 30-day grace period has run out: submissions cascade,
 * memberships and invites cascade, and the accounts of members who belong to no
 * other company go with them. Returns how many companies were purged.
 *
 * The reveal log and the support-access log hold the company's id as a plain
 * column, with no relation for a cascade to follow, so they are deleted here by
 * hand. They describe a tenant that no longer exists and that nobody can sign
 * in to read them for.
 */
export async function purgeDeletedCompanies(
  /** Told how many Didit sessions of a purged company could not be deleted. */
  onSessionFailures?: (count: number) => void,
): Promise<number> {
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const due = await prisma.company.findMany({
    where: { deletedAt: null, deletionRequestedAt: { not: null, lt: cutoff } },
    select: { id: true, members: { select: { userId: true } } },
  });

  for (const company of due) {
    const userIds = company.members.map(m => m.userId);
    const { sessionFailures } = await deleteSubmissions({ companyId: company.id });
    if (sessionFailures) onSessionFailures?.(sessionFailures);
    await prisma.revealLog.deleteMany({ where: { companyId: company.id } });
    await prisma.buyerDataAction.deleteMany({ where: { companyId: company.id } });
    await prisma.supportAccess.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
    // A member who was only ever part of this company has no account left to
    // sign in to, so the account goes too. Anyone with another membership stays.
    for (const userId of userIds) {
      const remaining = await prisma.companyMember.count({ where: { userId } });
      if (remaining === 0) await prisma.companyUser.delete({ where: { id: userId } }).catch(() => {});
    }
  }
  return due.length;
}

/**
 * Drops support-access rows past the retention ceiling, like the reveal log:
 * long enough for a tenant to ask who opened their account and when, and no
 * longer than the submissions that access could have shown.
 */
export async function pruneSupportAccess(months: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const { count } = await prisma.supportAccess.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
