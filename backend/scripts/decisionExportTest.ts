// Decision log export.
//
// A CSV of every approval and denial in a period, for an auditor. Pinned:
// only the owner, outside a support session, with a fresh second-factor code;
// only this seller's decisions in the period, test data left out; overrides
// with their reasons; a value that a spreadsheet would run as a formula is
// neutralised; and the download is recorded.
//
// Run: npx tsx scripts/decisionExportTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { startEnrolment, confirmEnrolment } from '../lib/mfa.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';

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
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<any>;
}
const EXPORT = 'mutation($f:String!,$t:String!,$c:String!){ exportDecisions(from:$f,to:$t,credential:$c){ filename csv rows truncated } }';

const run = Date.now().toString(36);
await prisma.rateLimitHit.deleteMany({});
const companies: string[] = [];
const users: string[] = [];

async function member(companyId: string, role: 'OWNER' | 'EMPLOYEE_PLUS', name: string) {
  const user = await prisma.companyUser.create({ data: { email: `de-${role}-${run}-${companyId.slice(-4)}@test.local`, name, passwordHash: 'x', emailVerifiedAt: new Date() } });
  users.push(user.id);
  await prisma.companyMember.create({ data: { companyId, userId: user.id, role } });
  await startEnrolment('companyUser', user.id, user.email);
  const st = await prisma.companyUser.findUnique({ where: { id: user.id }, select: { totpSecret: true } });
  const secret = decryptField(st!.totpSecret!, 'totpSecret');
  await confirmEnrolment('companyUser', user.id, totp(secret));
  return {
    user, token: signCompanyToken({ companyUserId: user.id, companyId, role }),
    code: async () => { await prisma.companyUser.update({ where: { id: user.id }, data: { totpLastCounter: null } }); return totp(secret); },
  };
}

try {
  const a = await prisma.company.create({ data: { name: `DE A ${run}`, slug: `de-a-${run}` } });
  const b = await prisma.company.create({ data: { name: `DE B ${run}`, slug: `de-b-${run}` } });
  companies.push(a.id, b.id);
  const owner = await member(a.id, 'OWNER', 'Olga Owner');
  const reviewer = await member(a.id, 'EMPLOYEE_PLUS', 'Raf Reviewer');
  const otherOwner = await member(b.id, 'OWNER', 'Otto Other');

  const base = {
    orderNumber: '', street: '', zipCode: '', place: '', country: '', companyName: '', vatNumber: '', buyerType: 'INDIVIDUAL' as const,
    substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED' as const,
  };
  const mk = (companyId: string, extra: Record<string, unknown>) => prisma.submission.create({ data: { ...base, companyId, ...extra } as any });
  const inside = new Date('2026-03-10T12:00:00Z');
  const approved = await mk(a.id, { email: 'a@x', firstName: 'Ann', lastName: 'Inside', orderNumber: `ORD-IN-${run}`, status: 'APPROVED', reviewedAt: inside, reviewedByName: 'Raf Reviewer' });
  await prisma.submissionOverride.create({ data: { submissionId: approved.id, category: 'VIES', reason: 'Known customer, VIES down', createdById: reviewer.user.id, createdByName: 'Raf Reviewer' } });
  const formula = await mk(a.id, { email: 'f@x', firstName: '=HYPERLINK("http://evil")', lastName: 'Buyer', status: 'DENIED', adminNote: 'Not plausible', reviewedAt: inside, reviewedByName: 'Olga Owner' });
  const outside = await mk(a.id, { email: 'o@x', firstName: 'Otto', lastName: 'Outside', orderNumber: `ORD-OUT-${run}`, status: 'APPROVED', reviewedAt: new Date('2026-05-01T12:00:00Z') });
  const test = await mk(a.id, { email: 't@x', firstName: 'Tess', lastName: 'Test', orderNumber: `ORD-TEST-${run}`, status: 'APPROVED', reviewedAt: inside, isTest: true });
  await mk(b.id, { email: 'b@x', firstName: 'Bert', lastName: 'Other', orderNumber: `ORD-B-${run}`, status: 'APPROVED', reviewedAt: inside });

  const v = (c: string) => ({ f: '2026-03-01', t: '2026-03-31', c });
  console.log('— Who may export —');
  check('a visitor cannot', !!(await gql(EXPORT, v('000000'))).errors?.length);
  check('a reviewer cannot', !!(await gql(EXPORT, v(await reviewer.code()), reviewer.token)).errors?.length);
  check('the owner cannot without a code', !!(await gql(EXPORT, v(''), owner.token)).errors?.length);
  const admin = await prisma.admin.findFirst();
  if (admin) {
    const support = signCompanyToken({ companyUserId: owner.user.id, companyId: a.id, role: 'OWNER', support: true, adminId: admin.id });
    check('a support session cannot', !!(await gql(EXPORT, v(await owner.code()), support)).errors?.length);
  }
  check('dates the wrong way round are refused', !!(await gql(EXPORT, { f: '2026-04-01', t: '2026-03-01', c: await owner.code() }, owner.token)).errors?.length);
  check('nothing was recorded for any of those', (await prisma.buyerDataAction.count({ where: { companyId: a.id } })) === 0);

  console.log('— What it holds —');
  const res = await gql(EXPORT, v(await owner.code()), owner.token);
  const csv: string = res.data?.exportDecisions?.csv ?? '';
  check('the owner with a code gets the CSV', csv.includes('Decided at (UTC)'), JSON.stringify(res.errors));
  check('it holds the two decisions in the period', res.data?.exportDecisions?.rows === 2 && csv.includes(`ORD-IN-${run}`) && csv.includes(formula.id));
  check('not one outside the period', !csv.includes(`ORD-OUT-${run}`) && !csv.includes(outside.id));
  check('not test data', !csv.includes(`ORD-TEST-${run}`) && !csv.includes(test.id));
  check('not another seller\'s', !csv.includes(`ORD-B-${run}`));
  check('the override is there with its reason and who', csv.includes('VAT number by Raf Reviewer') && csv.includes('Known customer, VIES down'));
  check('the reason given for a denial is there', csv.includes('Not plausible'));
  check('a formula in a name is neutralised', csv.includes(`"'=HYPERLINK(""http://evil"") Buyer"`) && !/(^|,)=HYPERLINK/m.test(csv), csv.split('\r\n').find(l => l.includes('HYPERLINK')));
  const otherCsv: string = (await gql(EXPORT, v(await otherOwner.code()), otherOwner.token)).data?.exportDecisions?.csv ?? '';
  check('another seller\'s owner sees only their own', otherCsv.includes(`ORD-B-${run}`) && !otherCsv.includes(`ORD-IN-${run}`));
  const logged = await prisma.buyerDataAction.findFirst({ where: { companyId: a.id, kind: 'DECISION_EXPORT' } });
  check('the download is recorded', logged?.statements === 2 && logged.userName === 'Olga Owner');
} finally {
  for (const c of companies) {
    await prisma.submission.deleteMany({ where: { companyId: c } });
    await prisma.buyerDataAction.deleteMany({ where: { companyId: c } });
    await prisma.companyMember.deleteMany({ where: { companyId: c } });
    await prisma.company.delete({ where: { id: c } });
  }
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
