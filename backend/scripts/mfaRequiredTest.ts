// Requiring a second factor, with REQUIRE_MFA=1.
//
// This suite starts its own server on another port, because the requirement is
// read from the environment at boot and the shared instance runs with it off.
// Deliberately: switching it on globally before the people who run the platform
// have enrolled locks them out of their own product.
//
// The two claims being held apart are the ones that make the difference between
// a requirement and an outage: an unenrolled account must still be able to sign
// in and reach the screen that gives it a factor, and must be able to reach
// nothing else. A passkey has to satisfy the requirement as fully as an
// authenticator app, or the rule pushes people towards the weaker factor in the
// name of security.
//
// Run: npx tsx scripts/mfaRequiredTest.ts   (starts and stops its own server)
import { spawn } from 'node:child_process';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import { confirmEnrolment, startEnrolment } from '../lib/mfa.ts';
import bcrypt from 'bcrypt';

const PORT = 3123;
const API = `http://localhost:${PORT}/graphql`;
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

type Result = { data?: any; errors?: { message: string; extensions?: { code?: string } }[] };
async function gql(query: string, variables?: object, token?: string): Promise<Result> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  try { return JSON.parse(text) as Result; }
  catch { return { errors: [{ message: text.slice(0, 160) }] }; }
}
const code = (r: Result) => r.errors?.[0]?.extensions?.code ?? null;

(async () => {
  const run = Date.now();
  await prisma.rateLimitHit.deleteMany({});
  const PASSWORD = 'required-mfa-password';

  const company = await prisma.company.create({
    data: { name: `Req ${run}`, slug: `req-${run}`, formConfig: {} },
  });
  const bare = await prisma.companyUser.create({
    data: {
      email: `req-bare-${run}@test.local`, name: 'Bare Owner', emailVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: bare.id, role: 'OWNER' } });

  // A second account whose only factor is a passkey — the case that decides
  // whether the requirement respects the stronger credential.
  const keyed = await prisma.companyUser.create({
    data: {
      email: `req-key-${run}@test.local`, name: 'Keyed Owner', emailVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: keyed.id, role: 'OWNER' } });
  await prisma.passkey.create({
    data: {
      userId: keyed.id, credentialId: `req-cred-${run}`,
      publicKey: Buffer.from('k').toString('base64url'), counter: 0, name: 'Laptop',
    },
  });

  console.log(`— Starting a server on :${PORT} with REQUIRE_MFA=1 —`);
  const server = spawn('npx', ['tsx', 'index.ts'], {
    env: { ...process.env, REQUIRE_MFA: '1', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stop = () => { try { server.kill('SIGTERM'); } catch { /* already gone */ } };
  process.on('exit', stop);

  // Wait for it to answer rather than guessing at a sleep.
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const r = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ publicConfig { turnstileSiteKey } }' }),
      });
      up = r.ok;
    } catch { /* not listening yet */ }
  }
  check('the server came up', up);
  if (!up) { stop(); console.log('\n0 passed, 1 failed'); process.exit(1); }

  const bareToken = signCompanyToken({ companyUserId: bare.id, companyId: company.id, role: 'OWNER' });
  const keyedToken = signCompanyToken({ companyUserId: keyed.id, companyId: company.id, role: 'OWNER' });

  console.log('— An unenrolled account can still sign in —');
  const login = await gql(
    'mutation($e:String!,$p:String!){ companyLogin(email:$e,password:$p){ token } }',
    { e: bare.email, p: PASSWORD });
  check('the password is still accepted', !!login.data?.companyLogin?.token,
    JSON.stringify(login.errors));

  console.log('— But it can do nothing except enrol —');
  const blocked: [string, string][] = [
    ['read the queue', '{ companySubmissions(limit:5){ id } }'],
    ['read the counts', '{ companySubmissionCounts{ all } }'],
    ['read the company', '{ myCompany{ name } }'],
    ['read the team', '{ companyMembers{ email } }'],
    ['read notifications', '{ unreadNotificationCount }'],
    ['read the reveal log', '{ revealLog(limit:5){ id } }'],
  ];
  for (const [label, q] of blocked) {
    const r = await gql(q, undefined, bareToken);
    check(`it cannot ${label}`, code(r) === 'MFA_ENROLMENT_REQUIRED',
      code(r) ?? JSON.stringify(r.data));
  }
  const mutate = await gql(
    'mutation{ updateFormConfig(config:{orderNumber:REQUIRED,address:REQUIRED,buyerTypes:COMPANY_ONLY,casNumbers:REQUIRED,idVerification:REQUIRED}){ orderNumber } }',
    undefined, bareToken);
  check('it cannot change the form either', code(mutate) === 'MFA_ENROLMENT_REQUIRED',
    code(mutate) ?? JSON.stringify(mutate.data));

  console.log('— The enrolment screens stay reachable —');
  const reachable: [string, string][] = [
    ['see its own account', '{ myAccount{ email mfaEnabled } }'],
    ['list its passkeys', '{ myPasskeys{ id } }'],
  ];
  for (const [label, q] of reachable) {
    const r = await gql(q, undefined, bareToken);
    check(`it can ${label}`, !r.errors?.length, JSON.stringify(r.errors));
  }
  const startApp = await gql('mutation($p:String){ startMfaEnrolment(proof:$p){ secret } }', { p: PASSWORD }, bareToken);
  check('it can start app enrolment', !!startApp.data?.startMfaEnrolment?.secret,
    JSON.stringify(startApp.errors));
  const startKey = await gql('mutation($p:String){ startPasskeyRegistration(proof:$p){ ticket } }', { p: PASSWORD }, bareToken);
  check('it can start passkey enrolment', !!startKey.data?.startPasskeyRegistration?.ticket,
    JSON.stringify(startKey.errors));

  console.log('— A passkey satisfies the requirement, not only an app —');
  const keyedQueue = await gql('{ companySubmissions(limit:5){ id } }', undefined, keyedToken);
  check('an account whose only factor is a passkey is not blocked',
    !keyedQueue.errors?.length, JSON.stringify(keyedQueue.errors));
  const keyedCompany = await gql('{ myCompany{ name } }', undefined, keyedToken);
  check('and can read the rest of the dashboard', !keyedCompany.errors?.length);

  console.log('— Enrolling an app lifts the block —');
  await startEnrolment('companyUser', bare.id, bare.email);
  const stored = await prisma.companyUser.findUnique({
    where: { id: bare.id }, select: { totpSecret: true },
  });
  const secret = decryptField(stored!.totpSecret!, 'totpSecret');
  const confirmed = await confirmEnrolment('companyUser', bare.id, totp(secret));
  check('enrolment succeeded', confirmed.ok);
  // Enabling ends the older sessions, so this one is reissued.
  const afterToken = signCompanyToken({ companyUserId: bare.id, companyId: company.id, role: 'OWNER' });
  const nowAllowed = await gql('{ companySubmissions(limit:5){ id } }', undefined, afterToken);
  check('the queue opens up', !nowAllowed.errors?.length, JSON.stringify(nowAllowed.errors));

  console.log('— Cleanup —');
  stop();
  await prisma.passkey.deleteMany({ where: { userId: { in: [bare.id, keyed.id] } } });
  await prisma.company.delete({ where: { id: company.id } });
  for (const id of [bare.id, keyed.id]) {
    await prisma.companyUser.delete({ where: { id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
