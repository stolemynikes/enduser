// The white-hat pass, re-run as assertions.
//
// Each block below is an attack that worked against the hardened build: an
// invite mailer reachable from a throwaway account, a page size smuggled past
// the query budget in a variable, a lockout notice that confirmed an account
// exists, a re-check button that could be held down against PubChem. They must
// all fail from here on.
//
// Run: npx tsx scripts/hardeningTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
async function gql(query: string, variables?: object, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  try { return JSON.parse(text) as { data?: any; errors?: { message: string }[] }; }
  catch { return { errors: [{ message: text.slice(0, 120) }] }; }
}

(async () => {
  const run = Date.now();
  // Budgets and limiters live in Postgres, so a previous run would otherwise
  // refuse these requests for the wrong reason.
  await prisma.rateLimitHit.deleteMany({});
  await prisma.mailBudget.deleteMany({});

  const company = await prisma.company.create({
    data: { name: `Hard ${run}`, slug: `hard-${run}`, formConfig: {} },
  });
  // An owner who has not confirmed their address — the state a signup lands in.
  const unverified = await prisma.companyUser.create({
    data: { email: `hard-un-${run}@test.local`, passwordHash: 'x', name: 'Unconfirmed' },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: unverified.id, role: 'OWNER' } });
  const unverifiedToken = signCompanyToken({ companyUserId: unverified.id, companyId: company.id, role: 'OWNER' });

  console.log('— Invitations are not an open mailer —');
  const invite = (address: string, token: string) =>
    gql('mutation($e:String!){ inviteMember(email:$e, role: EMPLOYEE){ ok } }', { e: address }, token);

  const fromUnverified = await invite(`victim-${run}@test.local`, unverifiedToken);
  check('an unconfirmed owner cannot send invitations',
    !!fromUnverified.errors?.length, fromUnverified.errors?.[0]?.message);

  await prisma.companyUser.update({ where: { id: unverified.id }, data: { emailVerifiedAt: new Date() } });
  const ownerToken = unverifiedToken;

  const mixedCase = await invite(`Victim-${run}@Test.Local`, ownerToken);
  check('a confirmed owner can invite', !mixedCase.errors?.length, mixedCase.errors?.[0]?.message);
  const stored = await prisma.companyInvite.findFirst({
    where: { companyId: company.id }, orderBy: { createdAt: 'desc' }, select: { email: true },
  });
  check('the address is stored in one canonical form',
    stored?.email === `victim-${run}@test.local`, stored?.email);

  const malformed = await invite('not-an-address', ownerToken);
  check('a malformed address is refused', !!malformed.errors?.length, malformed.errors?.[0]?.message);

  // Budget is 3 per recipient per hour; one is already spent.
  await invite(`victim-${run}@test.local`, ownerToken);
  await invite(`victim-${run}@test.local`, ownerToken);
  const fourth = await invite(`victim-${run}@test.local`, ownerToken);
  check('the fourth invitation to one address is refused',
    !!fourth.errors?.length, fourth.errors?.[0]?.message);

  console.log('— A page size in a variable is charged at the ceiling —');
  const aliases = (arg: string) =>
    ['a', 'b', 'c', 'd', 'e'].map(k => `${k}: companySubmissions(${arg}){ id }`).join(' ');
  const literal = await gql(`{ ${aliases('limit: 100')} }`, undefined, ownerToken);
  check('five pages of 100 stay inside the budget',
    !literal.errors?.length, literal.errors?.[0]?.message);
  const smuggled = await gql(
    `query($l:Int){ ${aliases('limit: $l')} }`, { l: 200 }, ownerToken);
  check('five pages of an unknown size are refused',
    !!smuggled.errors?.length, smuggled.errors?.[0]?.message);

  console.log('— The lockout notice is not an account oracle —');
  const locked = await prisma.companyUser.create({
    data: {
      email: `hard-lock-${run}@test.local`,
      // bcrypt hash of "correct horse battery staple!"
      passwordHash: '$2b$12$lOeFK0Zd9WzAhJ6OcmcL3.Sn6v0Qo5Qo8gCKzEQhX1n8g2sOd1Ymq',
      name: 'Locked',
      lockedUntil: new Date(Date.now() + 10 * 60_000),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: locked.id, role: 'EMPLOYEE' } });
  const wrongWhileLocked = await gql(
    'mutation($e:String!){ companyLogin(email:$e, password:"definitely wrong"){ token } }',
    { e: locked.email });
  const message = wrongWhileLocked.errors?.[0]?.message ?? '';
  check('a wrong guess against a locked account says only "invalid"',
    message === 'Invalid email or password', message);
  const refreshed = await prisma.companyUser.findUnique({
    where: { id: locked.id }, select: { failedLogins: true },
  });
  check('and the guess did not extend the lock', refreshed?.failedLogins === 0, String(refreshed?.failedLogins));

  console.log('— The re-check button is not an amplifier —');
  const submission = await prisma.submission.create({
    data: {
      companyId: company.id,
      email: `buyer-${run}@test.local`, orderNumber: 'X', firstName: 'B', lastName: 'Uyer',
      street: 'S', zipCode: '1', place: 'P', country: 'NL',
      companyName: '', vatNumber: '', buyerType: 'INDIVIDUAL',
      substances: 'Acetone', casNumbers: '67-64-1', statement: 'laboratory solvent use',
      status: 'PENDING_REVIEW', viesStatus: 'NOT_CHECKED',
      substanceCheckStatus: 'OK', substanceCheckedAt: new Date(),
    },
  });
  const recheck = () => gql(
    'mutation($i:ID!){ recheckCompanySubmissionSubstance(id:$i){ id } }', { i: submission.id }, ownerToken);
  const tooSoon = await recheck();
  check('a re-check moments after the last one is refused',
    !!tooSoon.errors?.length, tooSoon.errors?.[0]?.message);
  await prisma.submission.update({
    where: { id: submission.id }, data: { substanceCheckStatus: 'PENDING' },
  });
  const whileRunning = await recheck();
  check('a re-check while one is already running is refused',
    !!whileRunning.errors?.length, whileRunning.errors?.[0]?.message);

  console.log('— Free text that reaches an inbox is bounded —');
  await prisma.submission.update({
    where: { id: submission.id }, data: { substanceCheckStatus: 'OK' },
  });
  const longReason = await gql(
    'mutation($i:ID!,$r:String!){ denyCompanySubmission(id:$i, reason:$r){ id } }',
    { i: submission.id, r: 'x'.repeat(5000) }, ownerToken);
  check('a 5000-character denial reason is refused',
    !!longReason.errors?.length, longReason.errors?.[0]?.message);

  console.log('— Cleanup —');
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  for (const id of [unverified.id, locked.id]) {
    await prisma.companyUser.delete({ where: { id } }).catch(() => {});
  }
  await prisma.mailBudget.deleteMany({});

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
