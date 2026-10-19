// Acceptance of the Terms, DPA and Privacy Policy, per version.
//
// Pinned: the version the backend enforces is the date the legal pages show;
// registering requires agreeing to the current version and records who did;
// an owner is asked again after a change and only the owner, outside a
// support session, can accept; and the record downloads.
//
// Run: npx tsx scripts/legalVersionTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { prisma } from '../lib/prisma.ts';
import { LEGAL_VERSION } from '../lib/legal.ts';
import { signCompanyToken } from '../services/companyAuth.ts';

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

const REGISTER = `mutation($n:String!,$s:String!,$e:String!,$p:String!,$y:String!,$v:String){
  registerCompany(name:$n,slug:$s,email:$e,password:$p,yourName:$y,legalVersion:$v){ token company{ id } } }`;
const STATUS = '{ companyLegal { currentVersion acceptedVersion needsAcceptance history { version acceptedBy } } }';
const ACCEPT = 'mutation($v:String!){ acceptLegal(version:$v){ needsAcceptance acceptedVersion } }';

await prisma.rateLimitHit.deleteMany({ where: { key: { contains: 'register' } } });
const run = Date.now().toString(36);
const companies: string[] = [];

try {
  console.log('— One version, two places —');
  const front = readFileSync(new URL('../../frontend/src/lib/legal.ts', import.meta.url), 'utf8');
  const shown = front.match(/LAST_UPDATED\s*=\s*'([^']+)'/)?.[1];
  check('the backend enforces the date the legal pages show', shown === LEGAL_VERSION, `${shown} vs ${LEGAL_VERSION}`);

  console.log('— Registering —');
  const vars = (v?: string) => ({ n: 'Legal Test', s: `legal-${run}`, e: `legal-${run}@test.local`, p: 'a-long-enough-password-1', y: 'Lena Legal', v });
  const none = await gql(REGISTER, vars());
  check('without agreeing to a version it is refused', none.errors?.[0]?.extensions?.code === 'LEGAL_VERSION', JSON.stringify(none.errors ?? none.data));
  const old = await gql(REGISTER, vars('2020-01-01'));
  check('with an old version it is refused', old.errors?.[0]?.extensions?.code === 'LEGAL_VERSION');
  check('and no company was made by either', (await prisma.company.count({ where: { slug: { startsWith: `legal-${run}` } } })) === 0);
  const ok = await gql(REGISTER, vars(LEGAL_VERSION));
  const companyId = ok.data?.registerCompany?.company?.id;
  check('with the current version it goes through', !!companyId, JSON.stringify(ok.errors));
  if (companyId) companies.push(companyId);
  const owner = await prisma.companyMember.findFirst({ where: { companyId }, select: { userId: true } });
  const ownerToken = signCompanyToken({ companyUserId: owner!.userId, companyId, role: 'OWNER' });
  const st = (await gql(STATUS, {}, ownerToken)).data?.companyLegal;
  check('the acceptance is recorded with who', st?.acceptedVersion === LEGAL_VERSION && st?.history?.[0]?.acceptedBy === 'Lena Legal', JSON.stringify(st));
  check('and nothing is asked of the owner', st?.needsAcceptance === false);

  console.log('— After a change —');
  await prisma.legalAcceptance.updateMany({ where: { companyId }, data: { version: '2000-01-01' } });
  check('an owner on an older version is asked again', (await gql(STATUS, {}, ownerToken)).data?.companyLegal?.needsAcceptance === true);
  const reviewer = await prisma.companyUser.create({ data: { email: `legal-rev-${run}@test.local`, name: 'Rex', passwordHash: 'x' } });
  await prisma.companyMember.create({ data: { companyId, userId: reviewer.id, role: 'EMPLOYEE_PLUS' } });
  const revToken = signCompanyToken({ companyUserId: reviewer.id, companyId, role: 'EMPLOYEE_PLUS' });
  check('a reviewer cannot accept for the company', !!(await gql(ACCEPT, { v: LEGAL_VERSION }, revToken)).errors?.length);
  const admin = await prisma.admin.findFirst();
  if (admin) {
    const support = signCompanyToken({ companyUserId: owner!.userId, companyId, role: 'OWNER', support: true, adminId: admin.id });
    check('platform support cannot accept for the company', !!(await gql(ACCEPT, { v: LEGAL_VERSION }, support)).errors?.length);
  }
  check('an outdated version cannot be accepted', (await gql(ACCEPT, { v: '2020-01-01' }, ownerToken)).errors?.[0]?.extensions?.code === 'LEGAL_VERSION');
  const accepted = await gql(ACCEPT, { v: LEGAL_VERSION }, ownerToken);
  check('the owner accepts the current version', accepted.data?.acceptLegal?.needsAcceptance === false, JSON.stringify(accepted.errors));
  check('both acceptances are kept', (await prisma.legalAcceptance.count({ where: { companyId } })) === 2);

  console.log('— The record —');
  const rec = await gql('{ legalAcceptanceRecord }', {}, ownerToken);
  check('the owner downloads a PDF', Buffer.from(rec.data?.legalAcceptanceRecord ?? '', 'base64').subarray(0, 4).toString() === '%PDF', JSON.stringify(rec.errors));
  check('a reviewer cannot', !!(await gql('{ legalAcceptanceRecord }', {}, revToken)).errors?.length);
  if (admin) {
    const support = signCompanyToken({ companyUserId: owner!.userId, companyId, role: 'OWNER', support: true, adminId: admin.id });
    check('platform support cannot download it', !!(await gql('{ legalAcceptanceRecord }', {}, support)).errors?.length);
  }
  check('a visitor cannot read the status', !!(await gql(STATUS)).errors?.length);
} finally {
  for (const c of companies) {
    const members = await prisma.companyMember.findMany({ where: { companyId: c }, select: { userId: true } });
    await prisma.legalAcceptance.deleteMany({ where: { companyId: c } });
    await prisma.notification.deleteMany({ where: { companyId: c } });
    await prisma.companyMember.deleteMany({ where: { companyId: c } });
    await prisma.company.delete({ where: { id: c } });
    await prisma.authToken.deleteMany({ where: { userId: { in: members.map(m => m.userId) } } }).catch(() => {});
    await prisma.companyUser.deleteMany({ where: { id: { in: members.map(m => m.userId) } } });
  }
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
