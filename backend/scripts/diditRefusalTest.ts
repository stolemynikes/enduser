// Refusal-purge tests.
//
// When a buyer is refused after the hosted ID check — under age, or a document
// that is not a passport or identity card — the session is already spent and
// no submission will ever own it. Its photos must be deleted at Didit there
// and then, not left for the nightly prune. A normal submission must still go
// through and purge as before.
//
// Brings up its own server against a fake Didit, so no API key is used and no
// verification is paid for. Needs the database.
//
// Run: npx tsx scripts/diditRefusalTest.ts
import http from 'node:http';
import { spawn } from 'node:child_process';
import { prisma } from '../lib/prisma.ts';

const DIDIT_PORT = 3124;
const PORT = 3125;
const API = `http://localhost:${PORT}/graphql`;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const run = Date.now().toString(36);
const sid = (k: string) => `refusal-${run}-${k}`;

// What the fake Didit answers for each session.
const decisions: Record<string, unknown> = {
  [sid('minor')]: {
    status: 'Approved',
    id_verifications: [{ document_type: 'P', document_number: 'X1234567', date_of_birth: '2015-03-01', full_name: 'Young Buyer', expiration_date: '2031-01-01' }],
  },
  [sid('licence')]: {
    status: 'Approved',
    id_verifications: [{ document_type: 'DL', document_number: 'D7654321', date_of_birth: '1980-03-01', full_name: 'Licence Holder', expiration_date: '2031-01-01' }],
  },
  [sid('adult')]: {
    status: 'Approved',
    id_verifications: [{ document_type: 'P', document_number: 'P1112223', date_of_birth: '1980-03-01', full_name: 'Adult Buyer', expiration_date: '2031-01-01' }],
  },
};
const deleted: string[] = [];

const didit = http.createServer((req, res) => {
  const decision = req.url?.match(/^\/v3\/session\/([^/]+)\/decision\/$/);
  const del = req.url?.match(/^\/v3\/session\/([^/]+)\/delete\/$/);
  if (req.method === 'GET' && decision && decisions[decodeURIComponent(decision[1])]) {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(decisions[decodeURIComponent(decision[1])]));
  } else if (req.method === 'DELETE' && del) {
    deleted.push(decodeURIComponent(del[1]));
    res.writeHead(204).end();
  } else {
    res.writeHead(404).end();
  }
});
await new Promise<void>(r => didit.listen(DIDIT_PORT, '127.0.0.1', r));

const owner = await prisma.companyUser.create({
  data: { email: `refusal-${run}@test.local`, passwordHash: 'x', name: 'Owner', emailVerifiedAt: new Date() },
});
const company = await prisma.company.create({
  data: {
    name: 'Refusal Test', slug: `refusal-${run}`, approvedAt: new Date(),
    formConfig: { buyerTypes: 'INDIVIDUAL_ONLY', orderNumber: 'HIDDEN', address: 'HIDDEN', casNumbers: 'HIDDEN' },
    members: { create: { role: 'OWNER', userId: owner.id } },
  },
});
for (const k of ['minor', 'licence', 'adult']) {
  await prisma.verificationSession.create({
    data: { sessionId: sid(k), companyId: company.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
}

const server = spawn('npx', ['tsx', 'index.ts'], {
  env: {
    ...process.env, PORT: String(PORT),
    DIDIT_BASE_URL: `http://127.0.0.1:${DIDIT_PORT}`, DIDIT_API_KEY: 'test-key', DIDIT_WORKFLOW_ID: 'test-workflow',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const stop = () => { try { server.kill('SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stop);

async function submit(session: string) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1' },
    body: JSON.stringify({
      query: 'mutation($i: SubmitInput!){ submitEndUserStatement(input: $i){ id } }',
      variables: { i: {
        email: 'buyer@test.local', firstName: 'Test', lastName: 'Buyer', substances: 'Acetone',
        statement: 'Cleaning optics in our workshop', agreedToTerms: true, buyerType: 'INDIVIDUAL',
        companySlug: company.slug, diditSessionId: session,
      } },
    }),
  });
  return r.json() as Promise<any>;
}

try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      up = (await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1' },
        body: JSON.stringify({ query: '{ __typename }' }),
      })).ok;
    } catch { /* not listening yet */ }
  }
  check('the server came up', up);
  if (!up) throw new Error('server did not start');

  console.log('— Refused after the check —');
  const minor = await submit(sid('minor'));
  check('an under-age buyer is refused', minor.errors?.[0]?.extensions?.code === 'UNDER_AGE', JSON.stringify(minor.errors ?? minor.data));
  check('…and their session is deleted at Didit right away', deleted.includes(sid('minor')));

  const licence = await submit(sid('licence'));
  check('a driving licence is refused', licence.errors?.[0]?.extensions?.code === 'ID_DOCUMENT_TYPE', JSON.stringify(licence.errors ?? licence.data));
  check('…and its session is deleted at Didit right away', deleted.includes(sid('licence')));
  check('the refused sessions are not left for the nightly prune to delete again',
    (await prisma.verificationSession.count({ where: { sessionId: { in: [sid('minor'), sid('licence')] } } })) === 0);

  const refused = await prisma.submission.count({ where: { idVerificationSessionId: { in: [sid('minor'), sid('licence')] } } });
  check('no submission was stored for either', refused === 0);

  console.log('— A normal submission is unchanged —');
  const adult = await submit(sid('adult'));
  check('an adult with a passport is accepted', !!adult.data?.submitEndUserStatement?.id, JSON.stringify(adult.errors));
  const row = await prisma.submission.findFirst({ where: { idVerificationSessionId: sid('adult') }, select: { idVerificationPurged: true } });
  check('…its session is purged and recorded as such', deleted.includes(sid('adult')) && row?.idVerificationPurged === true);
} finally {
  stop();
  didit.close();
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.verificationSession.deleteMany({ where: { sessionId: { startsWith: `refusal-${run}-` } } });
  await prisma.notification.deleteMany({ where: { companyId: company.id } });
  await prisma.companyMember.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.companyUser.delete({ where: { id: owner.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
