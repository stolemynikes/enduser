// Sub-processor announcements.
//
// The DPA promises 30 days' notice of a new sub-processor, by email or in the
// dashboard. Pinned: only the platform admin can announce one; a date closer
// than 30 days is refused, so the promise cannot be broken in a hurry; every
// owner is emailed; companies see the notice but not how many customers the
// platform has.
//
// Run: npx tsx scripts/subprocessorTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.ts';
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
const ANNOUNCE = `mutation($i: SubprocessorNoticeInput!){ announceSubprocessor(input:$i){ id name effectiveAt sent failed } }`;
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const run = Date.now().toString(36);
const input = (effectiveDate: string, name = `Test Provider ${run}`) =>
  ({ i: { name, purpose: 'Sending email', data: 'Recipient address', location: 'France (EU)', effectiveDate } });

const admin = await prisma.admin.findFirst();
if (!admin) { console.log('no admin row'); process.exit(1); }
const adminToken = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
const owner = await prisma.companyUser.create({ data: { email: `sp-${run}@test.local`, name: 'Sam Owner', passwordHash: 'x', emailVerifiedAt: new Date() } });
const company = await prisma.company.create({ data: { name: `SP ${run}`, slug: `sp-${run}`, members: { create: { role: 'OWNER', userId: owner.id } } } });
const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });

try {
  console.log('— Who can announce —');
  check('a visitor cannot', !!(await gql(ANNOUNCE, input(day(40)))).errors?.length);
  check('a company owner cannot', !!(await gql(ANNOUNCE, input(day(40)), ownerToken)).errors?.length);

  console.log('— The 30 days —');
  const soon = await gql(ANNOUNCE, input(day(10)), adminToken);
  check('ten days ahead is refused', soon.errors?.[0]?.extensions?.code === 'BAD_USER_INPUT' && /30 days/.test(soon.errors[0].message), JSON.stringify(soon.errors));
  check('a date in the past is refused', !!(await gql(ANNOUNCE, input(day(-1)), adminToken)).errors?.length);
  check('a malformed date is refused', !!(await gql(ANNOUNCE, input('next month'), adminToken)).errors?.length);
  check('an overlong name is refused', !!(await gql(ANNOUNCE, input(day(40), 'x'.repeat(500)), adminToken)).errors?.length);
  check('none of those was stored', (await prisma.subprocessorNotice.count({ where: { name: { contains: run } } })) === 0);

  const owners = await prisma.companyMember.count({ where: { role: 'OWNER', company: { deletedAt: null } } });
  const ok = await gql(ANNOUNCE, input(day(30)), adminToken);
  const n = ok.data?.announceSubprocessor;
  check('thirty days ahead is accepted', !!n, JSON.stringify(ok.errors));
  check('every owner was emailed (sent or failed, none skipped)', n && n.sent + n.failed === owners, `${n?.sent}+${n?.failed} vs ${owners}`);

  console.log('— What companies see —');
  const seen = await gql('{ subprocessorNotices { id name location effectiveAt } }', {}, ownerToken);
  check('an owner sees the notice', (seen.data?.subprocessorNotices ?? []).some((x: any) => x.id === n?.id), JSON.stringify(seen.errors));
  const leak = await gql('{ subprocessorNotices { id sent failed } }', {}, ownerToken);
  check('but not how many owners were emailed', !!leak.errors?.length);
  check('a visitor sees nothing', !!(await gql('{ subprocessorNotices { id } }')).errors?.length);
  check('only the admin reads the full record', !!(await gql('{ adminSubprocessorNotices { id } }', {}, ownerToken)).errors?.length
    && (await gql('{ adminSubprocessorNotices { id sent } }', {}, adminToken)).data?.adminSubprocessorNotices?.some((x: any) => x.id === n?.id));
} finally {
  await prisma.subprocessorNotice.deleteMany({ where: { name: { contains: run } } });
  await prisma.mailBudget.deleteMany({ where: { kind: 'subprocessor-notice' } });
  await prisma.companyMember.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.companyUser.delete({ where: { id: owner.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
