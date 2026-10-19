// The one way submissions are deleted.
//
// A submission is not just its row. Its Didit session still holds the buyer's
// photos until it is purged, and the notifications about it name the buyer.
// Deleting the row alone left both behind: the photos orphaned at Didit for
// good, the name in the activity list. Every deletion — retention, a closed
// company, a seller deleting one, a buyer's erasure request, the admin
// clearing test data — goes through here so none of them can forget a part.
import { prisma } from './prisma.ts';
import { purgeSessionsOf } from './diditReconcile.ts';
import type { Prisma } from '../generated/prisma/client.ts';

const CHUNK = 1000;

export type DeleteResult = {
  /** Submissions deleted. */
  count: number;
  /** Didit sessions that could not be deleted first; the caller reports them. */
  sessionFailures: number;
};

export async function deleteSubmissions(where: Prisma.SubmissionWhereInput): Promise<DeleteResult> {
  // The set is fixed first and everything acts on exactly it, so a row that
  // starts matching in between is neither deleted nor left with its session
  // purged and the row kept.
  const ids = (await prisma.submission.findMany({ where, select: { id: true } })).map(r => r.id);
  let sessionFailures = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    sessionFailures += await purgeSessionsOf({ id: { in: ids.slice(i, i + CHUNK) } });
  }
  let count = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await keepUnpurgedSessions(chunk);
    await prisma.notification.deleteMany({ where: { submissionId: { in: chunk } } });
    count += (await prisma.submission.deleteMany({ where: { id: { in: chunk } } })).count;
    // Again afterwards: a notification written while this ran (a new-statement
    // alert still on its way) would otherwise outlive the statement it names.
    await prisma.notification.deleteMany({ where: { submissionId: { in: chunk } } });
  }
  return { count, sessionFailures };
}

/**
 * A session Didit would not delete just now is the only pointer to the
 * buyer's photos held there, and it lived on the row being deleted. It is
 * handed to the session store as an abandoned session, already past its
 * grace period, so the nightly prune keeps trying to delete it at Didit (and
 * reports it if it gives up) instead of the reference vanishing with the row.
 */
async function keepUnpurgedSessions(chunk: string[]): Promise<void> {
  const left = await prisma.submission.findMany({
    where: { id: { in: chunk }, idVerificationSessionId: { not: null }, idVerificationPurged: false },
    select: { idVerificationSessionId: true, companyId: true },
  });
  const expiredAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const s of left) {
    const sessionId = s.idVerificationSessionId as string;
    await prisma.verificationSession.upsert({
      where: { sessionId },
      create: { sessionId, companyId: s.companyId, expiresAt: expiredAt, consumedAt: new Date() },
      update: { expiresAt: expiredAt },
    });
  }
}
