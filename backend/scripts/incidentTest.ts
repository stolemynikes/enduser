// Incident notices to company owners.
//
// Pinned: only the platform admin can send one; a too-short message, no
// recipients or an unknown company is refused and nothing is stored or sent;
// listing companies reaches only their owners; and what the admin types
// cannot become markup in the email.
//
// Run: npx tsx scripts/incidentTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import jwt from 'jsonwebtoken';

// The rendering check below reads the message instead of sending it.
process.env.MAIL_PREVIEW = '1';
const { prisma } = await import('../lib/prisma.ts');
const { signCompanyToken } = await import('../services/companyAuth.ts');
const { sendIncidentNotice } = await import('../services/email.ts');

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
const NOTIFY = 'mutation($i: IncidentNoticeInput!){ notifyIncident(input:$i){ id companies sent failed allCompanies } }';
const run = Date.now().toString(36);
const subject = `Test incident ${run}`;
const message = 'On 3 November an error let one seller see another seller\'s statement list for ten minutes.';

const admin = await prisma.admin.findFirst();
if (!admin) { console.log('no admin row'); process.exit(1); }
const adminToken = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
const users: string[] = [];
const companies: string[] = [];
async function company(tag: string, owners: number) {
  const c = await prisma.company.create({ data: { name: `Inc ${tag} ${run}`, slug: `inc-${tag}-${run}` } });
  companies.push(c.id);
  for (let i = 0; i < owners; i++) {
    const u = await prisma.companyUser.create({ data: { email: `inc-${tag}-${i}-${run}@test.local`, name: `Owner ${i}`, passwordHash: 'x' } });
    users.push(u.id);
    await prisma.companyMember.create({ data: { companyId: c.id, userId: u.id, role: 'OWNER' } });
  }
  return c;
}

try {
  const a = await company('a', 2);
  const b = await company('b', 1);
  await company('c', 1);
  const ownerToken = signCompanyToken({ companyUserId: users[0], companyId: a.id, role: 'OWNER' });

  console.log('— Who can send —');
  const input = { subject, message, allCompanies: false, slugs: [a.slug, b.slug] };
  check('a visitor cannot', !!(await gql(NOTIFY, { i: input })).errors?.length);
  check('a company owner cannot', !!(await gql(NOTIFY, { i: input }, ownerToken)).errors?.length);

  console.log('— Refused input —');
  check('a too-short message is refused', !!(await gql(NOTIFY, { i: { ...input, message: 'short' } }, adminToken)).errors?.length);
  check('no companies and not "all" is refused', !!(await gql(NOTIFY, { i: { ...input, slugs: [] } }, adminToken)).errors?.length);
  const unknown = await gql(NOTIFY, { i: { ...input, slugs: [a.slug, `nope-${run}`] } }, adminToken);
  check('an unknown company is refused by name', !!unknown.errors?.[0]?.message?.includes(`nope-${run}`), JSON.stringify(unknown.errors));
  check('nothing was stored for those', (await prisma.incidentNotice.count({ where: { subject } })) === 0);

  console.log('— Reaching the listed companies —');
  const ok = await gql(NOTIFY, { i: input }, adminToken);
  const n = ok.data?.notifyIncident;
  check('the admin sends to the two listed companies', n?.companies === 2, JSON.stringify(ok.errors ?? n));
  check('all three of their owners are reached, and the third company is not', n && n.sent + n.failed === 3, `${n?.sent}+${n?.failed}`);
  check('the send is recorded', (await prisma.incidentNotice.count({ where: { subject } })) === 1);
  check('only the admin can read the record', !!(await gql('{ adminIncidentNotices { id } }', {}, ownerToken)).errors?.length);

  console.log('— The message stays text —');
  const info: any = await sendIncidentNotice('x@test.local', '<b>Name</b>', 'Co <i>', 'Subject', 'Hello <script>alert(1)</script>\n\nSecond <a href="x">paragraph</a>');
  const html: string = JSON.parse(info.message).html;
  check('a script tag is escaped', !html.includes('<script>') && html.includes('&lt;script&gt;'));
  check('a link is escaped', !html.includes('<a href="x">') && html.includes('&lt;a href=&quot;x&quot;&gt;'));
  check('the name is escaped', !html.includes('<b>Name</b>'));
  check('paragraphs are kept', (html.match(/<p>/g) ?? []).length >= 4);
} finally {
  await prisma.incidentNotice.deleteMany({ where: { subject } });
  await prisma.mailBudget.deleteMany({ where: { kind: 'incident-notice' } });
  for (const c of companies) {
    await prisma.companyMember.deleteMany({ where: { companyId: c } });
    await prisma.company.delete({ where: { id: c } });
  }
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
