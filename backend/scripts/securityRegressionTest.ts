// Every finding from the security audit, re-run as an assertion.
//
// These are the exploits that worked. Each one must now fail; if a refactor ever
// re-opens one, this is what says so.
//
// Run: npx tsx scripts/securityRegressionTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { issueToken } from '../lib/authTokens.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
async function gql(query: string, variables?: object, token?: string) {
  const res = await fetch(API, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }) });
  const text = await res.text();
  try { return JSON.parse(text) as { data?: any; errors?: { message: string }[] }; }
  catch { return { errors: [{ message: text.slice(0, 80) }] }; }
}

(async () => {
  const run = Date.now();
  // The limiters now count in Postgres, so a previous run's budget would
  // otherwise leak into this one and refuse requests for the wrong reason.
  await prisma.rateLimitHit.deleteMany({});
  const company = await prisma.company.create({ data: { name: `Sec ${run}`, slug: `sec-${run}`, formConfig: {} } });
  const owner = await prisma.companyUser.create({
    data: { email: `sec-own-${run}@test.local`, passwordHash: 'x', name: 'Owner' } });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: owner.id, role: 'OWNER' } });
  const member = await prisma.companyUser.create({
    data: { email: `sec-mem-${run}@test.local`, passwordHash: 'x', name: 'Member' } });
  const membership = await prisma.companyMember.create({
    data: { companyId: company.id, userId: member.id, role: 'EMPLOYEE_PLUS' } });
  const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });
  const memberToken = signCompanyToken({ companyUserId: member.id, companyId: company.id, role: 'EMPLOYEE_PLUS' });
  const canRead = async (t: string) => !(await gql('{ companySubmissions(limit:1){ id } }', undefined, t)).errors?.length;

  console.log('— Finding 1 · aliased mutations in one request —');
  const aliased = `mutation { ${[0,1,2].map(n => `s${n}: submitEndUserStatement(input: {
    email: "sec${n}-${run}@test.local", firstName: "F", lastName: "${n}", substances: "Water",
    statement: "probe", agreedToTerms: true, companySlug: "sec-${run}", buyerType: INDIVIDUAL }) { id }`).join('\n')} }`;
  const flood = await gql(aliased);
  const created = await prisma.submission.count({ where: { companyId: company.id } });
  check('several mutations in one document are refused', !!flood.errors?.length, flood.errors?.[0]?.message);
  check('and nothing was created by it', created === 0, `${created} rows`);

  console.log('— Findings 2 and 3 · membership and role are read from the database —');
  check('member can read before removal', await canRead(memberToken));
  await prisma.companyMember.delete({ where: { id: membership.id } });
  check('removed member is refused immediately', !(await canRead(memberToken)));
  const demoted = await prisma.companyMember.create({
    data: { companyId: company.id, userId: member.id, role: 'EMPLOYEE' } });
  const staleOwnerToken = signCompanyToken({ companyUserId: member.id, companyId: company.id, role: 'OWNER' });
  const ownerOnly = await gql('{ companyMembers { email } }', undefined, staleOwnerToken);
  check('a token claiming OWNER gets the role the database says', !!ownerOnly.errors?.length, ownerOnly.errors?.[0]?.message);
  await prisma.companyMember.delete({ where: { id: demoted.id } });

  console.log('— Finding 4 · a reset ends open sessions —');
  // A session worth invalidating is older than the reset by more than the
  // one-second grace; a real stolen one is hours or days old.
  await new Promise(r => setTimeout(r, 1200));
  await prisma.companyUser.update({ where: { id: owner.id }, data: { passwordHash: await (await import('bcrypt')).default.hash('old-password-1', 12) } });
  check('owner session works before the reset', await canRead(ownerToken));
  const rt = await issueToken(owner.id, 'PASSWORD_RESET');
  const reset = await gql(`mutation($t:String!,$p:String!){ resetPassword(token:$t,password:$p) }`, { t: rt, p: 'new-password-2' });
  check('reset succeeds', reset.data?.resetPassword === true, reset.errors?.[0]?.message);
  check('the pre-reset session is dead', !(await canRead(ownerToken)));

  console.log('— Findings 5 · alias amplification —');
  // Signed after the reset above, which deliberately invalidated the earlier
  // one. The pause clears the one-second grace window that keeps a token minted
  // in the same second as a reset from being treated as older than the reset.
  await new Promise(r => setTimeout(r, 1200));
  const freshOwner = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });
  check('a session opened after the reset works', await canRead(freshOwner));
  const wide = `{ ${Array.from({ length: 50 }, (_, i) => `a${i}: companySubmissions(limit:200){ id }`).join('\n')} }`;
  const ampAuth = await gql(wide, undefined, freshOwner);
  check('50 aliased list queries are refused', !!ampAuth.errors?.length, ampAuth.errors?.[0]?.message);
  const widePublic = `{ ${Array.from({ length: 400 }, (_, i) => `f${i}: formInfo(slug:"sec-${run}"){ companyName }`).join('\n')} }`;
  const ampPublic = await gql(widePublic);
  check('400 aliased public lookups are refused', !!ampPublic.errors?.length, ampPublic.errors?.[0]?.message);
  // The cost rule used to count Field nodes as written, so a fragment hid
  // mutations from the one-per-request cap and was charged once however often
  // it was spread.
  const fragMut = await gql(`mutation { ...Batch }
    fragment Batch on Mutation { a: requestPasswordReset(email: "a@test.local") b: requestPasswordReset(email: "b@test.local") }`);
  check('two mutations inside a fragment are refused',
    !!fragMut.errors?.some(e => /at most 1 mutation/.test(e.message)), fragMut.errors?.[0]?.message);
  const fragWide = await gql(`{ ${Array.from({ length: 40 }, (_, i) => `f${i}: formInfo(slug:"sec-${run}") { ...Info }`).join('\n')} }
    fragment Info on PublicFormInfo { ${Array.from({ length: 10 }, (_, i) => `c${i}: companyName`).join(' ')} }`);
  check('a fragment spread 40 times is charged 40 times',
    !!fragWide.errors?.some(e => /too large/.test(e.message)), fragWide.errors?.[0]?.message);
  const team = await gql('{ a: teamDecisions(limit: 20) { total } b: teamDecisions(limit: 20) { total } }', undefined, freshOwner);
  check('two aliased teamDecisions are refused (each reads its full cap)',
    !!team.errors?.some(e => /too many rows/.test(e.message)), team.errors?.[0]?.message);

  console.log('— Finding 6 · invite tokens —');
  const invites: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await gql(`mutation($e:String!,$r:CompanyRole!){ inviteMember(email:$e,role:$r){ inviteUrl } }`,
      { e: `sec-inv${i}-${run}@test.local`, r: 'EMPLOYEE' }, freshOwner);
    invites.push(String(r.data?.inviteMember?.inviteUrl ?? '').split('/invite/')[1] ?? '');
  }
  const shared = invites[0] && invites.every(t => t.length === invites[0].length)
    ? invites[0].split('').filter((ch, i) => invites.every(t => t[i] === ch)).length : -1;
  check('tokens are long and random', invites[0]?.length >= 40, `length ${invites[0]?.length}`);
  check('consecutive tokens share almost nothing', shared <= 2, `${shared} characters identical`);
  check('the raw token is not stored', (await prisma.companyInvite.count({ where: { tokenHash: invites[0] } })) === 0);

  console.log('— Finding 10 · registration does not reveal accounts —');
  const dupe = await gql(`mutation($n:String!,$s:String!,$e:String!,$p:String!,$y:String!){
    registerCompany(name:$n,slug:$s,email:$e,password:$p,yourName:$y){ token } }`,
    { n: 'X', s: `sec-dupe-${run}`, e: `sec-own-${run}@test.local`, p: 'some-password-1', y: 'X' });
  check('the message does not confirm the address exists',
    !/already exists/i.test(dupe.errors?.[0]?.message ?? ''), dupe.errors?.[0]?.message);

  console.log('— Finding 19 · verification capacity is per caller —');
  const filler = Array.from({ length: 1200 }, (_, i) => ({
    sessionId: `sec-flood-${run}-${i}`, companyId: null, ipHash: 'someone-elses-address',
    expiresAt: new Date(Date.now() + 3600_000) }));
  await prisma.verificationSession.createMany({ data: filler });
  const { checkCapacity } = await import('../services/diditSessionStore.ts');
  const verdict = await checkCapacity('a-different-address', company.id);
  check('one flooding address does not exhaust everyone', verdict.ok === true, JSON.stringify(verdict));
  const theirs = await checkCapacity('someone-elses-address', company.id);
  check('the flooding address is the one refused', theirs.ok === false && theirs.reason === 'ip', JSON.stringify(theirs));
  await prisma.verificationSession.deleteMany({ where: { sessionId: { startsWith: `sec-flood-${run}` } } });

  console.log('— Finding 20 · the webhook rejects cheaply and is metered —');
  const big = JSON.stringify({ session_id: 'x', pad: 'v'.repeat(300_000) });
  const t0 = Date.now();
  const bigRes = await fetch('http://localhost:3000/didit-webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-timestamp': String(Math.floor(Date.now()/1000)), 'x-signature-v2': 'deadbeef' },
    body: big });
  check('an oversized body is rejected', bigRes.status === 401 || bigRes.status === 413, `status ${bigRes.status}`);
  check('and it is rejected fast', Date.now() - t0 < 200, `${Date.now() - t0}ms`);
  const codes: number[] = [];
  for (let i = 0; i < 130; i++) {
    const r = await fetch('http://localhost:3000/didit-webhook', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-timestamp': String(Math.floor(Date.now()/1000)), 'x-signature': 'deadbeef' },
      body: '{}' });
    codes.push(r.status);
  }
  check('the endpoint is rate limited', codes.includes(429), `statuses seen: ${[...new Set(codes)].join(',')}`);

  console.log('— Cleanup —');
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: `sec-` } } });
  await prisma.companyUser.deleteMany({ where: { email: { contains: `-${run}@test.local` } } });
  await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: 'webhook:' } } });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
