// Admin health page tests.
//
// The page shows platform health as counts. What matters: only a platform
// admin can read it — not a visitor, not a company owner, not an owner's token
// with a forged role — it never returns names or text, its window is bounded,
// and its counts move when the things they count happen.
//
// Run: npx tsx scripts/adminHealthTest.ts   (needs the API on :3000 and the database)
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

const QUERY = `query($d: Int!) { adminHealth(days: $d) {
  days untranslated translationEnabled
  services { service state lastOkAt lastFailAt failStreak }
  checks { kind ok flagged error open overridden }
  didit { started submitted purgedAfterSubmit purgedAbandoned purgedRefused purgeFailed gaveUp stuckInReview }
  mailFailures { kind count }
} }`;

const run = Date.now().toString(36);
const admin = await prisma.admin.findFirst();
if (!admin) { console.log('no admin row — run the seed first'); process.exit(1); }
const adminToken = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });

const owner = await prisma.companyUser.create({ data: { email: `health-${run}@test.local`, passwordHash: 'x', name: 'Owner', emailVerifiedAt: new Date() } });
const company = await prisma.company.create({
  data: { name: 'Health Test BV', slug: `health-${run}`, approvedAt: new Date(), members: { create: { role: 'OWNER', userId: owner.id } } },
});
const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });
const ids: string[] = [];

try {
  console.log('— Who can read it —');
  const anon = await gql(QUERY, { d: 30 });
  check('a visitor cannot', !!anon.errors?.length && !anon.data?.adminHealth);
  const asOwner = await gql(QUERY, { d: 30 }, ownerToken);
  check('a company owner cannot', !!asOwner.errors?.length && !asOwner.data?.adminHealth);
  const forged = jwt.sign({ adminId: admin.id }, 'not-the-secret', { expiresIn: '10m', algorithm: 'HS256' });
  const asForged = await gql(QUERY, { d: 30 }, forged);
  check('a token signed with another secret cannot', !!asForged.errors?.length && !asForged.data?.adminHealth);
  const ownerAsAdmin = jwt.sign({ adminId: owner.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
  const asFake = await gql(QUERY, { d: 30 }, ownerAsAdmin);
  check('a valid signature naming a non-admin cannot', !!asFake.errors?.length && !asFake.data?.adminHealth);

  const before = await gql(QUERY, { d: 30 }, adminToken);
  check('the platform admin can', !!before.data?.adminHealth, JSON.stringify(before.errors));

  console.log('— What it returns —');
  const h = before.data.adminHealth;
  check('every service is listed', ['pubchem', 'wikidata', 'vies', 'didit', 'translate', 'mail'].every(s => h.services.some((x: any) => x.service === s)));
  check('the three checks are listed', ['substance', 'vies', 'identity'].every(k => h.checks.some((c: any) => c.kind === k)));
  const text = JSON.stringify(h);
  check('nothing in it names a company or a buyer', !text.includes('Health Test') && !text.includes('@'));

  console.log('— Bounded window —');
  const huge = await gql(QUERY, { d: 100000 }, adminToken);
  check('a huge window is capped at 365 days', huge.data?.adminHealth?.days === 365, JSON.stringify(huge.errors));
  const neg = await gql(QUERY, { d: -5 }, adminToken);
  check('a negative window becomes one day', neg.data?.adminHealth?.days === 1, JSON.stringify(neg.errors));

  console.log('— Counts move —');
  const base = {
    email: 'h@test.local', orderNumber: '', firstName: 'H', lastName: 'T', street: '', zipCode: '', place: '',
    country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', companyId: company.id,
  };
  ids.push((await prisma.submission.create({ data: { ...base, viesStatus: 'ERROR', substanceCheckStatus: 'FLAGGED' } })).id);
  ids.push((await prisma.submission.create({ data: { ...base, viesStatus: 'VALID', substanceCheckStatus: 'ERROR' } })).id);
  ids.push((await prisma.submission.create({ data: { ...base, viesStatus: 'VALID', substanceCheckStatus: 'OK', isTest: true } })).id);
  await prisma.opsEvent.create({ data: { kind: 'mail-failed', detail: `health-${run}` } });
  const after = (await gql(QUERY, { d: 30 }, adminToken)).data.adminHealth;
  const c = (x: any, k: string) => x.checks.find((y: any) => y.kind === k);
  check('a VIES error is counted', c(after, 'vies').error - c(h, 'vies').error === 1);
  check('a substance flag and error are counted', c(after, 'substance').flagged - c(h, 'substance').flagged === 1 && c(after, 'substance').error - c(h, 'substance').error === 1);
  check('test submissions are not counted', c(after, 'vies').ok - c(h, 'vies').ok === 1, `${c(h, 'vies').ok} → ${c(after, 'vies').ok}`);
  check('a failed email is counted by kind', after.mailFailures.some((m: any) => m.kind === `health-${run}` && m.count === 1));

  console.log('— Service state —');
  const saved = await prisma.serviceHealth.findUnique({ where: { service: 'wikidata' } });
  const { noteService } = await import('../lib/ops.ts');
  const wiki = async () => (await gql(QUERY, { d: 1 }, adminToken)).data.adminHealth.services.find((x: any) => x.service === 'wikidata');
  const settle = () => new Promise(r => setTimeout(r, 300));
  noteService('wikidata', true); await settle();
  check('a success reads as working', (await wiki()).state === 'OK');
  noteService('wikidata', false); await settle();
  const one = await wiki();
  check('one failure reads as failing, with its time', one.state === 'DEGRADED' && !!one.lastFailAt && one.failStreak === 1);
  noteService('wikidata', false); await settle(); noteService('wikidata', false); await settle();
  check('three in a row read as down', (await wiki()).state === 'DOWN');
  noteService('wikidata', true); await settle();
  check('the next success clears it', (await wiki()).state === 'OK');
  if (saved) {
    await prisma.serviceHealth.update({ where: { service: 'wikidata' }, data: { lastOkAt: saved.lastOkAt, lastFailAt: saved.lastFailAt, failStreak: saved.failStreak } });
  } else {
    await prisma.serviceHealth.delete({ where: { service: 'wikidata' } });
  }
} finally {
  await prisma.submission.deleteMany({ where: { id: { in: ids } } });
  await prisma.opsEvent.deleteMany({ where: { detail: `health-${run}` } });
  await prisma.companyMember.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.companyUser.delete({ where: { id: owner.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
