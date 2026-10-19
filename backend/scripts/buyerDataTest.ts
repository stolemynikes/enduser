// Buyer data requests: the access export and the erasure.
//
// Both hand over or destroy a buyer's whole history at one seller, so the
// cases that matter are the refusals: nobody outside the seller, no plain
// viewer, no other seller, no support session, no stolen session without a
// fresh second-factor code, and no reviewer erasing. Then what is included:
// every statement of this buyer here — matched by email in any case or
// spacing, and by identity document — and nothing of other buyers or of the
// same buyer at another seller; the document number masked; no staff names.
// The erasure must take the notifications naming the buyer with it, and both
// actions must be written down.
//
// Run: npx tsx scripts/buyerDataTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { startEnrolment, confirmEnrolment } from '../lib/mfa.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import { documentKey } from '../lib/matchKeys.ts';
import { notify } from '../lib/notifications.ts';

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
const EXPORT = 'mutation($id:ID!,$c:String!){ exportBuyerData(id:$id, credential:$c){ filename pdfBase64 json statements } }';
const ERASE = 'mutation($id:ID!,$c:String!){ eraseBuyerData(id:$id, credential:$c) }';

const run = Date.now().toString(36);
await prisma.rateLimitHit.deleteMany({});
const NUMBER = `NL${run.toUpperCase().slice(-7)}`;
const created: { companies: string[]; users: string[] } = { companies: [], users: [] };

async function member(companyId: string, role: 'OWNER' | 'EMPLOYEE_PLUS' | 'EMPLOYEE', name: string, withFactor: boolean) {
  const user = await prisma.companyUser.create({
    data: { email: `bd-${role.toLowerCase()}-${run}-${companyId.slice(-4)}@test.local`, name, emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash('long-enough-password', 4) },
  });
  created.users.push(user.id);
  await prisma.companyMember.create({ data: { companyId, userId: user.id, role } });
  let secret: string | null = null;
  if (withFactor) {
    await startEnrolment('companyUser', user.id, user.email);
    const stored = await prisma.companyUser.findUnique({ where: { id: user.id }, select: { totpSecret: true } });
    secret = decryptField(stored!.totpSecret!, 'totpSecret');
    await confirmEnrolment('companyUser', user.id, totp(secret));
  }
  const token = signCompanyToken({ companyUserId: user.id, companyId, role });
  // Each use needs a code the account has not spent yet; tests run inside one 30s window.
  const code = async () => {
    await prisma.companyUser.update({ where: { id: user.id }, data: { totpLastCounter: null } });
    return totp(secret!);
  };
  return { user, token, code };
}

try {
  const a = await prisma.company.create({ data: { name: `Seller A ${run}`, slug: `bd-a-${run}`, approvedAt: new Date() } });
  const b = await prisma.company.create({ data: { name: `Seller B ${run}`, slug: `bd-b-${run}`, approvedAt: new Date() } });
  created.companies.push(a.id, b.id);
  const owner = await member(a.id, 'OWNER', 'Olivia Owner', true);
  const reviewer = await member(a.id, 'EMPLOYEE_PLUS', 'Rita Reviewer', true);
  const viewer = await member(a.id, 'EMPLOYEE', 'Vic Viewer', true);
  const otherOwner = await member(b.id, 'OWNER', 'Otto Other', true);

  const base = {
    orderNumber: 'ORD', firstName: 'Bea', lastName: 'Buyer', street: 'Keizersgracht 1', zipCode: '1016', place: 'Amsterdam',
    country: 'NL', companyName: '', vatNumber: '', buyerType: 'INDIVIDUAL' as const, substances: 'Acetone', casNumbers: '67-64-1',
    statement: 'laboratory solvent', viesStatus: 'NOT_CHECKED' as const,
  };
  const mk = (companyId: string, email: string, extra: Record<string, unknown> = {}) =>
    prisma.submission.create({ data: { ...base, companyId, email, ...extra } as any });
  const s1 = await mk(a.id, `bea-${run}@test.local`, {
    idVerificationStatus: 'APPROVED', idDocumentType: 'PASSPORT', idDocumentNumber: NUMBER, idDocumentName: 'BEA BUYER',
    idDocumentNumberHash: documentKey(a.id, NUMBER), status: 'DENIED', adminNote: 'Use not plausible', reviewedByName: 'Rita Reviewer', reviewedAt: new Date(),
  });
  const s2 = await mk(a.id, `  BEA-${run}@Test.Local `);
  const s3 = await mk(a.id, `bea.other-${run}@test.local`, { idDocumentNumber: NUMBER, idDocumentNumberHash: documentKey(a.id, NUMBER) });
  const s4 = await mk(a.id, `someone-else-${run}@test.local`, { firstName: 'Sam' });
  const sB = await mk(b.id, `bea-${run}@test.local`);
  await notify({ companyId: a.id, kind: 'SUBMISSION_RECEIVED', title: 'New end-user statement', body: `From Bea Buyer ${run} — waiting for review.`, submissionId: s1.id });

  console.log('— Notifications are encrypted at rest —');
  const raw = await prisma.$queryRawUnsafe<{ body: string }[]>(`SELECT body FROM "Notification" WHERE "submissionId" = $1`, s1.id);
  check('the stored body is ciphertext', raw[0]?.body?.startsWith('enc:v2:') === true, raw[0]?.body?.slice(0, 20));
  const shown = await prisma.notification.findFirst({ where: { submissionId: s1.id } });
  check('and reads back as written', shown?.body === `From Bea Buyer ${run} — waiting for review.`);

  console.log('— Who may export —');
  const actions = () => prisma.buyerDataAction.count({ where: { companyId: a.id } });
  check('a visitor cannot', !!(await gql(EXPORT, { id: s1.id, c: '000000' })).errors?.length);
  check('a viewer cannot, even with a code', !!(await gql(EXPORT, { id: s1.id, c: await viewer.code() }, viewer.token)).errors?.length);
  check('another seller\'s owner cannot', !!(await gql(EXPORT, { id: s1.id, c: await otherOwner.code() }, otherOwner.token)).errors?.length);
  const noCode = await gql(EXPORT, { id: s1.id, c: '' }, owner.token);
  check('the owner cannot without a code', !!noCode.errors?.length);
  check('nor with a wrong one', !!(await gql(EXPORT, { id: s1.id, c: '123456' }, owner.token)).errors?.length);
  const admin = await prisma.admin.findFirst();
  if (admin) {
    const support = signCompanyToken({ companyUserId: owner.user.id, companyId: a.id, role: 'OWNER', support: true, adminId: admin.id });
    const bySupport = await gql(EXPORT, { id: s1.id, c: await owner.code() }, support);
    check('a support session cannot', bySupport.errors?.[0]?.message === 'Not available in a support session.', JSON.stringify(bySupport.errors ?? bySupport.data));
  }
  check('none of the refused attempts was recorded', (await actions()) === 0);

  console.log('— What the export holds —');
  const ex = await gql(EXPORT, { id: s1.id, c: await reviewer.code() }, reviewer.token);
  const out = ex.data?.exportBuyerData;
  check('a reviewer with a code gets it', !!out, JSON.stringify(ex.errors));
  const json = out?.json ?? '';
  check('it covers the three statements of this buyer', out?.statements === 3, String(out?.statements));
  check('matched by email in any case or spacing, and by document', [s1, s2, s3].every(s => json.includes(s.id)));
  check('not another buyer at this seller', !json.includes(s4.id) && !json.includes('Sam'));
  check('not the same buyer at another seller', !json.includes(sB.id));
  check('the document number is masked', !json.includes(NUMBER) && json.includes(NUMBER.slice(-3)));
  check('no staff names', !json.includes('Rita Reviewer') && !json.includes('Olivia'));
  check('the reason given for a denial is included', json.includes('Use not plausible'));
  check('the PDF is a PDF', Buffer.from(out?.pdfBase64 ?? '', 'base64').subarray(0, 4).toString() === '%PDF');
  const logged = await prisma.buyerDataAction.findFirst({ where: { companyId: a.id } });
  check('the export is recorded with who and how many, not whom', logged?.kind === 'EXPORT' && logged.statements === 3 && logged.userName === 'Rita Reviewer');

  console.log('— Who may erase —');
  check('a reviewer cannot', !!(await gql(ERASE, { id: s1.id, c: await reviewer.code() }, reviewer.token)).errors?.length);
  check('another seller\'s owner cannot', !!(await gql(ERASE, { id: s1.id, c: await otherOwner.code() }, otherOwner.token)).errors?.length);
  check('the owner cannot without a code', !!(await gql(ERASE, { id: s1.id, c: '' }, owner.token)).errors?.length);
  check('nothing was deleted by those', (await prisma.submission.count({ where: { id: { in: [s1.id, s2.id, s3.id] } } })) === 3);

  console.log('— The erasure —');
  const er = await gql(ERASE, { id: s1.id, c: await owner.code() }, owner.token);
  check('the owner with a code erases three statements', er.data?.eraseBuyerData === 3, JSON.stringify(er.errors ?? er.data));
  check('they are gone', (await prisma.submission.count({ where: { id: { in: [s1.id, s2.id, s3.id] } } })) === 0);
  check('the other buyer and the other seller are untouched', (await prisma.submission.count({ where: { id: { in: [s4.id, sB.id] } } })) === 2);
  check('the notification naming the buyer is gone', (await prisma.notification.count({ where: { submissionId: s1.id } })) === 0);
  const erasure = await prisma.buyerDataAction.findFirst({ where: { companyId: a.id, kind: 'ERASURE' } });
  check('the erasure is recorded', erasure?.statements === 3 && erasure.userName === 'Olivia Owner');
} finally {
  for (const c of created.companies) {
    await prisma.notification.deleteMany({ where: { companyId: c } });
    await prisma.submission.deleteMany({ where: { companyId: c } });
    await prisma.buyerDataAction.deleteMany({ where: { companyId: c } });
    await prisma.companyMember.deleteMany({ where: { companyId: c } });
    await prisma.company.delete({ where: { id: c } });
  }
  await prisma.companyUser.deleteMany({ where: { id: { in: created.users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
