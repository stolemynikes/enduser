// The first passkey ends earlier sessions; deleting a statement needs a factor.
//
//   - Turning on an authenticator app already signed out every other session.
//     A first passkey did not, so someone securing an account because they
//     feared it was compromised left the intruder's session working.
//   - An owner could delete statements — the seller's compliance record —
//     with the session alone, while erasing a buyer's data needed a code.
//
// Registers a real passkey through a software authenticator (attestation
// "none", ES256), so the whole server-side ceremony runs.
//
// Run: npx tsx scripts/firstFactorSessionsTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { encodeCBOR } from '@levischuck/tiny-cbor';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { rpId } from '../lib/passkeys.ts';
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
const b64u = (b: Buffer | Uint8Array) => Buffer.from(b).toString('base64url');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** A registration response from a software authenticator, for these options. */
function softwareRegistration(optionsJson: string) {
  const options = JSON.parse(optionsJson);
  const { publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const cose = encodeCBOR(new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1],
    [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')],
  ]));
  const credId = crypto.randomBytes(16);
  const len = Buffer.alloc(2); len.writeUInt16BE(credId.length);
  const authData = Buffer.concat([
    crypto.createHash('sha256').update(rpId()).digest(),
    Buffer.from([0x41]), // user present, attested credential data included
    Buffer.alloc(4), // signature counter
    Buffer.alloc(16), // AAGUID
    len, credId, Buffer.from(cose),
  ]);
  const attestationObject = encodeCBOR(new Map<string, unknown>([
    ['fmt', 'none'], ['attStmt', new Map()], ['authData', authData],
  ]) as any);
  const host = rpId();
  const origin = host === 'localhost' ? 'http://localhost:5173' : `https://${host}`;
  const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin, crossOrigin: false }));
  return JSON.stringify({
    id: b64u(credId), rawId: b64u(credId), type: 'public-key',
    response: { clientDataJSON: b64u(clientDataJSON), attestationObject: b64u(attestationObject), transports: ['internal'] },
    clientExtensionResults: {},
  });
}

await prisma.rateLimitHit.deleteMany({});
const run = Date.now().toString(36);
const PASSWORD = 'first-factor-sessions-pw';
const hash = await bcrypt.hash(PASSWORD, 4);
const users: string[] = [];
const companies: string[] = [];

try {
  console.log('— A first passkey ends earlier sessions —');
  const u = await prisma.companyUser.create({ data: { email: `ffs-${run}@test.local`, name: 'FFS', passwordHash: hash, emailVerifiedAt: new Date() } });
  users.push(u.id);
  const co = await prisma.company.create({ data: { name: `FFS ${run}`, slug: `ffs-${run}`, approvedAt: new Date() } });
  companies.push(co.id);
  await prisma.companyMember.create({ data: { companyId: co.id, userId: u.id, role: 'OWNER' } });
  const mine = signCompanyToken({ companyUserId: u.id, companyId: co.id, role: 'OWNER' });
  const intruder = signCompanyToken({ companyUserId: u.id, companyId: co.id, role: 'OWNER' });
  await sleep(2100); // past the one-second grace on the session cut-off

  const started = await gql('mutation($p:String){ startPasskeyRegistration(proof:$p){ optionsJson ticket } }', { p: PASSWORD }, mine);
  const opts = started.data?.startPasskeyRegistration;
  check('registration starts with the password', !!opts?.ticket, JSON.stringify(started.errors?.[0]));
  const done = await gql(
    'mutation($t:String!,$r:String!){ finishPasskeyRegistration(ticket:$t, responseJson:$r, name:"Laptop"){ id name token } }',
    { t: opts.ticket, r: softwareRegistration(opts.optionsJson) }, mine,
  );
  const added = done.data?.finishPasskeyRegistration;
  check('the passkey is stored', !!added?.id, JSON.stringify(done.errors?.[0]));
  check('and a replacement session is handed back', typeof added?.token === 'string' && added.token.length > 20);
  const old = await gql('{ myAccount { id } }', {}, intruder);
  check('the earlier session no longer works', !old.data?.myAccount, JSON.stringify(old.data));
  const fresh = await gql('{ myAccount { id } }', {}, added?.token);
  check('the replacement does', fresh.data?.myAccount?.id === u.id, JSON.stringify(fresh.errors?.[0]));

  const step = (await import('../lib/stepUp.ts')).issueStepUp('companyUser', u.id, 'sign-in-methods');
  const again = await gql('mutation($p:String){ startPasskeyRegistration(proof:$p){ optionsJson ticket } }', { p: step }, added.token);
  const done2 = await gql(
    'mutation($t:String!,$r:String!){ finishPasskeyRegistration(ticket:$t, responseJson:$r, name:"Phone"){ id token } }',
    { t: again.data?.startPasskeyRegistration?.ticket, r: softwareRegistration(again.data?.startPasskeyRegistration?.optionsJson) }, added.token,
  );
  check('a second passkey signs nobody out', !!done2.data?.finishPasskeyRegistration?.id && done2.data.finishPasskeyRegistration.token === null, JSON.stringify(done2.errors?.[0] ?? done2.data));

  console.log('— Deleting a statement needs a current factor —');
  const sub = () => prisma.submission.create({
    data: {
      companyId: co.id, email: 'd@test.local', orderNumber: '', firstName: 'D', lastName: 'E', street: '', zipCode: '',
      place: '', country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED',
    },
  });
  const DEL = 'mutation($id:ID!,$c:String!){ deleteCompanySubmission(id:$id, credential:$c) }';
  const s1 = await sub();
  const pk = await gql(DEL, { id: s1.id, c: '' }, added.token);
  check('a passkey account is asked for its passkey', code(pk) === 'STEP_UP_REQUIRED' && pk.errors[0].extensions.method === 'passkey', JSON.stringify(pk.errors?.[0]));
  check('and nothing was deleted', (await prisma.submission.count({ where: { id: s1.id } })) === 1);
  const viaStep = await gql(DEL, { id: s1.id, c: (await import('../lib/stepUp.ts')).issueStepUp('companyUser', u.id, 'delete-statement') }, added.token);
  check('with the passkey step-up it is deleted', viaStep.data?.deleteCompanySubmission === true && (await prisma.submission.count({ where: { id: s1.id } })) === 0, JSON.stringify(viaStep.errors?.[0]));

  // The same owner with an authenticator app too: the code is what is asked for.
  await startEnrolment('companyUser', u.id, u.email);
  const st = await prisma.companyUser.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
  const secret = decryptField(st!.totpSecret!, 'totpSecret');
  await confirmEnrolment('companyUser', u.id, totp(secret));
  const t3 = signCompanyToken({ companyUserId: u.id, companyId: co.id, role: 'OWNER' });
  const s2 = await sub();
  const none = await gql(DEL, { id: s2.id, c: '' }, t3);
  check('on the session alone it is refused', code(none) === 'MFA_REQUIRED' && (await prisma.submission.count({ where: { id: s2.id } })) === 1, JSON.stringify(none.errors?.[0]));
  const wrong = await gql(DEL, { id: s2.id, c: '000000' }, t3);
  check('with a wrong code it is refused', !wrong.data?.deleteCompanySubmission && (await prisma.submission.count({ where: { id: s2.id } })) === 1);
  await prisma.companyUser.update({ where: { id: u.id }, data: { totpLastCounter: null, failedLogins: 0, lockedUntil: null } });
  const right = await gql(DEL, { id: s2.id, c: totp(secret) }, t3);
  check('with a current code it is deleted', right.data?.deleteCompanySubmission === true && (await prisma.submission.count({ where: { id: s2.id } })) === 0, JSON.stringify(right.errors?.[0]));
} finally {
  await prisma.submission.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.passkey.deleteMany({ where: { userId: { in: users } } });
  await prisma.recoveryCode.deleteMany({ where: { userId: { in: users } } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
