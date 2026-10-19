// Second-factor findings of the pentest of 19 October 2026, pinned.
//
//   - A password alone signed in to an account whose factor is a passkey: the
//     ordinary login only knew about authenticator-app codes.
//   - A session alone could add the first factor, so a stolen session held in
//     the enrol-only state could attach the thief's authenticator.
//   - Enrolment confirmation still worked with the factor already on, without
//     replay protection, handing out fresh recovery codes and a fresh session.
//   - Enrolment codes were not counted against the account.
//
// Run: npx tsx scripts/factorFindingsTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
async function gql(query: string, variables: object = {}, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<any>;
}
const code = (r: any) => r.errors?.[0]?.extensions?.code;

await prisma.rateLimitHit.deleteMany({});
const run = Date.now().toString(36);
const PASSWORD = 'factor-findings-password';
const hash = await bcrypt.hash(PASSWORD, 4);
const passkeyRow = (owner: { userId?: string; adminId?: string }) => ({
  ...owner, credentialId: `cred-${owner.userId ?? owner.adminId}`, publicKey: 'x', counter: 0, name: 'Laptop',
});

const users: string[] = [];
const admins: string[] = [];
const companies: string[] = [];

try {
  console.log('— A passkey account is not signed in to with a password alone —');
  const pkUser = await prisma.companyUser.create({ data: { email: `ff-pk-${run}@test.local`, name: 'PK', passwordHash: hash, emailVerifiedAt: new Date() } });
  users.push(pkUser.id);
  const co = await prisma.company.create({ data: { name: `FF ${run}`, slug: `ff-${run}`, approvedAt: new Date() } });
  companies.push(co.id);
  await prisma.companyMember.create({ data: { companyId: co.id, userId: pkUser.id, role: 'OWNER' } });
  await prisma.passkey.create({ data: passkeyRow({ userId: pkUser.id }) as any });

  const cl = await gql('mutation($e:String!,$p:String!){ companyLogin(email:$e,password:$p){ token } }', { e: pkUser.email, p: PASSWORD });
  check('company login refuses and asks for the passkey', !cl.data?.companyLogin && code(cl) === 'PASSKEY_REQUIRED', JSON.stringify(cl.errors?.[0] ?? cl.data));
  const cl2 = await gql('mutation($e:String!,$p:String!){ companyLogin(email:$e,password:$p,totp:"123456"){ token } }', { e: pkUser.email, p: PASSWORD });
  check('a typed code does not get around it', !cl2.data?.companyLogin, JSON.stringify(cl2.data));
  const after = await prisma.companyUser.findUnique({ where: { id: pkUser.id }, select: { failedLogins: true } });
  check('a right password is not counted as a failure', after?.failedLogins === 0, String(after?.failedLogins));
  const begin = await gql('mutation($e:String!,$p:String!){ beginPasskeyLogin(email:$e,password:$p){ ticket } }', { e: pkUser.email, p: PASSWORD });
  check('the passkey sign-in still starts', !!begin.data?.beginPasskeyLogin?.ticket, JSON.stringify(begin.errors?.[0]));

  const pkAdmin = await prisma.admin.create({ data: { username: `ff-pk-${run}`, password: hash } });
  admins.push(pkAdmin.id);
  await prisma.passkey.create({ data: passkeyRow({ adminId: pkAdmin.id }) as any });
  const al = await gql('mutation($u:String!,$p:String!){ adminLogin(username:$u,password:$p){ token } }', { u: pkAdmin.username, p: PASSWORD });
  check('admin login refuses and asks for the passkey', !al.data?.adminLogin && code(al) === 'PASSKEY_REQUIRED', JSON.stringify(al.errors?.[0] ?? al.data));

  // An account without any factor still signs in (and is sent to enrol when
  // one is required) — the fix must not lock out new accounts.
  const bare = await prisma.companyUser.create({ data: { email: `ff-bare-${run}@test.local`, name: 'Bare', passwordHash: hash, emailVerifiedAt: new Date() } });
  users.push(bare.id);
  await prisma.companyMember.create({ data: { companyId: co.id, userId: bare.id, role: 'EMPLOYEE' } });
  const bl = await gql('mutation($e:String!,$p:String!){ companyLogin(email:$e,password:$p){ token } }', { e: bare.email, p: PASSWORD });
  check('an account with no factor still signs in', !!bl.data?.companyLogin?.token, JSON.stringify(bl.errors?.[0]));

  console.log('— The first factor needs the password —');
  const bareToken = signCompanyToken({ companyUserId: bare.id, companyId: co.id, role: 'EMPLOYEE' });
  const s1 = await gql('mutation{ startPasskeyRegistration { ticket } }', {}, bareToken);
  check('a passkey is not added on the session alone', !s1.data?.startPasskeyRegistration && s1.errors?.[0]?.extensions?.method === 'password', JSON.stringify(s1.errors?.[0]));
  const adminBare = await prisma.admin.create({ data: { username: `ff-bare-${run}`, password: hash } });
  admins.push(adminBare.id);
  const adminToken = jwt.sign({ adminId: adminBare.id }, process.env.JWT_SECRET!, { expiresIn: '10m', algorithm: 'HS256' });
  const s2 = await gql('mutation{ startAdminMfaEnrolment { secret } }', {}, adminToken);
  check('nor an admin app', !s2.data?.startAdminMfaEnrolment && s2.errors?.[0]?.extensions?.method === 'password', JSON.stringify(s2.errors?.[0]));
  const s3 = await gql('mutation($p:String){ startAdminPasskeyRegistration(proof:$p){ ticket } }', { p: 'guess' }, adminToken);
  check('nor an admin passkey with a wrong password', !s3.data?.startAdminPasskeyRegistration);
  const s4 = await gql('mutation($p:String){ startAdminMfaEnrolment(proof:$p){ secret } }', { p: PASSWORD }, adminToken);
  check('with the password, the admin can enrol', !!s4.data?.startAdminMfaEnrolment?.secret, JSON.stringify(s4.errors?.[0]));

  console.log('— Confirmation only while enrolment is pending —');
  await startEnrolment('companyUser', bare.id, bare.email);
  const st = await prisma.companyUser.findUnique({ where: { id: bare.id }, select: { totpSecret: true } });
  const secret = decryptField(st!.totpSecret!, 'totpSecret');
  const first = await confirmEnrolment('companyUser', bare.id, totp(secret));
  check('the pending enrolment confirms', first.ok);
  const fresh = signCompanyToken({ companyUserId: bare.id, companyId: co.id, role: 'EMPLOYEE' });
  const again = await gql('mutation($c:String!){ confirmMfaEnrolment(code:$c){ token recoveryCodes } }', { c: totp(secret) }, fresh);
  check('confirming again with the factor on is refused', !again.data?.confirmMfaEnrolment, JSON.stringify(again.data));
  const codesLeft = await prisma.recoveryCode.count({ where: { userId: bare.id, usedAt: null } });
  check('and issued no new recovery codes', codesLeft === 10, String(codesLeft));

  console.log('— Enrolment codes are counted against the account —');
  const counted = await prisma.companyUser.create({ data: { email: `ff-count-${run}@test.local`, name: 'Count', passwordHash: hash, emailVerifiedAt: new Date() } });
  users.push(counted.id);
  await startEnrolment('companyUser', counted.id, counted.email);
  for (let i = 0; i < 3; i++) await confirmEnrolment('companyUser', counted.id, '000000');
  const c = await prisma.companyUser.findUnique({ where: { id: counted.id }, select: { failedLogins: true } });
  check('wrong enrolment codes are counted', c?.failedLogins === 3, String(c?.failedLogins));
  let locked = false;
  for (let i = 0; i < 10 && !locked; i++) {
    try { await confirmEnrolment('companyUser', counted.id, '000000'); } catch (e: any) { locked = /Too many failed attempts/.test(e?.message ?? ''); }
  }
  check('and lock the account like any other code', locked);
} finally {
  await prisma.passkey.deleteMany({ where: { OR: [{ userId: { in: users } }, { adminId: { in: admins } }] } });
  await prisma.recoveryCode.deleteMany({ where: { OR: [{ userId: { in: users } }, { adminId: { in: admins } }] } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.admin.deleteMany({ where: { id: { in: admins } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
