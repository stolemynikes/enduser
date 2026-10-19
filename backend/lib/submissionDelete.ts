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
    await prisma.notification.deleteMany({ where: { submissionId: { in: chunk } } });
    count += (await prisma.submission.deleteMany({ where: { id: { in: chunk } } })).count;
  }
  return { count, sessionFailures };
}
