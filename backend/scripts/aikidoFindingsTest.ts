// Aikido AI code-analysis findings of 19 October 2026, pinned.
//
// Each check names the finding it closes. Run against the API on :3000 (a
// current process — see the stale-server note in DEPLOY.md) and the database.
//
// Run: npx tsx scripts/aikidoFindingsTest.ts
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { formOpen } from '../lib/access.ts';
import { issueToken, consumeToken } from '../lib/authTokens.ts';
import { issueStepUp } from '../lib/stepUp.ts';
import { startEnrolment, confirmEnrolment, checkSecondFactor, MFA_SELECT } from '../lib/mfa.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import { mailBudgetAllows } from '../lib/mailBudget.ts';
import { nameMatchesDocument, policyFailure } from '../lib/diditReconcile.ts';
import { notify } from '../lib/notifications.ts';
import { deleteSubmissions } from '../lib/submissionDelete.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
async function gql(query: string, variables: object = {}, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<any>;
}

await prisma.rateLimitHit.deleteMany({});
const run = Date.now().toString(36);
const hash = await bcrypt.hash('aikido-findings-pw', 4);
const users: string[] = [];
const companies: string[] = [];

async function user(name: string) {
  const u = await prisma.companyUser.create({ data: { email: `ak-${name}-${run}@test.local`, name, passwordHash: hash, emailVerifiedAt: new Date() } });
  users.push(u.id);
  return u;
}
const sub = (companyId: string, extra: object = {}) => prisma.submission.create({
  data: {
    companyId, email: 'b@test.local', orderNumber: '', firstName: 'Bo', lastName: 'Buyer', street: '', zipCode: '',
    place: '', country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED',
    ...extra,
  },
});

try {
  const owner = await user('owner');
  const viewer = await user('viewer');
  const co = await prisma.company.create({ data: { name: `AK ${run}`, slug: `ak-${run}`, approvedAt: new Date(), formConfig: {} } });
  companies.push(co.id);
  await prisma.companyMember.createMany({ data: [
    { companyId: co.id, userId: owner.id, role: 'OWNER' },
    { companyId: co.id, userId: viewer.id, role: 'EMPLOYEE' },
  ] });
  const ownerT = signCompanyToken({ companyUserId: owner.id, companyId: co.id, role: 'OWNER' });
  const viewerT = signCompanyToken({ companyUserId: viewer.id, companyId: co.id, role: 'EMPLOYEE' });

  console.log('— Viewers see decided, non-test statements only —');
  const pending = await sub(co.id);
  const testSub = await sub(co.id, { isTest: true, status: 'APPROVED' });
  const approved = await sub(co.id, { status: 'APPROVED' });
  const list = await gql('query($s:SubmissionStatus,$t:Boolean){ companySubmissions(status:$s, includeTest:$t){ id } }', { s: 'PENDING_REVIEW' }, viewerT);
  check('a viewer asking for pending gets none', Array.isArray(list.data?.companySubmissions) && list.data.companySubmissions.length === 0, JSON.stringify(list.errors?.[0] ?? list.data));
  const tests = await gql('query{ companySubmissions(includeTest:true){ id } }', {}, viewerT);
  check('nor test submissions', (tests.data?.companySubmissions ?? []).every((s: any) => s.id !== testSub.id), JSON.stringify(tests.data));
  const one = await gql('query($id:ID!){ companySubmission(id:$id){ id } }', { id: pending.id }, viewerT);
  check('nor a pending one by id', one.data?.companySubmission === null, JSON.stringify(one.data));
  const decided = await gql('query($id:ID!){ companySubmission(id:$id){ id } }', { id: approved.id }, viewerT);
  check('a decided one it can read', decided.data?.companySubmission?.id === approved.id);
  const counts = await gql('query{ companySubmissionCounts { pending tests } }', {}, viewerT);
  check('and its counts leave the hidden ones out', counts.data?.companySubmissionCounts?.pending === 0 && counts.data.companySubmissionCounts.tests === 0, JSON.stringify(counts.data));
  const ownerOne = await gql('query($id:ID!){ companySubmission(id:$id){ id } }', { id: pending.id }, ownerT);
  check('an owner still reads the pending one', ownerOne.data?.companySubmission?.id === pending.id);

  console.log('— Reading a shared notice marks it read for that person only —');
  const n = await prisma.notification.create({ data: { companyId: co.id, kind: 'SUPPORT_ACCESS', title: 'Support opened your account' } });
  await gql('mutation($ids:[ID!]){ markNotificationsRead(ids:$ids) }', { ids: [n.id] }, viewerT);
  const ownerUnread = await gql('query{ unreadNotificationCount }', {}, ownerT);
  const viewerUnread = await gql('query{ unreadNotificationCount }', {}, viewerT);
  check('the owner still has it unread', ownerUnread.data?.unreadNotificationCount === 1, JSON.stringify(ownerUnread));
  check('the viewer does not', viewerUnread.data?.unreadNotificationCount === 0, JSON.stringify(viewerUnread));

  console.log('— A decision stands until reopened, and its history is kept —');
  const again = await gql('mutation($id:ID!){ denyCompanySubmission(id:$id, reason:"changed my mind"){ id } }', { id: approved.id }, ownerT);
  check('a decided statement cannot be decided again', !again.data?.denyCompanySubmission, JSON.stringify(again.data));
  const ov = await gql('mutation($id:ID!){ overrideCompanySubmissionCheck(id:$id, category: VIES, reason:"x"){ id } }', { id: approved.id }, ownerT);
  check('nor its overrides rewritten', !ov.data?.overrideCompanySubmissionCheck);
  const den = await gql('mutation($id:ID!){ denyCompanySubmission(id:$id, reason:"no licence"){ status } }', { id: pending.id }, ownerT);
  check('a pending one is decided', den.data?.denyCompanySubmission?.status === 'DENIED', JSON.stringify(den.errors?.[0]));
  await gql('mutation($id:ID!){ reopenCompanySubmission(id:$id){ id } }', { id: pending.id }, ownerT);
  const log = await prisma.decisionLog.findMany({ where: { submissionId: pending.id }, orderBy: { at: 'asc' } });
  check('the decision and the reopening are both in the history', log.map(l => l.action).join(',') === 'DENIED,REOPENED', log.map(l => l.action).join(','));

  console.log('— A closing or unconfigured company takes no statements —');
  check('open while approved and configured', await formOpen(co.id));
  await prisma.company.update({ where: { id: co.id }, data: { deletionRequestedAt: new Date() } });
  check('closed once deletion is requested', !(await formOpen(co.id)));
  await prisma.company.update({ where: { id: co.id }, data: { deletionRequestedAt: null, formConfig: null as never } });
  check('closed without a form configuration', !(await formOpen(co.id)));
  await prisma.company.update({ where: { id: co.id }, data: { formConfig: {} } });

  console.log('— A second reset request does not cancel the first link —');
  const first = await issueToken(owner.id, 'PASSWORD_RESET');
  const second = await issueToken(owner.id, 'PASSWORD_RESET');
  check('the first link still works', (await consumeToken(first, 'PASSWORD_RESET')) === owner.id);
  check('and using it spends the second', (await consumeToken(second, 'PASSWORD_RESET')) === null);

  console.log('— A step-up token works only for what it was approved for —');
  const del = await sub(co.id);
  const wrongPurpose = await gql('mutation($id:ID!,$c:String!){ deleteCompanySubmission(id:$id, credential:$c) }',
    { id: del.id, c: issueStepUp('companyUser', owner.id, 'sign-in-methods') }, ownerT);
  check('a sign-in-methods token cannot delete a statement', !wrongPurpose.data?.deleteCompanySubmission && (await prisma.submission.count({ where: { id: del.id } })) === 1, JSON.stringify(wrongPurpose.data));

  console.log('— A session ends twelve hours after its sign-in, however renewed —');
  const old = jwt.sign({ companyUserId: owner.id, companyId: co.id, role: 'OWNER', sid: 'x', auth: Math.floor(Date.now() / 1000) - 13 * 3600 },
    process.env.COMPANY_JWT_SECRET!, { expiresIn: '60m' });
  const stale = await gql('mutation{ refreshSession { token } }', {}, old);
  check('a renewed-but-old session is refused', !stale.data?.refreshSession, JSON.stringify(stale.data));
  const fresh = await gql('mutation{ refreshSession { token } }', {}, ownerT);
  check('a recent one renews', typeof fresh.data?.refreshSession?.token === 'string', JSON.stringify(fresh.errors?.[0]));

  console.log('— One code, one winner —');
  await startEnrolment('companyUser', owner.id, owner.email);
  const st = await prisma.companyUser.findUnique({ where: { id: owner.id }, select: { totpSecret: true } });
  const secret = decryptField(st!.totpSecret!, 'totpSecret');
  await confirmEnrolment('companyUser', owner.id, totp(secret));
  await prisma.companyUser.update({ where: { id: owner.id }, data: { totpLastCounter: null } });
  const acct = await prisma.companyUser.findUnique({ where: { id: owner.id }, select: { id: true, ...MFA_SELECT } });
  const code = totp(secret);
  const results = await Promise.all(Array.from({ length: 5 }, () => checkSecondFactor('companyUser', acct!, code)));
  check('five parallel uses of one code: exactly one accepted', results.filter(r => r.ok).length === 1, JSON.stringify(results));

  console.log('— A burst of mail requests stays inside the budget —');
  const addr = `burst-${run}@test.local`;
  const sent = await Promise.all(Array.from({ length: 10 }, () => mailBudgetAllows(addr, 'reset')));
  const allowed = sent.filter(Boolean).length;
  check('ten at once to one inbox: no more than the budget', allowed <= 3 && allowed >= 1, String(allowed));

  console.log('— Late Didit answers and names —');
  const base = { status: 'APPROVED', documentType: 'PASSPORT', age: 30 } as any;
  check('an adult with a passport passes', policyFailure(base) === null);
  check('an unsupported document fails', policyFailure({ ...base, documentType: null }) !== null);
  check('a minor fails', policyFailure({ ...base, age: 16 }) !== null);
  check('the typed name on the document matches', nameMatchesDocument('José', 'van Dam', 'JOSE MARIA VAN DAM') === true);
  check('a different name does not', nameMatchesDocument('Anna', 'Smit', 'JOSE VAN DAM') === false);
  check('no document, no verdict', nameMatchesDocument('Anna', 'Smit', null) === null);

  console.log('— Erasure is not undone by a notification on its way —');
  const gone = await sub(co.id);
  await deleteSubmissions({ id: gone.id });
  await notify({ companyId: co.id, kind: 'NEW_SUBMISSION' as never, title: 'New', body: 'Bo Buyer', submissionId: gone.id });
  check('a late notice about an erased statement is not kept', (await prisma.notification.count({ where: { submissionId: gone.id } })) === 0);
} finally {
  await prisma.decisionLog.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.submission.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.recoveryCode.deleteMany({ where: { userId: { in: users } } });
  await prisma.authToken.deleteMany({ where: { userId: { in: users } } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
