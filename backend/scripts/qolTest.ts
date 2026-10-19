// End-to-end checks for the account, queue and data-lifecycle work.
//
// Covers: password reset, email verification, queue pagination, test-data
// isolation, company switching and scheduled account closure. The document
// number's own handling moved to scripts/revealTest.ts once it stopped
// travelling with queries altogether.
//
// Run: npx tsx scripts/qolTest.ts   (backend must be running on :3000)
import { LEGAL_VERSION } from '../lib/legal.ts';
import { prisma } from '../lib/prisma.ts';
import { issueToken } from '../lib/authTokens.ts';

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
  return res.json() as Promise<{ data?: any; errors?: { message: string }[] }>;
}

const REGISTER = `mutation($name:String!,$slug:String!,$email:String!,$password:String!,$yourName:String!){
  registerCompany(name:$name,slug:$slug,email:$email,password:$password,yourName:$yourName,legalVersion:"${LEGAL_VERSION}"){ token company{ id slug } }
}`;
const LOGIN = `mutation($email:String!,$password:String!){ companyLogin(email:$email,password:$password){ token role company{ slug } } }`;

async function main() {
  // Budgets now live in Postgres and survive restarts, so a previous run's
  // registrations would otherwise refuse this one's.
  await prisma.rateLimitHit.deleteMany({});
  const run = Date.now();
  const ownerEmail = `qol-${run}@test.local`;
  const slugA = `qoltest-a-${run}`;
  const slugB = `qoltest-b-${run}`;

  console.log('— Setup —');
  const a = await gql(REGISTER, { name: `QoL A ${run}`, slug: slugA, email: ownerEmail, password: 'first-password-1', yourName: 'QoL Owner' });
  const tokenA = a.data?.registerCompany?.token;
  const companyA = a.data?.registerCompany?.company?.id;
  if (!tokenA) { console.error('setup failed:', JSON.stringify(a.errors)); process.exit(1); }
  const owner = await prisma.companyUser.findUnique({ where: { email: ownerEmail }, select: { id: true } });
  console.log('  one tenant registered');

  console.log('— Email verification —');
  const beforeVerify = await gql('{ myAccount { email emailVerified } }', undefined, tokenA);
  check('a new account starts unverified', beforeVerify.data?.myAccount?.emailVerified === false);
  check('registration issued a verification token',
    (await prisma.authToken.count({ where: { userId: owner!.id, kind: 'EMAIL_VERIFICATION' } })) === 1);

  const verifyToken = await issueToken(owner!.id, 'EMAIL_VERIFICATION');
  const verified = await gql(`mutation($t:String!){ verifyEmail(token:$t) }`, { t: verifyToken });
  check('a valid link confirms the address', verified.data?.verifyEmail === true, verified.errors?.[0]?.message);
  const afterVerify = await gql('{ myAccount { emailVerified } }', undefined, tokenA);
  check('the account now reads as verified', afterVerify.data?.myAccount?.emailVerified === true);
  const replay = await gql(`mutation($t:String!){ verifyEmail(token:$t) }`, { t: verifyToken });
  check('the same link cannot be used twice', !replay.data?.verifyEmail && !!replay.errors?.length);

  console.log('— Password reset —');
  const asked = await gql(`mutation($e:String!){ requestPasswordReset(email:$e) }`, { e: ownerEmail });
  check('a request for a real address reports success', asked.data?.requestPasswordReset === true);
  const unknown = await gql(`mutation($e:String!){ requestPasswordReset(email:$e) }`, { e: `nobody-${run}@test.local` });
  check('a request for an unknown address reports the same', unknown.data?.requestPasswordReset === true);
  check('only the real address got a token',
    (await prisma.authToken.count({ where: { userId: owner!.id, kind: 'PASSWORD_RESET' } })) === 1);

  const resetToken = await issueToken(owner!.id, 'PASSWORD_RESET');
  const tooShort = await gql(`mutation($t:String!,$p:String!){ resetPassword(token:$t,password:$p) }`, { t: resetToken, p: 'short' });
  check('a weak new password is refused', !tooShort.data?.resetPassword && !!tooShort.errors?.length);
  const reset = await gql(`mutation($t:String!,$p:String!){ resetPassword(token:$t,password:$p) }`, { t: resetToken, p: 'second-password-2' });
  check('the reset link sets a new password', reset.data?.resetPassword === true, reset.errors?.[0]?.message);
  const oldLogin = await gql(LOGIN, { email: ownerEmail, password: 'first-password-1' });
  check('the old password no longer works', !oldLogin.data?.companyLogin);
  const newLogin = await gql(LOGIN, { email: ownerEmail, password: 'second-password-2' });
  check('the new password works', !!newLogin.data?.companyLogin?.token, newLogin.errors?.[0]?.message);
  const token = newLogin.data.companyLogin.token;

  console.log('— Queue paging, test data and redaction —');
  for (let i = 0; i < 3; i++) {
    await prisma.submission.create({
      data: {
        email: `buyer${i}-${run}@test.local`, orderNumber: `Q-${i}`, firstName: 'Buyer', lastName: `${i}`,
        street: 'Teststraat 1', zipCode: '1000AA', place: 'Amsterdam', country: 'Netherlands',
        companyName: 'Buyer BV', vatNumber: 'NL000099998B57', substances: 'Acetone', casNumbers: '67-64-1',
        statement: 'Laboratory use.', viesStatus: 'NOT_CHECKED', status: 'PENDING_REVIEW',
        companyId: companyA, idDocumentNumber: 'SECRET-123', isTest: i === 2,
      },
    });
  }
  const page = await gql('query($l:Int){ companySubmissions(limit:$l){ id orderNumber idDocumentNumber } }', { l: 2 }, token);
  check('limit is honoured', page.data?.companySubmissions?.length === 2, `got ${page.data?.companySubmissions?.length}`);
  const offset = await gql('query($l:Int,$o:Int){ companySubmissions(limit:$l,offset:$o){ orderNumber } }', { l: 2, o: 2 }, token);
  check('offset returns the next page', offset.data?.companySubmissions?.length === 0 || offset.data?.companySubmissions?.[0]?.orderNumber !== page.data?.companySubmissions?.[0]?.orderNumber);

  const real = await gql('{ companySubmissions(limit:50){ orderNumber } }', undefined, token);
  check('test submissions stay out of the real queue', real.data?.companySubmissions?.length === 2, `got ${real.data?.companySubmissions?.length}`);
  const tests = await gql('{ companySubmissions(limit:50, includeTest:true){ orderNumber } }', undefined, token);
  check('test mode shows only the test rows', tests.data?.companySubmissions?.length === 1, `got ${tests.data?.companySubmissions?.length}`);

  const counts = await gql('{ companySubmissionCounts { all pending tests } }', undefined, token);
  check('counts exclude test rows but report them', counts.data?.companySubmissionCounts?.all === 2 && counts.data?.companySubmissionCounts?.tests === 1,
    JSON.stringify(counts.data?.companySubmissionCounts));

  // Changed on 2026-10-05. This used to assert that an owner receives the
  // document number with the queue, which is exactly what made a stolen owner
  // session worth having. It now reaches nobody through a query — see
  // scripts/revealTest.ts for the call that is allowed to produce it.
  check('not even an owner receives the document number with the queue',
    page.data?.companySubmissions?.[0]?.idDocumentNumber === null,
    JSON.stringify(page.data?.companySubmissions?.[0]?.idDocumentNumber));

  // Same tenant, seen through an Employee's token.
  const employee = await prisma.companyUser.create({
    data: { email: `qol-emp-${run}@test.local`, passwordHash: 'x', name: 'Employee' },
  });
  await prisma.companyMember.create({ data: { companyId: companyA, userId: employee.id, role: 'EMPLOYEE' } });
  const { signCompanyToken } = await import('../services/companyAuth.ts');
  const empToken = signCompanyToken({ companyUserId: employee.id, companyId: companyA, role: 'EMPLOYEE' });
  const empView = await gql('{ companySubmissions(limit:50){ idDocumentNumber } }', undefined, empToken);
  check('an Employee does not receive it either',
    (empView.data?.companySubmissions ?? []).every((s: any) => s.idDocumentNumber === null),
    JSON.stringify(empView.data?.companySubmissions));

  console.log('— Several companies on one account —');
  const b = await gql(REGISTER, { name: `QoL B ${run}`, slug: slugB, email: `qol-b-${run}@test.local`, password: 'other-password-1', yourName: 'Other Owner' });
  const companyB = b.data?.registerCompany?.company?.id;
  await prisma.companyMember.create({ data: { companyId: companyB, userId: owner!.id, role: 'EMPLOYEE_PLUS' } });
  const mine = await gql('{ myCompanies { slug role current } }', undefined, token);
  check('both memberships are listed', (mine.data?.myCompanies ?? []).length === 2, JSON.stringify(mine.data?.myCompanies));
  const switched = await gql(`mutation($id:ID!){ switchCompany(companyId:$id){ token role company{ slug } } }`, { id: companyB }, token);
  check('switching returns a token for the other company',
    switched.data?.switchCompany?.company?.slug === slugB && switched.data?.switchCompany?.role === 'EMPLOYEE_PLUS',
    switched.errors?.[0]?.message);
  const strangerCompany = await prisma.company.create({ data: { name: `QoL C ${run}`, slug: `qoltest-c-${run}` } });
  const refused = await gql(`mutation($id:ID!){ switchCompany(companyId:$id){ token } }`, { id: strangerCompany.id }, token);
  check('switching into a company you do not belong to is refused', !refused.data?.switchCompany && !!refused.errors?.length);

  console.log('— Closing an account —');
  const wrongSlug = await gql(`mutation($s:String!){ requestCompanyDeletion(confirmSlug:$s) }`, { s: 'not-the-slug' }, token);
  check('closure needs the address typed correctly', !wrongSlug.data?.requestCompanyDeletion && !!wrongSlug.errors?.length);
  const closed = await gql(`mutation($s:String!){ requestCompanyDeletion(confirmSlug:$s) }`, { s: slugA }, token);
  check('closure is accepted with the right address', closed.data?.requestCompanyDeletion === true, closed.errors?.[0]?.message);
  const scheduled = await gql('{ myCompany { deletionRequestedAt deletionScheduledFor } }', undefined, token);
  const days = scheduled.data?.myCompany?.deletionScheduledFor
    ? Math.round((new Date(scheduled.data.myCompany.deletionScheduledFor).getTime() - Date.now()) / 86400000) : 0;
  check('the purge is scheduled 30 days out', days === 30, `${days} days`);
  const stillThere = await prisma.submission.count({ where: { companyId: companyA } });
  check('nothing is deleted during the grace period', stillThere === 3, `${stillThere} submissions`);
  const cancelled = await gql('mutation { cancelCompanyDeletion }', undefined, token);
  check('closure can be undone', cancelled.data?.cancelCompanyDeletion === true);

  console.log('— Purge past the grace period —');
  await prisma.company.update({
    where: { id: companyA },
    data: { deletionRequestedAt: new Date(Date.now() - 31 * 86400000) },
  });
  const { purgeDeletedCompanies } = await import('../lib/retention.ts');
  const purged = await purgeDeletedCompanies();
  check('an expired closure purges the company', purged === 1, `purged ${purged}`);
  check('its submissions are gone', (await prisma.submission.count({ where: { companyId: companyA } })) === 0);
  check('a member who belongs elsewhere keeps their account',
    (await prisma.companyUser.count({ where: { id: owner!.id } })) === 1);
  check('a member who belonged only there is removed',
    (await prisma.companyUser.count({ where: { id: employee.id } })) === 0);

  console.log('— Cleanup —');
  await prisma.company.deleteMany({ where: { slug: { in: [slugB, `qoltest-c-${run}`] } } });
  await prisma.companyUser.deleteMany({ where: { email: { in: [ownerEmail, `qol-b-${run}@test.local`] } } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
