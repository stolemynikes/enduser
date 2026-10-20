// The Aikido retest findings (2026-10-20): the first fixes were judged
// partial. Each check here is the stronger fix.
//
//   - Spent passkey tickets and step-up tokens are recorded in the database,
//     so a restart cannot make a spent one good again.
//   - A step-up's purpose is fixed when its challenge starts.
//   - The decision history is complete in itself, encrypted, and is what
//     Activity reads: a reopened statement keeps its earlier decision.
//   - On a verified document, the document's name is the buyer's name.
//   - The identity check's details are sealed, not stored in plain columns.
//
// Run: npx tsx scripts/retestFindingsTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { consumeStepUp, issueStepUp } from '../lib/stepUp.ts';
import { startAuthentication, finishAuthentication } from '../lib/passkeys.ts';
import { decideSubmission, reopenSubmission, applyOverride } from '../lib/overrides.ts';
import { verifiedName } from '../lib/diditReconcile.ts';

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
const users: string[] = [];
const companies: string[] = [];

try {
  const u = await prisma.companyUser.create({ data: { email: `rt-${run}@test.local`, name: 'Rita Retest', passwordHash: 'x', emailVerifiedAt: new Date() } });
  users.push(u.id);
  const co = await prisma.company.create({ data: { name: `RT ${run}`, slug: `rt-${run}`, approvedAt: new Date() } });
  companies.push(co.id);
  await prisma.companyMember.create({ data: { companyId: co.id, userId: u.id, role: 'OWNER' } });
  const token = signCompanyToken({ companyUserId: u.id, companyId: co.id, role: 'OWNER' });

  console.log('— Spent credentials are recorded durably —');
  const step = issueStepUp('companyUser', u.id, 'buyer-data');
  check('a step-up token works once', await consumeStepUp(step, 'companyUser', u.id, 'buyer-data'));
  const jti = JSON.parse(Buffer.from(step.slice(3).split('.')[1], 'base64url').toString()).jti;
  check('its use is in the database, where a restart cannot lose it', (await prisma.spentToken.count({ where: { jti } })) === 1);
  check('and it is refused the second time', !(await consumeStepUp(step, 'companyUser', u.id, 'buyer-data')));

  console.log('— A step-up purpose is fixed at the start —');
  await prisma.passkey.create({
    data: { userId: u.id, credentialId: `rt-${run}`, publicKey: 'x', counter: 0, name: 'Key' } as any,
  });
  const started = await startAuthentication('companyUser', u.id, 'step-up:sign-in-methods');
  const swapped = await finishAuthentication({ ticket: started!.ticket, responseJson: '{"id":"x"}', scope: 'step-up:delete-statement' });
  check('a challenge for one purpose cannot finish as another', !swapped.ok && swapped.reason === 'bad-ticket', JSON.stringify(swapped));
  const noPurpose = await gql('mutation { startStepUp { ticket } }', {}, token);
  check('starting one without a purpose is refused', !!noPurpose.errors?.length);
  const unknown = await gql('mutation { startStepUp(purpose: "everything") { ticket } }', {}, token);
  check('so is an unknown purpose', !!unknown.errors?.length && /Unknown step-up purpose/.test(unknown.errors[0].message));

  console.log('— The decision history is complete and is what Activity reads —');
  const sub = await prisma.submission.create({
    data: {
      companyId: co.id, email: 'buyer@test.local', orderNumber: `RT-${run}`, firstName: 'Bo', lastName: 'Buyer', street: '', zipCode: '',
      place: '', country: '', companyName: '', vatNumber: 'NL000', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'INVALID',
    },
  });
  const me = { id: u.id, name: 'Rita Retest' };
  await decideSubmission(sub.id, co.id, 'DENIED', { adminNote: 'Bo Buyer gave no use', reviewedById: u.id, reviewedByName: me.name, reviewedAt: new Date() });
  await reopenSubmission(sub.id, co.id, me);
  await applyOverride(sub.id, 'VIES', 'Checked by phone', u.id, me.name);
  await decideSubmission(sub.id, co.id, 'APPROVED', { reviewedById: u.id, reviewedByName: me.name, reviewedAt: new Date() });
  const history = await prisma.decisionLog.findMany({ where: { submissionId: sub.id }, orderBy: { at: 'asc' } });
  check('every step is there, in order', history.map(h => h.action).join() === 'DENIED,REOPENED,OVERRIDE,APPROVED', history.map(h => h.action).join());
  check('with the denial\'s note and the override\'s reason', history[0].reason === 'Bo Buyer gave no use' && history[2].reason === 'Checked by phone');
  check('and the status before and after', history[1].fromStatus === 'DENIED' && history[1].toStatus === 'PENDING_REVIEW');
  const raw = await prisma.$queryRaw<{ reason: string | null }[]>`SELECT reason FROM "DecisionLog" WHERE "submissionId" = ${sub.id} AND action = 'DENIED'`;
  check('the reason is encrypted at rest', !!raw[0]?.reason && !raw[0].reason.includes('Bo Buyer'));
  const activity = await gql('{ teamDecisions { total items { decision reason overrides } } }', {}, token);
  const items = activity.data?.teamDecisions?.items ?? [];
  check('Activity shows both decisions, the reopened one included', items.length === 2 && items[0].decision === 'APPROVED' && items[1].decision === 'DENIED', JSON.stringify(activity.errors ?? items));
  check('the approval with the override it rested on, the denial with its reason', items[0]?.overrides === 1 && items[1]?.reason === 'Bo Buyer gave no use');

  console.log('— The verified document decides the buyer\'s name —');
  const doc = { status: 'APPROVED' as const, fullName: 'JAN PIETER DE VRIES', firstName: 'JAN PIETER', lastName: 'DE VRIES' };
  const same = verifiedName(doc, { firstName: 'Jan', lastName: 'de Vries' });
  check('a matching name keeps the buyer\'s spelling', same?.idNameMatches === true && !('firstName' in (same ?? {})));
  const other = verifiedName(doc, { firstName: 'Piet', lastName: 'Jansen' });
  check('a different name is replaced by the document\'s', other?.idNameMatches === false && other.firstName === 'Jan Pieter' && other.lastName === 'De Vries');
  check('and the typed one is kept apart', other?.submittedFirstName === 'Piet' && other.submittedLastName === 'Jansen');
  check('an unverified document decides nothing', verifiedName({ ...doc, status: 'IN_REVIEW' as any }, { firstName: 'Piet', lastName: 'Jansen' }) === null);

  console.log('— The identity check\'s details are sealed —');
  const id = await prisma.submission.create({
    data: {
      companyId: co.id, email: 'id@test.local', orderNumber: '', firstName: 'I', lastName: 'D', street: '', zipCode: '', place: '', country: '',
      companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED',
      submittedFirstName: 'Typed', idDocumentType: 'PASSPORT', idDocumentExpiry: new Date('2031-05-01T00:00:00Z'), idLivenessPassed: true, idFaceMatch: true,
    },
  });
  const cols = await prisma.$queryRaw<any[]>`
    SELECT "idDocumentType", "idDocumentExpiry", "idLivenessPassed", "idFaceMatch", "idCheckSealed", "submittedFirstName" FROM "Submission" WHERE id = ${id.id}`;
  check('the plain columns stay empty', cols[0].idDocumentType === null && cols[0].idDocumentExpiry === null && cols[0].idLivenessPassed === null && cols[0].idFaceMatch === null);
  check('the sealed value is ciphertext', typeof cols[0].idCheckSealed === 'string' && !cols[0].idCheckSealed.includes('PASSPORT'));
  check('the typed name is encrypted too', typeof cols[0].submittedFirstName === 'string' && cols[0].submittedFirstName !== 'Typed');
  const back = await prisma.submission.findUnique({ where: { id: id.id } });
  check('reading gives the values back', back?.idDocumentType === 'PASSPORT' && back.idLivenessPassed === true && back.idDocumentExpiry?.toISOString().startsWith('2031-05-01') && back.submittedFirstName === 'Typed');
  await prisma.submission.update({ where: { id: id.id }, data: { idFaceMatch: false } });
  const partial = await prisma.submission.findUnique({ where: { id: id.id }, select: { idFaceMatch: true, idLivenessPassed: true, idDocumentType: true } });
  check('a partial update keeps the rest', partial?.idFaceMatch === false && partial.idLivenessPassed === true && partial.idDocumentType === 'PASSPORT', JSON.stringify(partial));
} finally {
  await prisma.decisionLog.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.submission.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.passkey.deleteMany({ where: { userId: { in: users } } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
