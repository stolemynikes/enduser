// Passkeys: the parts that are ours.
//
// The cryptography is not tested here, deliberately. Verifying an assertion is
// CBOR decoding, COSE key parsing and signature checking across several
// algorithms, which is why it is delegated to @simplewebauthn/server — the
// opposite call from lib/totp.ts, and for the opposite reason. A full ceremony
// also needs a real authenticator, which a test script does not have.
//
// What is ours is everything around it, and that is where a passkey
// implementation usually goes wrong: the ticket that carries a challenge
// between the two halves, whether a ticket for one purpose can be spent on
// another, whether an assertion for one account can be presented as a sign-in
// for a different one, and whether somebody can strip their own last factor.
//
// Run: npx tsx scripts/passkeyTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { finishAuthentication, finishRegistration, rpId, startAuthentication, startRegistration } from '../lib/passkeys.ts';
import bcrypt from 'bcrypt';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

type Result = { data?: any; errors?: { message: string }[] };
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

(async () => {
  const run = Date.now();
  await prisma.rateLimitHit.deleteMany({});
  const PASSWORD = 'passkey-owner-password';

  const company = await prisma.company.create({
    data: { name: `PK ${run}`, slug: `pk-${run}`, formConfig: {} },
  });
  const owner = await prisma.companyUser.create({
    data: {
      email: `pk-own-${run}@test.local`, name: 'Pat Owner', emailVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: owner.id, role: 'OWNER' } });

  const other = await prisma.companyUser.create({
    data: { email: `pk-other-${run}@test.local`, name: 'Other', passwordHash: 'x' },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: other.id, role: 'EMPLOYEE_PLUS' } });

  const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: company.id, role: 'OWNER' });

  console.log('— The relying party is the deployment, not a guess —');
  check('rpId comes from the configured front-end host',
    rpId() === (process.env.RP_ID
      ?? (process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : 'localhost')),
    rpId());

  console.log('— Registration options —');
  const start = await gql('mutation{ startPasskeyRegistration{ optionsJson ticket } }', undefined, ownerToken);
  const opts = start.data?.startPasskeyRegistration;
  check('starting registration returns options and a ticket', !!opts?.optionsJson && !!opts?.ticket,
    JSON.stringify(start.errors));
  const parsed = opts?.optionsJson ? JSON.parse(opts.optionsJson) : {};
  check('the options name this relying party', parsed?.rp?.id === rpId(), JSON.stringify(parsed?.rp));
  check('the options carry a challenge', typeof parsed?.challenge === 'string' && parsed.challenge.length > 20);
  check('the user handle is the account id, not an email address',
    Buffer.from(String(parsed?.user?.id ?? ''), 'base64url').toString() === owner.id
      || String(parsed?.user?.id ?? '') === owner.id,
    String(parsed?.user?.id));
  check('two ceremonies get different challenges', await (async () => {
    const again = await gql('mutation{ startPasskeyRegistration{ optionsJson } }', undefined, ownerToken);
    const other2 = JSON.parse(again.data?.startPasskeyRegistration?.optionsJson ?? '{}');
    return other2?.challenge !== parsed?.challenge;
  })());

  console.log('— A ticket is bound to its purpose and its account —');
  // The registration ticket must not be spendable as a login, which is what
  // stops a ticket signed with the shared key from being repurposed.
  const asLogin = await finishAuthentication({ ticket: opts.ticket, responseJson: '{"id":"x"}' });
  check('a registration ticket cannot be spent on a login',
    !asLogin.ok && asLogin.reason === 'bad-ticket',
    asLogin.ok ? 'accepted' : (asLogin as { reason: string }).reason);

  const loginChallenge = await startAuthentication('companyUser', owner.id);
  check('an account with no passkey gets no login challenge', loginChallenge === null);

  // Give the account a credential row so a login ceremony can be started.
  await prisma.passkey.create({
    data: {
      userId: owner.id, credentialId: `cred-${run}`,
      publicKey: Buffer.from('not-a-real-key').toString('base64url'),
      counter: 0, name: 'Test key',
    },
  });
  const realChallenge = await startAuthentication('companyUser', owner.id);
  check('an account with a passkey does get one', !!realChallenge?.ticket);
  const authAsRegister = await finishRegistration({
    kind: 'companyUser', id: owner.id, ticket: realChallenge!.ticket,
    responseJson: '{}', name: 'x',
  });
  check('a login ticket cannot be spent on a registration',
    !authAsRegister.ok && authAsRegister.reason === 'bad-ticket',
    authAsRegister.ok ? 'accepted' : (authAsRegister as { reason: string }).reason);

  const crossAccount = await finishRegistration({
    kind: 'companyUser', id: other.id, ticket: opts.ticket,
    responseJson: '{}', name: 'x',
  });
  check('one account cannot finish another account’s registration',
    !crossAccount.ok && crossAccount.reason === 'bad-ticket');

  for (const [label, bad] of [['nonsense', 'not-a-ticket'], ['empty', '']] as const) {
    const r = await finishAuthentication({ ticket: bad, responseJson: '{"id":"x"}' });
    check(`${label === 'empty' ? 'An empty' : 'A nonsense'} ticket is refused`, !r.ok && r.reason === 'bad-ticket');
  }

  console.log('— An assertion for an unknown credential —');
  const unknown = await finishAuthentication({
    ticket: realChallenge!.ticket,
    responseJson: JSON.stringify({ id: 'some-credential-we-never-stored' }),
  });
  check('is refused before any verification is attempted',
    !unknown.ok && unknown.reason === 'unknown-credential',
    unknown.ok ? 'accepted' : (unknown as { reason: string }).reason);

  console.log('— Signing in needs the password first —');
  const BEGIN = `mutation($e:String!,$p:String!){ beginPasskeyLogin(email:$e,password:$p){ ticket } }`;
  const wrongPw = await gql(BEGIN, { e: owner.email, p: 'wrong-password' });
  check('a wrong password gets no challenge', !!wrongPw.errors?.length);
  check('and the message does not mention passkeys',
    !/passkey/i.test(wrongPw.errors?.[0]?.message ?? ''), wrongPw.errors?.[0]?.message);
  const unknownUser = await gql(BEGIN, { e: `nobody-${run}@test.local`, p: PASSWORD });
  check('an unknown address gets the same message as a wrong password',
    unknownUser.errors?.[0]?.message === 'Invalid email or password',
    unknownUser.errors?.[0]?.message);
  await prisma.rateLimitHit.deleteMany({});
  const rightPw = await gql(BEGIN, { e: owner.email, p: PASSWORD });
  check('the right password does get a challenge', !!rightPw.data?.beginPasskeyLogin?.ticket,
    JSON.stringify(rightPw.errors));

  const noKey = await gql(BEGIN, { e: other.email, p: 'x' });
  check('an account without a passkey cannot start the flow', !!noKey.errors?.length);

  console.log('— The last factor cannot be removed —');
  const keyRow = await prisma.passkey.findFirst({ where: { userId: owner.id }, select: { id: true } });
  const lastOne = await gql('mutation($id:ID!){ removePasskey(id:$id) }', { id: keyRow!.id }, ownerToken);
  check('removing the only passkey is refused while there is no app',
    !!lastOne.errors?.length, JSON.stringify(lastOne.data));
  check('and it is still there',
    (await prisma.passkey.count({ where: { userId: owner.id } })) === 1);

  await prisma.passkey.create({
    data: {
      userId: owner.id, credentialId: `cred2-${run}`,
      publicKey: Buffer.from('k2').toString('base64url'), counter: 0, name: 'Second key',
    },
  });
  await prisma.rateLimitHit.deleteMany({});
  const nowFine = await gql('mutation($id:ID!){ removePasskey(id:$id) }', { id: keyRow!.id }, ownerToken);
  check('with two enrolled, one can go', nowFine.data?.removePasskey === true,
    JSON.stringify(nowFine.errors));

  console.log('— Listing is per account —');
  const mine = await gql('{ myPasskeys{ id name } }', undefined, ownerToken);
  check('the owner sees their own', (mine.data?.myPasskeys ?? []).length === 1,
    JSON.stringify(mine.data));
  const otherToken = signCompanyToken({ companyUserId: other.id, companyId: company.id, role: 'EMPLOYEE_PLUS' });
  const theirs = await gql('{ myPasskeys{ id } }', undefined, otherToken);
  check('another account sees none of them', (theirs.data?.myPasskeys ?? []).length === 0);
  const anon = await gql('{ myPasskeys{ id } }');
  check('an unauthenticated caller sees nothing', !!anon.errors?.length);

  console.log('— Cleanup —');
  await prisma.passkey.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
  await prisma.company.delete({ where: { id: company.id } });
  for (const id of [owner.id, other.id]) {
    await prisma.companyUser.delete({ where: { id } }).catch(() => {});
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
