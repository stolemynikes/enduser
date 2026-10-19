// With two-factor required, a platform admin without one can do nothing but
// set one up.
//
// The guard is one function (lib/adminGuard.ts). This pins that every admin
// operation goes through it: the platform queue, a single statement, the
// decision and override mutations, the document-number reveal, and the newer
// admin pages. They used to differ — the queue and the decisions checked only
// that the token was an admin's, so an admin who had never set up a second
// factor could still read and decide every statement.
//
// Brings up its own server with REQUIRE_MFA=1.
// Run: npx tsx scripts/adminMfaRequiredTest.ts   (needs the database)
import 'dotenv/config';
import { spawn } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.ts';
import { startEnrolment, confirmEnrolment } from '../lib/mfa.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';

const PORT = 3126;
const API = `http://localhost:${PORT}/graphql`;
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
async function gql(query: string, variables: object, token: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<any>;
}

const run = Date.now().toString(36);
const admin = await prisma.admin.create({ data: { username: `nofactor-${run}`, password: 'x' } });
const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
const company = await prisma.company.create({ data: { name: `MFA ${run}`, slug: `adminmfa-${run}` } });
const s = await prisma.submission.create({
  data: {
    companyId: company.id, email: 'm@test.local', orderNumber: '', firstName: 'M', lastName: 'F', street: '', zipCode: '',
    place: '', country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED',
  },
});

const server = spawn('npx', ['tsx', 'index.ts'], { env: { ...process.env, REQUIRE_MFA: '1', PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
const stop = () => { try { server.kill('SIGTERM'); } catch { /* gone */ } };
process.on('exit', stop);

try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { up = (await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1' }, body: '{"query":"{ __typename }"}' })).ok; } catch { /* not yet */ }
  }
  check('the server came up with two-factor required', up);

  const ops: [string, string, object][] = [
    ['the platform queue', '{ submissions(limit: 5) { id } }', {}],
    ['a single statement', 'query($id:ID!){ submission(id:$id){ id } }', { id: s.id }],
    ['approving', 'mutation($id:ID!){ approveSubmission(id:$id){ id } }', { id: s.id }],
    ['denying', 'mutation($id:ID!){ denySubmission(id:$id, reason:"no"){ id } }', { id: s.id }],
    ['overriding a check', 'mutation($id:ID!){ overrideSubmissionCheck(id:$id, category: VIES, reason:"known customer"){ id } }', { id: s.id }],
    ['revealing a document number', 'mutation($id:ID!){ revealSubmissionDocumentNumber(id:$id, credential:"123456"){ documentNumber } }', { id: s.id }],
    ['the health page', '{ adminHealth(days: 7) { days } }', {}],
    ['announcing a sub-processor', 'mutation{ announceSubprocessor(input:{name:"X",purpose:"X",data:"X",location:"X",effectiveDate:"2099-01-01"}){ id } }', {}],
  ];
  for (const [label, q, v] of ops) {
    const r = await gql(q, v, token);
    const code = r.errors?.[0]?.extensions?.code;
    check(`${label} asks for two-factor first`, code === 'MFA_ENROLMENT_REQUIRED' && !r.data?.[Object.keys(r.data ?? {})[0]], JSON.stringify(r.errors?.[0] ?? r.data));
  }
  const after = await prisma.submission.findUnique({ where: { id: s.id }, select: { status: true } });
  check('and the statement was not decided', after?.status === 'PENDING_REVIEW');

  // The same admin, once a second factor is set up, gets in — the requirement
  // must not lock out the people it is protecting.
  await startEnrolment('admin', admin.id, admin.username);
  const st = await prisma.admin.findUnique({ where: { id: admin.id }, select: { totpSecret: true } });
  await confirmEnrolment('admin', admin.id, totp(decryptField(st!.totpSecret!, 'totpSecret')));
  const fresh = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
  const ok = await gql('{ submissions(limit: 1) { id } }', {}, fresh);
  check('with a second factor set up, the admin gets in', Array.isArray(ok.data?.submissions), JSON.stringify(ok.errors));
} finally {
  stop();
  await prisma.submissionOverride.deleteMany({ where: { submissionId: s.id } });
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.subprocessorNotice.deleteMany({ where: { name: 'X', createdById: admin.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.admin.delete({ where: { id: admin.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
