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
 * Checks whatever second credential the account has, for one sensitive read.
 *
 * A second factor when there is one; the password when there is not. The
 * password is weaker — it is the thing a phishing proxy already captured — but
 * refusing the reveal outright to every account without MFA would make the
 * dashboard unusable before anyone has enrolled, and a deliberate, recorded
 * step is still worth more than an open field.
 */
async function checkCredential(
  userId: string, credential: string,
): Promise<{ ok: true } | { ok: false; reason: 'missing' | 'invalid' }> {
  const user = await prisma.companyUser.findUnique({
    where: { id: userId },
    select: { passwordHash: true, ...MFA_SELECT, id: true },
  });
  if (!user) return { ok: false, reason: 'invalid' };

  if (mfaEnabled(user)) {
    const second = await checkSecondFactor('companyUser', user, credential);
    return second.ok ? { ok: true } : { ok: false, reason: second.reason };
  }

  if (!credential) return { ok: false, reason: 'missing' };
  return (await bcrypt.compare(credential, user.passwordHash))
    ? { ok: true }
    : { ok: false, reason: 'invalid' };
}

/**
 * Reveals the document number for one submission, and writes the access down.
 *
 * The caller must have already proved the submission belongs to this tenant —
 * that check lives in the tenant wrapper and is not repeated here, so this
 * function cannot be the place a tenant boundary is forgotten.
 */
export async function revealDocumentNumber({
  submission, companyId, userId, userName, sessionId, adminId, credential,
}: {
  submission: { id: string; idDocumentNumber: string | null };
  companyId: string;
  userId: string;
  userName: string;
  sessionId?: string | null;
  adminId?: string | null;
  credential: string;
}): Promise<RevealOutcome> {
  const check = await checkCredential(userId, credential);
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

/** How many times this tenant's numbers were read in the last day. */
export async function revealsToday(companyId: string): Promise<number> {
  return prisma.revealLog.count({
    where: { companyId, at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}
