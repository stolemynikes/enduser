// Reconciliation for sessions that were never purged at Didit.
//
// The delete call used the wrong path (`/v3/session/{id}/` instead of
// `/v3/session/{id}/delete/`) and failed with a 404, so rows created before that
// fix are marked idVerificationPurged = false while their documents are still
// held by the provider. This walks those rows, purges each session, and records
// the result.
//
//   npx tsx scripts/purgeDiditSessions.ts          # dry run — lists what it would do
//   npx tsx scripts/purgeDiditSessions.ts --apply  # actually delete at Didit
//
// Deletion at the provider is irreversible: the decision becomes unreadable, so
// a submission can no longer be re-checked against Didit afterwards. The fields
// we keep (status, liveness, face match, document type/number/expiry) are
// already stored on our side.
import { prisma } from '../lib/prisma.ts';
import { DIDIT_ENABLED, deleteSession } from '../services/didit.ts';

const apply = process.argv.includes('--apply');

if (!DIDIT_ENABLED) {
  console.error('DIDIT_API_KEY / DIDIT_WORKFLOW_ID are not set — nothing to do.');
  process.exit(1);
}

const rows = await prisma.submission.findMany({
  where: {
    idVerificationSessionId: { not: null },
    idVerificationPurged: false,
    idVerificationStatus: { in: ['APPROVED', 'DECLINED', 'EXPIRED'] },
  },
  select: { id: true, idVerificationSessionId: true, idVerificationStatus: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});

console.log(`${rows.length} submission(s) with an unpurged Didit session.`);
for (const row of rows) {
  const when = row.createdAt.toISOString().slice(0, 10);
  if (!apply) {
    console.log(`  would purge ${row.idVerificationSessionId} (submission ${row.id}, ${row.idVerificationStatus}, ${when})`);
    continue;
  }
  const purged = await deleteSession(row.idVerificationSessionId as string);
  if (purged) {
    await prisma.submission.update({ where: { id: row.id }, data: { idVerificationPurged: true } });
  }
  console.log(`  ${purged ? 'purged ' : 'FAILED '} ${row.idVerificationSessionId} (submission ${row.id}, ${when})`);
}

if (!apply && rows.length > 0) console.log('\nDry run. Re-run with --apply to delete these at Didit.');
process.exit(0);
