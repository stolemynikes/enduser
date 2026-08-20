// Who hears about a submission, and under whose name.
import { prisma } from './prisma.ts';
import { sendNewSubmissionToCompany } from '../services/email.ts';

/** Owners and Employee+ — the roles that can actually act on a statement. */
const REVIEWER_ROLES = ['OWNER', 'EMPLOYEE_PLUS'] as const;

export async function sellerName(companyId?: string | null): Promise<string | undefined> {
  if (!companyId) return undefined;
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  return company?.name;
}

/**
 * Tells a seller that a statement landed. Never throws: a mail failure must not
 * fail the buyer's submission.
 */
export async function notifyCompanyOfSubmission(
  companyId: string | null | undefined,
  { buyerName, buyerCompany }: { buyerName: string; buyerCompany: string },
): Promise<void> {
  if (!companyId) return;
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        members: {
          where: { role: { in: [...REVIEWER_ROLES] } },
          select: { user: { select: { email: true } } },
        },
      },
    });
    if (!company) return;
    const recipients = company.members.map(m => m.user.email).filter(Boolean);
    await sendNewSubmissionToCompany(recipients, {
      sellerName: company.name,
      buyerName,
      buyerCompany,
    });
  } catch (err: any) {
    console.error(`[notify] could not tell company ${companyId} about a submission: ${err?.message ?? 'unknown error'}`);
  }
}
