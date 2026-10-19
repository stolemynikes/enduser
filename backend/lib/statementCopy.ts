// Builds the buyer's PDF copy of a submission, with the seller's terms as they
// stood on the form. Never throws: an email must still go out if the PDF fails.
import { prisma } from './prisma.ts';
import { resolveConfig } from './formConfig.ts';
import { buildStatementPdf, type StatementForPdf } from '../services/statementPdf.ts';
import type { StatementCopy } from '../services/email.ts';
import { statementCheckCode, statementCheckUrl } from './statementCheck.ts';

export async function statementCopy(
  submission: StatementForPdf & { companyId?: string | null; termsText?: string | null; termsUrl?: string | null },
): Promise<StatementCopy | undefined> {
  try {
    const company = submission.companyId
      ? await prisma.company.findUnique({
          where: { id: submission.companyId },
          select: { name: true, formConfig: true },
        })
      : null;
    const config = resolveConfig(company?.formConfig);
    // The terms stored with the statement are the ones the buyer agreed to.
    // Only a statement from before they were stored falls back to the form's
    // current settings.
    const stored = submission.termsText != null || submission.termsUrl != null;
    const content = await buildStatementPdf(submission, {
      sellerName: company?.name,
      termsText: stored ? submission.termsText ?? undefined
        : config.customTermsMode === 'TEXT' ? config.customTermsText : undefined,
      termsUrl: stored ? submission.termsUrl ?? undefined
        : config.customTermsMode === 'LINK' ? config.customTermsUrl : undefined,
      checkUrl: statementCheckUrl(process.env.FRONTEND_URL ?? 'http://localhost:5173', submission.id),
      checkCode: statementCheckCode(submission.id),
    });
    return { filename: `end-user-statement-${submission.id.slice(0, 8)}.pdf`, content };
  } catch (err: any) {
    console.error(`[pdf] could not build the buyer's copy for ${submission.id}: ${err?.message ?? 'unknown error'}`);
    return undefined;
  }
}
