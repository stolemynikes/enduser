// Nightly reconcile tests.
//
// A check still IN_REVIEW when the buyer submitted is completed by Didit's
// webhook. If that webhook is lost, the decision is never recorded and the
// photos are never deleted. The nightly reconcile re-fetches such checks; these
// cases pin that it records a final decision and purges, leaves an undecided
// one alone, reports one stuck for a week, retries a failed purge, and does
// not touch what is recent, finished or never collected.
//
// Run: npx tsx scripts/diditReconcileTest.ts   (needs the database; Didit is stubbed)
export {};
process.env.DIDIT_API_KEY = 'test-key';
process.env.DIDIT_WORKFLOW_ID = 'test-workflow';

const run = Date.now().toString(36);
const sid = (k: string) => `reconcile-${run}-${k}`;

const answers: Record<string, string> = {
  [sid('decided')]: 'Approved',
  [sid('reviewing')]: 'In Review',
  [sid('stuck')]: 'In Review',
};
const fetched: string[] = [];
const deleted: string[] = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input);
  const get = url.match(/\/v3\/session\/([^/]+)\/decision\/$/);
  const del = url.match(/\/v3\/session\/([^/]+)\/delete\/$/);
  if (get && (init?.method ?? 'GET') === 'GET') {
    const id = decodeURIComponent(get[1]);
    fetched.push(id);
    return new Response(JSON.stringify({ status: answers[id] ?? 'In Review', id_verifications: [{ document_type: 'P' }] }), { status: 200 });
  }
  if (del && init?.method === 'DELETE') {
    deleted.push(decodeURIComponent(del[1]));
    return new Response(null, { status: 204 });
  }
  throw new Error(`unexpected request in test: ${url}`);
}) as typeof fetch;

const { reconcileOpenVerifications } = await import('../lib/diditReconcile.ts');
const { prisma } = await import('../lib/prisma.ts');

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const HOUR = 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms);
const base = {
  email: 'r@test.local', orderNumber: '', firstName: 'R', lastName: 'T', street: '', zipCode: '', place: '',
  country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'test',
  viesStatus: 'NOT_CHECKED' as const,
};
const rows: Record<string, any> = {
  decided: { idVerificationSessionId: sid('decided'), idVerificationStatus: 'IN_REVIEW', createdAt: ago(2 * HOUR) },
  reviewing: { idVerificationSessionId: sid('reviewing'), idVerificationStatus: 'IN_REVIEW', createdAt: ago(2 * HOUR) },
  stuck: { idVerificationSessionId: sid('stuck'), idVerificationStatus: 'IN_REVIEW', createdAt: ago(8 * 24 * HOUR) },
  unpurged: { idVerificationSessionId: sid('unpurged'), idVerificationStatus: 'APPROVED', createdAt: ago(2 * HOUR) },
  recent: { idVerificationSessionId: sid('recent'), idVerificationStatus: 'IN_REVIEW', createdAt: ago(10 * 60 * 1000) },
  purged: { idVerificationSessionId: sid('purged'), idVerificationStatus: 'APPROVED', idVerificationPurged: true, createdAt: ago(2 * HOUR) },
  noId: { idVerificationSessionId: null, idVerificationStatus: 'NOT_CHECKED', createdAt: ago(2 * HOUR) },
};
const ids: Record<string, string> = {};
for (const [k, data] of Object.entries(rows)) {
  ids[k] = (await prisma.submission.create({ data: { ...base, ...data } })).id;
}

try {
  const r = await reconcileOpenVerifications({ only: Object.values(ids) });
  const get = (k: string) => prisma.submission.findUnique({
    where: { id: ids[k] }, select: { idVerificationStatus: true, idVerificationPurged: true },
  });

  console.log('— Recorded —');
  const decided = await get('decided');
  check('a lost decision is recorded', decided?.idVerificationStatus === 'APPROVED', JSON.stringify(decided));
  check('…and its session is deleted at Didit', deleted.includes(sid('decided')) && decided?.idVerificationPurged === true);
  const unpurged = await get('unpurged');
  check('a decided check whose deletion failed is purged now', deleted.includes(sid('unpurged')) && unpurged?.idVerificationPurged === true);

  console.log('— Left open —');
  const reviewing = await get('reviewing');
  check('a check still in review stays in review', reviewing?.idVerificationStatus === 'IN_REVIEW' && !deleted.includes(sid('reviewing')));
  check('a check undecided for over a week is reported stuck', r.stuck === 1, JSON.stringify(r));

  console.log('— Not touched —');
  check('a check younger than an hour is left to its webhook', !fetched.includes(sid('recent')) && !deleted.includes(sid('recent')));
  check('an already purged check is not contacted', !fetched.includes(sid('purged')) && !deleted.includes(sid('purged')));
  check('the counts add up', r.resolved === 1 && r.repurged === 1, JSON.stringify(r));
} finally {
  await prisma.submission.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
