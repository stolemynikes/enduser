// Reading an identity document number, as assertions.
//
// Two claims have to hold together. The number must be genuinely unreachable
// through every ordinary path — not merely absent from the one query somebody
// remembered to redact — and the single call that produces it must demand a
// fresh credential and leave a record. The first claim is the one that rots
// quietly: a new resolver returning a submission would have re-opened it before
// the field resolver in index.ts became the choke point.
//
// Run: npx tsx scripts/revealTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import { startEnrolment, confirmEnrolment } from '../lib/mfa.ts';
import bcrypt from 'bcrypt';

const API = 'http://localhost:3000/graphql';
const NUMBER = 'XK7739182';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

type Result = { data?: any; errors?: { message: string; extensions?: { code?: string } }[] };
async function gql(query: string, variables?: object, token?: string): Promise<Result> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  try { return JSON.parse(text) as Result; }
  catch { return { errors: [{ message: text.slice(0, 160) }] }; }
}

const REVEAL = `mutation($id:ID!,$c:String!){
  revealDocumentNumber(id:$id, credential:$c){ submissionId documentNumber }
}`;

(async () => {
  const run = Date.now();
  await prisma.rateLimitHit.deleteMany({});
  const PASSWORD = 'owner-password-long-enough';

  const company = await prisma.company.create({
    data: { name: `Reveal ${run}`, slug: `reveal-${run}`, formConfig: {} },
  });
  const owner = await prisma.companyUser.create({
    data: {
      email: `rev-own-${run}@test.local`, name: 'Olivia Owner',
      emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: owner.id, role: 'OWNER' } });
  const employee = await prisma.companyUser.create({
    data: { email: `rev-emp-${run}@test.local`, name: 'Eddie Employee', passwordHash: 'x' },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: employee.id, role: 'EMPLOYEE' } });

  // A second tenant, to prove the reveal cannot cross one.
  const other = await prisma.company.create({
    data: { name: `Other ${run}`, slug: `other-${run}`, formConfig: {} },
  });
  const outsider = await prisma.companyUser.create({
    data: { email: `rev-out-${run}@test.local`, name: 'Oscar Outsider', passwordHash: 'x' },
  });
  await prisma.companyMember.create({ data: { companyId: other.id, userId: outsider.id, role: 'OWNER' } });

  const submission = await prisma.submission.create({
    data: {
      companyId: company.id,
      email: `buyer-${run}@test.local`, orderNumber: 'ORD-1', firstName: 'Bea', lastName: 'Buyer',
      street: 'Keizersgracht 241', zipCode: '1016 EA', place: 'Amsterdam', country: 'Netherlands',
      companyName: '', vatNumber: '', buyerType: 'INDIVIDUAL',
      substances: 'Acetone', casNumbers: '67-64-1', statement: 'laboratory solvent use',
      status: 'PENDING_REVIEW', viesStatus: 'NOT_CHECKED',
      idDataCollectedAt: new Date(), idVerificationStatus: 'APPROVED',
      idDocumentNumber: NUMBER, idDocumentName: 'BEA BUYER', idDocumentType: 'PASSPORT',
    },
  });

  const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });
  const empToken = signCompanyToken({ companyUserId: employee.id, companyId: company.id, role: 'EMPLOYEE' });
  const outToken = signCompanyToken({ companyUserId: outsider.id, companyId: other.id, role: 'OWNER' });

  console.log('— The number does not travel with any query —');
  const queries: [string, string][] = [
    ['the queue', `{ companySubmissions(limit:50){ id idDocumentNumber } }`],
    ['a filtered queue', `{ companySubmissions(limit:50, status: PENDING_REVIEW){ id idDocumentNumber } }`],
  ];
  for (const [label, q] of queries) {
    const r = await gql(q, undefined, ownerToken);
    const rows = r.data?.companySubmissions ?? [];
    check(`${label} reports it as null`,
      rows.length > 0 && rows.every((row: any) => row.idDocumentNumber === null),
      JSON.stringify(rows.map((x: any) => x.idDocumentNumber)));
  }

  // Mutations return a submission too, and those are the paths a redaction
  // added per-resolver would have missed.
  const viaMutation = await gql(
    `mutation($id:ID!){ reopenCompanySubmission(id:$id){ id idDocumentNumber } }`,
    { id: submission.id }, ownerToken);
  check('a mutation that returns a submission reports it as null',
    viaMutation.data?.reopenCompanySubmission?.idDocumentNumber === null,
    JSON.stringify(viaMutation.errors ?? viaMutation.data));

  const override = await gql(
    `mutation($id:ID!){ recheckCompanySubmissionSubstance(id:$id){ id idDocumentNumber } }`,
    { id: submission.id }, ownerToken);
  check('so does the substance re-check',
    override.data?.recheckCompanySubmissionSubstance?.idDocumentNumber === null
      || !!override.errors?.length,
    JSON.stringify(override.errors ?? override.data));

  console.log('— Without a second factor, the number stays closed —');
  const noCred = await gql(REVEAL, { id: submission.id, c: '' }, ownerToken);
  check('an empty credential is refused', !!noCred.errors?.length, JSON.stringify(noCred.data));
  const byPassword = await gql(REVEAL, { id: submission.id, c: PASSWORD }, ownerToken);
  check('the password is not accepted in place of a second factor', !!byPassword.errors?.length,
    JSON.stringify(byPassword.data));
  check('the refusal asks for two-factor to be set up',
    byPassword.errors?.[0]?.extensions?.code === 'MFA_SETUP_REQUIRED',
    JSON.stringify(byPassword.errors?.[0]?.extensions));
  check('and nothing was recorded for the refused attempts',
    (await prisma.revealLog.count({ where: { submissionId: submission.id } })) === 0);

  console.log('— Roles and tenants —');
  const byEmployee = await gql(REVEAL, { id: submission.id, c: PASSWORD }, empToken);
  check('a plain Employee cannot reveal at all', !!byEmployee.errors?.length,
    JSON.stringify(byEmployee.data));
  const byOutsider = await gql(REVEAL, { id: submission.id, c: PASSWORD }, outToken);
  check('an owner of another company cannot reveal it', !!byOutsider.errors?.length,
    JSON.stringify(byOutsider.data));
  const anon = await gql(REVEAL, { id: submission.id, c: PASSWORD });
  check('an unauthenticated caller cannot reveal it', !!anon.errors?.length);
  check('none of those three were recorded as a reveal',
    (await prisma.revealLog.count({ where: { submissionId: submission.id } })) === 0);

  console.log('— With a second factor —');
  await startEnrolment('companyUser', owner.id, owner.email);
  const stored = await prisma.companyUser.findUnique({
    where: { id: owner.id }, select: { totpSecret: true },
  });
  const secret = decryptField(stored!.totpSecret!, 'totpSecret');
  await confirmEnrolment('companyUser', owner.id, totp(secret));
  // Enabling the factor ended the old sessions, so this one is reissued.
  const freshToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });

  const stillPassword = await gql(REVEAL, { id: submission.id, c: PASSWORD }, freshToken);
  check('the password is still not accepted', !!stillPassword.errors?.length,
    JSON.stringify(stillPassword.data));
  await prisma.companyUser.update({ where: { id: owner.id }, data: { totpLastCounter: null } });
  const byCode = await gql(REVEAL, { id: submission.id, c: totp(secret) }, freshToken);
  check('a code from the app is', byCode.data?.revealDocumentNumber?.documentNumber === NUMBER,
    JSON.stringify(byCode.errors ?? byCode.data));
  const replay = await gql(REVEAL, { id: submission.id, c: totp(secret) }, freshToken);
  check('the same code cannot be used for a second reveal', !!replay.errors?.length,
    JSON.stringify(replay.data));

  console.log('— The log —');
  const log = await gql('{ revealLog(limit:10){ submissionId userName bySupport at } revealsToday }',
    undefined, freshToken);
  const entries = log.data?.revealLog ?? [];
  check('the owner can read the log', entries.length === 1, `${entries.length}: ${JSON.stringify(log.errors)}`);
  check('the entry names who looked', entries[0]?.userName === 'Olivia Owner', entries[0]?.userName);
  check('and is not marked as support access', entries[0]?.bySupport === false);
  check('the day count agrees', log.data?.revealsToday === 1, String(log.data?.revealsToday));
  const empLog = await gql('{ revealLog(limit:10){ id } }', undefined, empToken);
  check('an Employee cannot read the log', !!empLog.errors?.length);
  const otherLog = await gql('{ revealLog(limit:10){ submissionId } }', undefined, outToken);
  check('another company sees none of it',
    (otherLog.data?.revealLog ?? []).length === 0, JSON.stringify(otherLog.data));

  console.log('— The platform admin has its own gated path —');
  // Closing the seller's path and leaving the admin with none meant nobody
  // could produce the number at all, which an Article 9 report landing on the
  // platform would need.
  const ADMIN_REVEAL = `mutation($id:ID!,$c:String!){
    revealSubmissionDocumentNumber(id:$id, credential:$c){ documentNumber }
  }`;
  const asSeller = await gql(ADMIN_REVEAL, { id: submission.id, c: PASSWORD }, freshToken);
  check('a seller token cannot use the admin path', !!asSeller.errors?.length,
    JSON.stringify(asSeller.data));
  const asAnon = await gql(ADMIN_REVEAL, { id: submission.id, c: PASSWORD });
  check('and neither can an unauthenticated caller', !!asAnon.errors?.length);

  console.log('— Retention does not outlive what it describes —');
  const { pruneRevealLog } = await import('../lib/reveal.ts');
  await prisma.revealLog.updateMany({
    where: { companyId: company.id },
    data: { at: new Date(Date.now() - 19 * 30 * 24 * 60 * 60 * 1000) },
  });
  const pruned = await pruneRevealLog(18);
  check('rows past eighteen months are dropped', pruned >= 1, String(pruned));
  check('and the log is empty afterwards',
    (await prisma.revealLog.count({ where: { companyId: company.id } })) === 0);

  console.log('— Cleanup —');
  await prisma.revealLog.deleteMany({ where: { companyId: company.id } });
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.company.delete({ where: { id: other.id } });
  for (const id of [owner.id, employee.id, outsider.id]) {
    await prisma.companyUser.delete({ where: { id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
