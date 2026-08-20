// Data lifecycle: how long a submission is kept, and what closing a company
// account actually does.
import { prisma } from './prisma.ts';

/** Every submission is deleted this long after it was made. */
export const RETENTION_MONTHS = 18;

/** A closed account is recoverable for this long before it is purged. */
export const DELETION_GRACE_DAYS = 30;

/**
 * Purges companies whose 30-day grace period has run out: submissions cascade,
 * memberships and invites cascade, and the accounts of members who belong to no
 * other company go with them. Returns how many companies were purged.
 */
export async function purgeDeletedCompanies(): Promise<number> {
  const cutoff = new Date(Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const due = await prisma.company.findMany({
    where: { deletedAt: null, deletionRequestedAt: { not: null, lt: cutoff } },
    select: { id: true, members: { select: { userId: true } } },
  });

  for (const company of due) {
    const userIds = company.members.map(m => m.userId);
    await prisma.submission.deleteMany({ where: { companyId: company.id } });
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
