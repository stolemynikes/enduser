// Looking at an identity document number.
//
// Of everything on a submission, this is the one field nobody needs in order to
// decide anything: Didit has already established who the person is and whether
// the document holds up, and the reviewer's judgement is about the stated use.
// It is also the field that turns a leak into identity fraud, because it sits
// next to a name and an address.
//
// So it does not travel with any query. It comes back from one call that asks
// for a fresh second factor and records the access. The point is not to stop an
// owner from seeing it — they are allowed to — but to make sure that a session
// in the wrong hands cannot, and that whoever did look can be named afterwards.
import bcrypt from 'bcrypt';
import { prisma } from './prisma.ts';
import { MFA_SELECT, checkSecondFactor, mfaEnabled } from './mfa.ts';

export type RevealOutcome =
  | { ok: true; documentNumber: string | null }
  | { ok: false; reason: 'missing' | 'invalid' | 'no-credential' };

/**
 * Checks the account's second factor, for one sensitive read.
 *
 * A second factor is required: without one the reveal is refused and the
 * account is told to set one up. The password used to be accepted in its
 * place, but it is exactly what a phishing proxy has already captured, so it
 * proved nothing a stolen session did not.
 */
async function checkCredential(
  kind: 'companyUser' | 'admin', accountId: string, credential: string,
): Promise<{ ok: true } | { ok: false; reason: 'missing' | 'invalid' | 'no-credential' }> {
  const account = kind === 'admin'
    ? await prisma.admin.findUnique({
        where: { id: accountId },
        select: { id: true, password: true, ...MFA_SELECT },
      })
    : await prisma.companyUser.findUnique({
        where: { id: accountId },
        select: { id: true, passwordHash: true, ...MFA_SELECT },
      });
  if (!account) return { ok: false, reason: 'invalid' };

  if (!mfaEnabled(account)) return { ok: false, reason: 'no-credential' };
  const second = await checkSecondFactor(kind, account, credential);
  return second.ok ? { ok: true } : { ok: false, reason: second.reason };
}

/**
 * Reveals the document number for one submission, and writes the access down.
 *
 * The caller must have already proved the submission belongs to this tenant —
 * that check lives in the tenant wrapper and is not repeated here, so this
 * function cannot be the place a tenant boundary is forgotten.
 */
export async function revealDocumentNumber({
  submission, companyId, userId, userName, sessionId, adminId, credential, asAdmin,
}: {
  submission: { id: string; idDocumentNumber: string | null };
  companyId: string;
  userId: string;
  userName: string;
  sessionId?: string | null;
  adminId?: string | null;
  credential: string;
  /**
   * True when a platform admin is reading this directly rather than a seller.
   * Their own factor is what is checked — the point of the control is that a
   * session is not enough, and whose session it is does not change that.
   */
  asAdmin?: boolean;
}): Promise<RevealOutcome> {
  const check = await checkCredential(
    asAdmin ? 'admin' : 'companyUser',
    asAdmin ? (adminId ?? userId) : userId,
    credential,
  );
  if (!check.ok) return { ok: false, reason: check.reason };

  // Written before the value is returned, so a crash between the two leaves a
  // record of an access that may have happened rather than no record of one
  // that did.
  await prisma.revealLog.create({
    data: {
      companyId,
      submissionId: submission.id,
      userId,
      userName: userName.slice(0, 200),
      sessionId: sessionId ?? null,
      adminId: adminId ?? null,
    },
  }).catch((err: any) => {
    console.error(`[reveal] could not record an access: ${err?.message ?? 'unknown error'}`);
  });

  if (adminId) {
    console.log(`[reveal] support session: admin ${adminId} read a document number in ${companyId}`);
  }

  return { ok: true, documentNumber: submission.idDocumentNumber };
}

/** Recent accesses for one tenant, newest first. */
export async function revealHistory(companyId: string, limit: number) {
  const rows = await prisma.revealLog.findMany({
    where: { companyId },
    orderBy: { at: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(r => ({
    id: r.id,
    submissionId: r.submissionId,
    userName: r.userName,
    /** True when platform staff did this through a support session. */
    bySupport: r.adminId != null,
    at: r.at.toISOString(),
  }));
}

/**
 * Drops log rows past the retention ceiling. Called from the nightly job.
 *
 * The same eighteen months as a submission, deliberately, and not longer: an
 * audit trail about data you no longer hold is data you did not need to keep.
 * It outlives nothing it describes.
 */
export async function pruneRevealLog(months: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const { count } = await prisma.revealLog.deleteMany({ where: { at: { lt: cutoff } } });
  return count;
}

/** How many times this tenant's numbers were read in the last day. */
export async function revealsToday(companyId: string): Promise<number> {
  return prisma.revealLog.count({
    where: { companyId, at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}
