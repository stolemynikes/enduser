// Who may run a public form on this platform.
//
// Registration is a request: a company can sign up, confirm its address and
// set up its form, but the form only opens once a platform admin approves it.
// The form collects identity documents on this domain; open registration let
// anyone stand one up under any name and point buyers at it.
//
// OPEN_REGISTRATION=1 approves new companies on sign-up instead. Meant for
// later, once the review step is no longer wanted — not for production now.
import { prisma } from './prisma.ts';

export const REGISTRATION_OPEN = process.env.OPEN_REGISTRATION === '1';

export type AccessStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export function accessStatus(c: { approvedAt?: Date | null; rejectedAt?: Date | null }): AccessStatus {
  if (c.approvedAt) return 'APPROVED';
  if (c.rejectedAt) return 'REJECTED';
  return 'PENDING';
}

/**
 * Whether a company's public form may take submissions: approved, not closed,
 * and its owner has confirmed the address they signed up with. The one place
 * this is decided — the form page and the submit mutation both ask here.
 */
export async function formOpen(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      approvedAt: true, deletedAt: true,
      members: {
        where: { role: 'OWNER' }, orderBy: { createdAt: 'asc' }, take: 1,
        select: { user: { select: { emailVerifiedAt: true } } },
      },
    },
  });
  return !!company && !company.deletedAt && !!company.approvedAt
    && company.members[0]?.user.emailVerifiedAt != null;
}
