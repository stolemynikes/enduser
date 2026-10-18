// Abandoned-session purge tests.
//
// A buyer who goes through the hosted ID check and then never submits leaves
// their document photos at Didit; so does one refused after it (under age,
// wrong document). The nightly prune deletes those sessions at Didit. These
// cases pin what it must and must not do: purge only sessions no submission
// took over, never one that may still be in flight, keep a row whose purge
// failed so it is retried, and give up only after the retry window.
//
// Run: npx tsx scripts/diditPurgeTest.ts   (needs the database; Didit is stubbed)
export {};
process.env.DIDIT_API_KEY = 'test-key';
process.env.DIDIT_WORKFLOW_ID = 'test-workflow';

const deleted: string[] = [];
const failing = new Set<string>();
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input);
  const m = url.match(/\/v3\/session\/([^/]+)\/delete\/$/);
  if (!m || init?.method !== 'DELETE') throw new Error(`unexpected request in test: ${url}`);
  const id = decodeURIComponent(m[1]);
  deleted.push(id);
  return failing.has(id) ? new Response('error', { status: 500 }) : new Response(null, { status: 204 });
}) as typeof fetch;

// Imported after the env and fetch are set — didit.ts reads the keys at load.
const { pruneSessions } = await import('../services/diditSessionStore.ts');
const { prisma } = await import('../lib/prisma.ts');

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const run = Date.now().toString(36);
const id = (k: string) => `purgetest-${run}-${k}`;
const ago = (ms: number) => new Date(Date.now() - ms);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const rows = {
  abandoned: { expiresAt: ago(2 * HOUR) },
  failing: { expiresAt: ago(2 * HOUR) },
  justExpired: { expiresAt: ago(10 * 60 * 1000) },
  live: { expiresAt: new Date(Date.now() + HOUR) },
  submitted: { expiresAt: ago(2 * HOUR), consumedAt: ago(3 * HOUR) },
  spentNoSubmission: { expiresAt: ago(2 * HOUR), consumedAt: ago(3 * HOUR) },
  stale: { expiresAt: ago(31 * DAY) },
};
failing.add(id('failing'));
failing.add(id('stale'));

for (const [k, data] of Object.entries(rows)) {
  await prisma.verificationSession.create({ data: { sessionId: id(k), ...data } });
}
const submission = await prisma.submission.create({
  data: {
    email: 'purge@test.local', orderNumber: '', firstName: 'P', lastName: 'T', street: '', zipCode: '',
    place: '', country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '',
    statement: 'test', viesStatus: 'NOT_CHECKED', idVerificationSessionId: id('submitted'),
  },
});

try {
  await pruneSessions();
  const left = new Set((await prisma.verificationSession.findMany({
    where: { sessionId: { startsWith: `purgetest-${run}-` } }, select: { sessionId: true },
  })).map(r => r.sessionId));
  const called = (k: string) => deleted.includes(id(k));

  console.log('— Purged at Didit —');
  check('an abandoned session is deleted at Didit', called('abandoned'));
  check('…and its row is dropped', !left.has(id('abandoned')));
  check('a session spent by a refused submission is deleted at Didit', called('spentNoSubmission'));
  check('…and its row is dropped', !left.has(id('spentNoSubmission')));

  console.log('— Left alone —');
  check('a session a submission took over is not touched at Didit', !called('submitted'));
  check('…but its row is dropped', !left.has(id('submitted')));
  check('a session that only just expired is not purged yet', !called('justExpired') && left.has(id('justExpired')));
  check('a live session is not touched', !called('live') && left.has(id('live')));

  console.log('— Failures —');
  check('a failed purge keeps the row for the next night', called('failing') && left.has(id('failing')));
  check('past the retry window a failing purge is dropped', called('stale') && !left.has(id('stale')));
} finally {
  await prisma.submission.delete({ where: { id: submission.id } });
  await prisma.verificationSession.deleteMany({ where: { sessionId: { startsWith: `purgetest-${run}-` } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
