// Cross-tenant isolation test (security checklist item 1).
//
// Registers two companies via the real GraphQL API, gives company A a
// submission, then attacks it with company B's token: every read and mutation
// must fail with "Not found" / not leak A's row. Also probes the GraphQL
// hardening (query depth limit, batched-request rejection).
//
// Run: npx tsx scripts/crossTenantTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';

const API = 'http://localhost:3000/graphql';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function gql(query: string, variables?: object, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: any; errors?: { message: string }[] }>;
}

const run = Date.now();
const REGISTER = `mutation($name:String!,$slug:String!,$email:String!,$password:String!,$yourName:String!){
  registerCompany(name:$name,slug:$slug,email:$email,password:$password,yourName:$yourName){ token company{ id slug } }
}`;

async function main() {
  console.log('— Setup: register two tenants —');
  const a = await gql(REGISTER, { name: `IsoTest A ${run}`, slug: `isotest-a-${run}`, email: `iso-a-${run}@test.local`, password: 'test-password-1', yourName: 'Owner A' });
  const b = await gql(REGISTER, { name: `IsoTest B ${run}`, slug: `isotest-b-${run}`, email: `iso-b-${run}@test.local`, password: 'test-password-1', yourName: 'Owner B' });
  if (!a.data?.registerCompany || !b.data?.registerCompany) {
    console.error('Setup failed:', JSON.stringify(a.errors ?? b.errors));
    process.exit(1);
  }
  const tokenA = a.data.registerCompany.token as string;
  const tokenB = b.data.registerCompany.token as string;
  const companyA = a.data.registerCompany.company.id as string;
  const companyB = b.data.registerCompany.company.id as string;

  // Give tenant A a submission (seeded directly; the public form flow is
  // exercised elsewhere — this test targets the authenticated tenant surface).
  const sub = await prisma.submission.create({
    data: {
      email: 'victim@test.local', orderNumber: 'ISO-1', firstName: 'Victim', lastName: 'Tenant',
      street: '', zipCode: '', place: '', country: 'Netherlands',
      companyName: 'Victim BV', vatNumber: '', buyerType: 'COMPANY',
      substances: 'Acetone', casNumbers: '', statement: 'isolation test',
      viesStatus: 'NOT_CHECKED', viesAddressMatch: 'NOT_CHECKED', substanceCheckStatus: 'NOT_CHECKED',
      status: 'PENDING_REVIEW', isTest: true, companyId: companyA,
    },
  });

  try {
    console.log('— Tenant A sanity —');
    const ownList = await gql('{ companySubmissions(includeTest: true) { id } }', undefined, tokenA);
    check('A sees its own submission', ownList.data?.companySubmissions?.some((s: any) => s.id === sub.id) === true);

    console.log('— Cross-tenant attacks as B —');
    const list = await gql('{ companySubmissions(includeTest: true) { id } }', undefined, tokenB);
    check('B\'s list does not contain A\'s submission', list.data?.companySubmissions?.every((s: any) => s.id !== sub.id) === true);

    const attacks: [string, string][] = [
      ['approve', `mutation{ approveCompanySubmission(id:"${sub.id}"){ id } }`],
      ['deny', `mutation{ denyCompanySubmission(id:"${sub.id}",reason:"x"){ id } }`],
      ['reopen', `mutation{ reopenCompanySubmission(id:"${sub.id}"){ id } }`],
      ['delete', `mutation{ deleteCompanySubmission(id:"${sub.id}") }`],
      ['override', `mutation{ overrideCompanySubmissionCheck(id:"${sub.id}",category:VIES,reason:"x"){ id } }`],
      ['clear override', `mutation{ clearCompanySubmissionCheckOverride(id:"${sub.id}",category:VIES){ id } }`],
      ['recheck substance', `mutation{ recheckCompanySubmissionSubstance(id:"${sub.id}"){ id } }`],
    ];
    for (const [name, query] of attacks) {
      const res = await gql(query, undefined, tokenB);
      const blocked = !!res.errors?.length && res.data == null || Object.values(res.data ?? {}).every(v => v == null);
      check(`B cannot ${name} A's submission`, !!res.errors?.length && blocked, JSON.stringify(res));
    }

    // Unauthenticated must also be locked out.
    const anon = await gql('{ companySubmissions { id } }');
    check('unauthenticated companySubmissions rejected', !!anon.errors?.length && !anon.data?.companySubmissions);

    console.log('— GraphQL hardening —');
    // The depth rule is syntactic (it also ignores __introspection fields, which
    // are prod-disabled anyway) — a 10-deep selection set must fail validation.
    const deep = await gql('{ a { a { a { a { a { a { a { a { a { a } } } } } } } } } }');
    check('depth-10 query rejected by depth limit', !!deep.errors?.some(e => /exceeds maximum operation depth/i.test(e.message)), JSON.stringify(deep.errors));

    const batched = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ query: '{ __typename }' }, { query: '{ __typename }' }]),
    });
    check('batched request rejected', batched.status >= 400, `status ${batched.status}`);

    console.log('— Password policy (server-side) —');
    const REGISTER_PW = `mutation($name:String!,$slug:String!,$email:String!,$password:String!,$yourName:String!){
      registerCompany(name:$name,slug:$slug,email:$email,password:$password,yourName:$yourName){ token }
    }`;
    const shortPw = await gql(REGISTER_PW, {
      name: `PwTest ${run}`, slug: `pwtest-${run}`, email: `pw-${run}@test.local`,
      password: 'abc', yourName: 'Owner',
    });
    check(
      'registerCompany rejects password shorter than 8 chars',
      !shortPw.data?.registerCompany && /at least 8 characters/i.test(shortPw.errors?.[0]?.message ?? ''),
      JSON.stringify(shortPw.errors),
    );

    console.log('— Unauthenticated endpoint rate limiting —');
    // /verification-session is public and every call costs a paid verification —
    // >10 requests in the window must trip the limiter.
    const codes: number[] = [];
    for (let i = 0; i < 13; i++) {
      const r = await fetch('http://localhost:3000/verification-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      codes.push(r.status);
    }
    check('/verification-session rate-limits burst traffic (429 seen)', codes.includes(429), `codes ${codes.join(',')}`);

    // The status endpoint must never hand identity data to an unauthenticated
    // caller — an unknown session id is a flat 404, not a hint.
    const unknown = await fetch('http://localhost:3000/verification-status/00000000-0000-0000-0000-000000000000');
    check('/verification-status 404s on an unknown session', unknown.status === 404, `status ${unknown.status}`);

    // The webhook is public; an unsigned body must be refused outright.
    const unsigned = await fetch('http://localhost:3000/didit-webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: 'x', status: 'Approved' }),
    });
    check(
      '/didit-webhook refuses an unsigned body',
      unsigned.status === 401 || unsigned.status === 503,
      `status ${unsigned.status}`,
    );
  } finally {
    console.log('— Cleanup —');
    await prisma.submission.deleteMany({ where: { companyId: { in: [companyA, companyB] } } });
    await prisma.companyMember.deleteMany({ where: { companyId: { in: [companyA, companyB] } } });
    await prisma.companyUser.deleteMany({ where: { email: { in: [`iso-a-${run}@test.local`, `iso-b-${run}@test.local`] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA, companyB] } } });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
