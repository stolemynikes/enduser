// Access requests: a new company's form stays closed until a platform admin
// approves it.
//
// What matters is that "closed" really is closed — the form page says so AND
// the submit mutation refuses, because a determined client skips the page —
// that only an admin can decide, and that a refusal carries a reason the
// applicant is shown.
//
// Needs a running server. Run: npx tsx scripts/accessTest.ts
import { LEGAL_VERSION } from '../lib/legal.ts';
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.ts';

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
  return res.json() as Promise<{ data?: any; errors?: { message: string; extensions?: { code?: string } }[] }>;
}

await prisma.rateLimitHit.deleteMany({ where: { OR: [{ key: { contains: 'submit' } }, { key: { contains: 'login' } }, { key: { contains: 'register' } }] } });

const run = Date.now().toString(36);
const slug = `access-${run}`;
const email = `access-${run}@test.local`;

console.log('— Requesting access —');
const reg = await gql(`mutation($n:String!,$s:String!,$e:String!,$p:String!,$y:String!,$note:String){
  registerCompany(name:$n,slug:$s,email:$e,password:$p,yourName:$y,requestNote:$note,legalVersion:"${LEGAL_VERSION}"){ token company{ id } } }`,
  { n: `Access Lab ${run}`, s: slug, e: email, p: 'access-password-1', y: 'Applicant', note: 'Lab supplier, 40 orders a month.' });
check('registration succeeds', !!reg.data, JSON.stringify(reg.errors));
const companyToken: string = reg.data.registerCompany.token;
const companyId: string = reg.data.registerCompany.company.id;

// Everything else a form needs, so the only thing missing is the approval.
await prisma.companyUser.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
await prisma.company.update({ where: { id: companyId }, data: { formConfig: {
  orderNumber: 'OPTIONAL', address: 'HIDDEN', buyerTypes: 'INDIVIDUAL_ONLY', casNumbers: 'OPTIONAL',
  concentration: 'OPTIONAL', idVerification: 'HIDDEN', customTermsMode: 'TEXT', customTermsText: '',
} } });

const me = await gql('{ myCompany { accessStatus rejectionReason } }', {}, companyToken);
check('the applicant sees PENDING', me.data?.myCompany?.accessStatus === 'PENDING', JSON.stringify(me));

const FORM_INFO = 'query($s:String!){ formInfo(slug:$s){ configured } }';
const SUBMIT = 'mutation($i: SubmitInput!){ submitEndUserStatement(input:$i){ id } }';
const submission = { email: 'buyer@example.com', firstName: 'A', lastName: 'B', substances: 'acetone', casNumbers: '67-64-1',
  statement: 'Cleaning laboratory glassware.', agreedToTerms: true, companySlug: slug };

console.log('— Closed until approved —');
check('the form page reports not configured', (await gql(FORM_INFO, { s: slug })).data?.formInfo?.configured === false);
const early = await gql(SUBMIT, { i: submission });
check('a direct submit is refused with FORM_NOT_OPEN', early.errors?.[0]?.extensions?.code === 'FORM_NOT_OPEN', JSON.stringify(early.errors?.[0]));
check('and nothing was stored', (await prisma.submission.count({ where: { companyId } })) === 0);

console.log('— Only an admin decides —');
const admin = await prisma.admin.findFirst();
if (!admin) throw new Error('No admin account in this database — create one with scripts/setAdminPassword.ts');
const adminToken = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
const asCompany = await gql('mutation($id:ID!){ approveCompanyAccess(id:$id){ status } }', { id: companyId }, companyToken);
check('a company token cannot approve itself', !!asCompany.errors?.length && !asCompany.data?.approveCompanyAccess);
const anon = await gql('{ accessRequests { id } }');
check('the queue is not readable without signing in', !!anon.errors?.length);
const queue = await gql('{ accessRequests { id status requestNote ownerEmail ownerEmailVerified formConfigured } }', {}, adminToken);
const mine = queue.data?.accessRequests?.find((r: any) => r.id === companyId);
check('the admin queue lists the request', !!mine && mine.status === 'PENDING', JSON.stringify(queue.errors ?? mine));
check('with the applicant’s note, address and verification state',
  mine?.requestNote === 'Lab supplier, 40 orders a month.' && mine?.ownerEmail === email && mine?.ownerEmailVerified === true);

console.log('— Declining —');
const noReason = await gql('mutation($id:ID!,$r:String!){ rejectCompanyAccess(id:$id,reason:$r){ status } }', { id: companyId, r: ' ' }, adminToken);
check('a refusal without a reason is refused', !!noReason.errors?.length);
const rej = await gql('mutation($id:ID!,$r:String!){ rejectCompanyAccess(id:$id,reason:$r){ status rejectionReason } }',
  { id: companyId, r: 'We could not confirm the business.' }, adminToken);
check('declined with a reason', rej.data?.rejectCompanyAccess?.status === 'REJECTED', JSON.stringify(rej.errors));
const meRej = await gql('{ myCompany { accessStatus rejectionReason } }', {}, companyToken);
check('the applicant sees REJECTED and why', meRej.data?.myCompany?.accessStatus === 'REJECTED'
  && meRej.data?.myCompany?.rejectionReason === 'We could not confirm the business.');
check('the form is still closed', (await gql(SUBMIT, { i: submission })).errors?.[0]?.extensions?.code === 'FORM_NOT_OPEN');

console.log('— Approving —');
const ok = await gql('mutation($id:ID!){ approveCompanyAccess(id:$id){ status rejectionReason decidedAt } }', { id: companyId }, adminToken);
check('approved, and the earlier refusal cleared', ok.data?.approveCompanyAccess?.status === 'APPROVED'
  && ok.data?.approveCompanyAccess?.rejectionReason === null, JSON.stringify(ok.errors ?? ok.data));
check('the form page now reports configured', (await gql(FORM_INFO, { s: slug })).data?.formInfo?.configured === true);
const late = await gql(SUBMIT, { i: submission });
check('and a submission goes through', !!late.data?.submitEndUserStatement?.id, JSON.stringify(late.errors?.[0]));
const again = await gql('mutation($id:ID!,$r:String!){ rejectCompanyAccess(id:$id,reason:$r){ status } }', { id: companyId, r: 'Changed my mind.' }, adminToken);
check('an approved company cannot be "declined" from the request queue', !!again.errors?.length);

console.log('— Existing companies were not shut —');
const unapprovedOld = await prisma.company.count({ where: { deletedAt: null, approvedAt: null, rejectedAt: null, createdAt: { lt: new Date('2026-10-09T00:00:00Z') } } });
check('no company from before the change is waiting for approval', unapprovedOld === 0, `${unapprovedOld} waiting`);

await prisma.submission.deleteMany({ where: { companyId } });
await prisma.company.update({ where: { id: companyId }, data: { deletedAt: new Date() } });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
