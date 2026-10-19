// Nightly-alert tests.
//
// What the nightly maintenance reports, and what it does before retention
// deletes old submissions. Pinned: a run of failed checks is reported and a
// lone one is not; a submission past retention has its Didit session deleted
// first, and one that cannot be deleted is counted for the alert; and with
// ADMIN_EMAIL unset, platform notices are not sent anywhere — the old default
// was a domain this platform does not own.
//
// Run: npx tsx scripts/opsAlertTest.ts   (needs the database; Didit and mail are stubbed)
export {};
process.env.DIDIT_API_KEY = 'test-key';
process.env.DIDIT_WORKFLOW_ID = 'test-workflow';
process.env.ADMIN_EMAIL = '';
process.env.MAIL_PREVIEW = '1';

const run = Date.now().toString(36);
const failing = new Set<string>();
const deleted: string[] = [];
globalThis.fetch = (async (input: any, init?: any) => {
  const m = String(input).match(/\/v3\/session\/([^/]+)\/delete\/$/);
  if (!m || init?.method !== 'DELETE') throw new Error(`unexpected request in test: ${input}`);
  const id = decodeURIComponent(m[1]);
  deleted.push(id);
  return failing.has(id) ? new Response('error', { status: 500 }) : new Response(null, { status: 204 });
}) as typeof fetch;

const { errorSpikes } = await import('../lib/opsAlerts.ts');
const { purgeBeforeRetention } = await import('../lib/diditReconcile.ts');
const { sendOpsAlert, sendAccessRequestToAdmin, sendAdminNotification } = await import('../services/email.ts');
const { prisma } = await import('../lib/prisma.ts');
const { tenantSubmissions } = await import('../lib/tenant.ts');

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const base = {
  email: 'o@test.local', orderNumber: '', firstName: 'O', lastName: 'T', street: '', zipCode: '', place: '',
  country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'test',
};
const company = await prisma.company.create({ data: { name: 'Ops Test', slug: `ops-${run}` } });
const ids: string[] = [];
const make = async (data: Record<string, unknown>) => {
  ids.push((await prisma.submission.create({ data: { ...base, viesStatus: 'NOT_CHECKED', companyId: company.id, ...data } as any })).id);
  return ids[ids.length - 1];
};

try {
  console.log('— Error spikes —');
  for (let i = 0; i < 4; i++) await make({ substanceCheckStatus: 'ERROR', viesStatus: i === 0 ? 'ERROR' : 'VALID' });
  await make({ substanceCheckStatus: 'OK', viesStatus: 'VALID' });
  const lines = await errorSpikes({ companyId: company.id });
  check('four substance errors out of five are reported', lines.some(l => l.startsWith('4 of 5 substance check')), JSON.stringify(lines));
  check('one VIES error out of five is not', !lines.some(l => l.includes('VIES')), JSON.stringify(lines));
  check('the lines carry counts, not names', !lines.some(l => /O T|o@test/.test(l)));

  console.log('— Before retention —');
  const old = new Date(Date.now() - 19 * 30 * 24 * 60 * 60 * 1000);
  const cutoff = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000);
  const okId = await make({ createdAt: old, idVerificationSessionId: `ops-${run}-ok`, idVerificationStatus: 'IN_REVIEW' });
  await make({ createdAt: old, idVerificationSessionId: `ops-${run}-bad`, idVerificationStatus: 'IN_REVIEW' });
  await make({ createdAt: new Date(), idVerificationSessionId: `ops-${run}-young`, idVerificationStatus: 'IN_REVIEW' });
  failing.add(`ops-${run}-bad`);
  const failed = await purgeBeforeRetention(cutoff, { only: ids });
  check('an old unpurged session is deleted at Didit before retention', deleted.includes(`ops-${run}-ok`));
  check('…and recorded as purged', (await prisma.submission.findUnique({ where: { id: okId } }))?.idVerificationPurged === true);
  check('one that cannot be deleted is counted for the alert', failed === 1, `got ${failed}`);
  check('a submission inside retention is not touched', !deleted.includes(`ops-${run}-young`));

  console.log('— Deleting one submission —');
  const doomed = await make({ idVerificationSessionId: `ops-${run}-doomed`, idVerificationStatus: 'IN_REVIEW' });
  await tenantSubmissions(company.id).delete(doomed);
  check('a seller deleting a submission deletes its Didit session first', deleted.includes(`ops-${run}-doomed`));
  check('…and the submission is gone', (await prisma.submission.count({ where: { id: doomed } })) === 0);

  console.log('— No admin address —');
  check('the maintenance alert is not sent anywhere', (await sendOpsAlert(['x'])) === null);
  check('an access request is not sent anywhere', (await sendAccessRequestToAdmin('Co', 'Owner', 'o@test.local', null)) === null);
  check('a new-statement notice is not sent anywhere', (await sendAdminNotification('id', 'Co')) === null);
} finally {
  await prisma.submission.deleteMany({ where: { id: { in: ids } } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
