// The second factor, end to end over the real API.
//
// scripts/totpTest.ts proves the algorithm against the RFCs. This proves the
// things around it, which is where authentication actually goes wrong: that the
// factor is really required once enabled, that a code cannot be replayed, that
// a recovery code works exactly once, that turning it off needs more than a
// stolen session, and that a wrong code is spent from the same budget as a
// wrong password.
//
// Run: npx tsx scripts/mfaTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import bcrypt from 'bcrypt';

const API = 'http://localhost:3000/graphql';
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
  catch { return { errors: [{ message: text.slice(0, 120) }] }; }
}

const LOGIN = `mutation($e:String!,$p:String!,$t:String){
  companyLogin(email:$e,password:$p,totp:$t){ token role }
}`;
const START = `mutation($p:String){ startMfaEnrolment(proof:$p){ secret otpauthUri qrSvg } }`;
const CONFIRM = `mutation($c:String!){ confirmMfaEnrolment(code:$c){ recoveryCodes token } }`;
const DISABLE = `mutation($p:String!,$c:String!){ disableMfa(password:$p,code:$c) }`;
const REGEN = `mutation($c:String!){ regenerateRecoveryCodes(code:$c){ recoveryCodes } }`;
const ACCOUNT = `{ myAccount{ mfaEnabled recoveryCodesLeft } }`;

const errorCode = (r: Result) => r.errors?.[0]?.extensions?.code ?? null;

/**
 * Clears what the *other* suites are responsible for, so a failure here means
 * the second factor is wrong rather than a neighbouring control firing:
 *
 *  - the IP login limiter (10 per 15 minutes), which this file exhausts
 *  - the account lockout counter
 *  - the recorded TOTP step, so the current code is usable again
 *
 * Only the replay test below deliberately leaves the recorded step in place.
 */
async function freshSlate(userId: string) {
  await prisma.rateLimitHit.deleteMany({});
  await prisma.companyUser.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null, totpLastCounter: null },
  });
}

(async () => {
  const run = Date.now();
  await prisma.rateLimitHit.deleteMany({});
  const PASSWORD = 'a-long-enough-password';
  const email = `mfa-${run}@test.local`;

  const company = await prisma.company.create({
    data: { name: `MFA ${run}`, slug: `mfa-${run}`, formConfig: {} },
  });
  const user = await prisma.companyUser.create({
    data: {
      email, name: 'Owner', emailVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });
  await prisma.companyMember.create({ data: { companyId: company.id, userId: user.id, role: 'OWNER' } });

  console.log('— Before enrolment —');
  const plain = await gql(LOGIN, { e: email, p: PASSWORD });
  check('a password alone signs you in', !!plain.data?.companyLogin?.token, JSON.stringify(plain.errors));
  let token: string = plain.data?.companyLogin?.token;
  const before = await gql(ACCOUNT, undefined, token);
  check('the account reports no second factor', before.data?.myAccount?.mfaEnabled === false);

  console.log('— Enrolment is two steps —');
  // `sessionsValidFrom` is compared against a token's `iat`, which JWT records
  // only to the second, and authContext allows a second of grace on top. So the
  // eviction below can only be asserted for a session that is genuinely older
  // than that window — which is every real one, and none of a test's unless it
  // waits. Waiting here rather than after enrolling, because the pause has to
  // be between the sign-in and the cut-off, not between the cut-off and the
  // check.
  await new Promise(r => setTimeout(r, 2200));
  const started = await gql(START, { p: PASSWORD }, token);
  check('starting returns a secret, a URI and a QR',
    /^[A-Z2-7 ]+$/.test(started.data?.startMfaEnrolment?.secret ?? '')
    && (started.data?.startMfaEnrolment?.otpauthUri ?? '').startsWith('otpauth://totp/')
    && (started.data?.startMfaEnrolment?.qrSvg ?? '').startsWith('data:image/svg+xml;base64,'),
    JSON.stringify(started.errors));

  const stillOff = await gql(ACCOUNT, undefined, token);
  check('a scan alone does not switch it on', stillOff.data?.myAccount?.mfaEnabled === false);
  const midEnrolment = await gql(LOGIN, { e: email, p: PASSWORD });
  check('and sign-in is unaffected until it is confirmed',
    !!midEnrolment.data?.companyLogin?.token);

  // The secret is stored encrypted; read it the way the server does.
  const stored = await prisma.companyUser.findUnique({
    where: { id: user.id }, select: { totpSecret: true },
  });
  check('the secret is not stored in the clear',
    !!stored?.totpSecret && stored.totpSecret.startsWith('enc:'), stored?.totpSecret?.slice(0, 12));
  const secret = decryptField(stored!.totpSecret!, 'totpSecret');

  const wrongConfirm = await gql(CONFIRM, { c: '000000' }, token);
  check('confirming with a wrong code is refused', errorCode(wrongConfirm) === 'MFA_INVALID',
    JSON.stringify(wrongConfirm.errors));

  const confirmed = await gql(CONFIRM, { c: totp(secret) }, token);
  const codes: string[] = confirmed.data?.confirmMfaEnrolment?.recoveryCodes ?? [];
  check('confirming with a real code switches it on and returns 10 recovery codes',
    codes.length === 10, `${codes.length} codes: ${JSON.stringify(confirmed.errors)}`);
  check('the codes are not all the same', new Set(codes).size === 10);

  // Turning the factor on has to end the sessions that existed before it.
  // Without this it protects future sign-ins and leaves an intruder's current
  // 30-day token working — which is the opposite of why someone enables it.
  const replacement: string = confirmed.data?.confirmMfaEnrolment?.token ?? '';
  check('activation hands back a replacement token', !!replacement);

  const evicted = await gql(ACCOUNT, undefined, token);
  check('a session from before the factor was enabled is refused',
    !!evicted.errors?.length, JSON.stringify(evicted.data));
  const after = await gql(ACCOUNT, undefined, replacement);
  check('the replacement token works',
    after.data?.myAccount?.mfaEnabled === true, JSON.stringify(after.errors));
  check('the account reports the factor and the code count',
    after.data?.myAccount?.mfaEnabled === true && after.data?.myAccount?.recoveryCodesLeft === 10);
  token = replacement;

  console.log('— Once on, the factor is required —');
  const noCode = await gql(LOGIN, { e: email, p: PASSWORD });
  check('a password alone no longer signs you in', errorCode(noCode) === 'MFA_REQUIRED',
    JSON.stringify(noCode.errors));
  const badCode = await gql(LOGIN, { e: email, p: PASSWORD, t: '000000' });
  check('a wrong code is refused', errorCode(badCode) === 'MFA_INVALID');
  const badPasswordRightCode = await gql(LOGIN, { e: email, p: 'wrong-password', t: totp(secret) });
  check('a valid code does not make up for a wrong password',
    badPasswordRightCode.errors?.[0]?.message === 'Invalid email or password',
    badPasswordRightCode.errors?.[0]?.message);

  await freshSlate(user.id);
  const good = await gql(LOGIN, { e: email, p: PASSWORD, t: totp(secret) });
  check('password plus code signs you in', !!good.data?.companyLogin?.token, JSON.stringify(good.errors));

  console.log('— A code cannot be used twice —');
  // No freshSlate here: the step just accepted must still be on record, which
  // is the whole point of this check.
  await prisma.rateLimitHit.deleteMany({});
  const replay = await gql(LOGIN, { e: email, p: PASSWORD, t: totp(secret) });
  check('the same code is refused on a second sign-in', errorCode(replay) === 'MFA_INVALID',
    JSON.stringify(replay.errors));
  // One step forward is inside the drift window, so this is the code an app
  // would show thirty seconds later.
  await prisma.rateLimitHit.deleteMany({});
  await prisma.companyUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const moved = await gql(LOGIN, { e: email, p: PASSWORD, t: totp(secret, Date.now() + 30_000) });
  check('the next code works', !!moved.data?.companyLogin?.token, JSON.stringify(moved.errors));

  console.log('— Recovery codes —');
  await freshSlate(user.id);
  const viaRecovery = await gql(LOGIN, { e: email, p: PASSWORD, t: codes[0] });
  check('a recovery code signs you in', !!viaRecovery.data?.companyLogin?.token,
    JSON.stringify(viaRecovery.errors));
  const recoveryToken: string = viaRecovery.data?.companyLogin?.token;
  await prisma.rateLimitHit.deleteMany({});
  const reused = await gql(LOGIN, { e: email, p: PASSWORD, t: codes[0] });
  check('the same recovery code cannot be used again', errorCode(reused) === 'MFA_INVALID');
  const left = await gql(ACCOUNT, undefined, recoveryToken);
  check('one fewer recovery code remains', left.data?.myAccount?.recoveryCodesLeft === 9,
    String(left.data?.myAccount?.recoveryCodesLeft));
  check('no stored row contains a recovery code verbatim',
    (await prisma.recoveryCode.count({
      where: { userId: user.id, codeHash: { contains: codes[1].replace('-', '') } },
    })) === 0);
  const storedCode = await prisma.recoveryCode.findFirst({
    where: { userId: user.id }, select: { codeHash: true },
  });
  check('the digest does not contain the code',
    !!storedCode && !codes.some(c => storedCode.codeHash.includes(c.replace('-', ''))));

  await freshSlate(user.id);
  const regen = await gql(REGEN, { c: totp(secret) }, recoveryToken);
  const fresh: string[] = regen.data?.regenerateRecoveryCodes?.recoveryCodes ?? [];
  check('regenerating returns a new set of 10', fresh.length === 10, JSON.stringify(regen.errors));
  check('the new set is different', !fresh.some(c => codes.includes(c)));
  const afterRegen = await gql(ACCOUNT, undefined, recoveryToken);
  check('the old codes are gone', afterRegen.data?.myAccount?.recoveryCodesLeft === 10);
  await freshSlate(user.id);
  const oldCode = await gql(LOGIN, { e: email, p: PASSWORD, t: codes[2] });
  check('an old recovery code no longer works', errorCode(oldCode) === 'MFA_INVALID');

  console.log('— A wrong code is spent from the login budget —');
  await freshSlate(user.id);
  for (let i = 0; i < 8; i++) {
    // The IP limiter would otherwise refuse the later attempts and the lockout
    // under test would never be reached.
    await prisma.rateLimitHit.deleteMany({});
    await gql(LOGIN, { e: email, p: PASSWORD, t: '000000' });
  }
  const locked = await prisma.companyUser.findUnique({
    where: { id: user.id }, select: { lockedUntil: true },
  });
  check('eight wrong codes lock the account',
    !!locked?.lockedUntil && locked.lockedUntil.getTime() > Date.now(),
    String(locked?.lockedUntil));
  await prisma.rateLimitHit.deleteMany({});
  const whileLocked = await gql(LOGIN, { e: email, p: PASSWORD, t: totp(secret) });
  check('and a correct code does not get in while locked',
    !whileLocked.data?.companyLogin?.token, JSON.stringify(whileLocked.errors));

  console.log('— A missing code does not spend the budget —');
  await freshSlate(user.id);
  for (let i = 0; i < 5; i++) {
    await prisma.rateLimitHit.deleteMany({});
    await gql(LOGIN, { e: email, p: PASSWORD });
  }
  const unspent = await prisma.companyUser.findUnique({
    where: { id: user.id }, select: { failedLogins: true },
  });
  check('five prompts for a code leave the counter alone', unspent?.failedLogins === 0,
    String(unspent?.failedLogins));

  console.log('— Turning it off needs the password and a code —');
  await freshSlate(user.id);
  const noPassword = await gql(DISABLE, { p: 'wrong-password', c: totp(secret) }, recoveryToken);
  check('a wrong password is refused', !!noPassword.errors?.length);
  const noMfaCode = await gql(DISABLE, { p: PASSWORD, c: '000000' }, recoveryToken);
  check('a wrong code is refused', errorCode(noMfaCode) === 'MFA_INVALID');
  await freshSlate(user.id);
  const off = await gql(DISABLE, { p: PASSWORD, c: totp(secret) }, recoveryToken);
  check('both together turn it off', off.data?.disableMfa === true, JSON.stringify(off.errors));
  await new Promise(r => setTimeout(r, 2200));
  const afterOff = await gql(ACCOUNT, undefined, recoveryToken);
  check('turning it off signs the account out everywhere', !!afterOff.errors?.length,
    JSON.stringify(afterOff.data));
  const cleared = await prisma.companyUser.findUnique({
    where: { id: user.id }, select: { totpSecret: true, totpEnabledAt: true },
  });
  check('the secret is destroyed', cleared?.totpSecret === null && cleared?.totpEnabledAt === null);
  check('the recovery codes are destroyed',
    (await prisma.recoveryCode.count({ where: { userId: user.id } })) === 0);

  await freshSlate(user.id);
  const plainAgain = await gql(LOGIN, { e: email, p: PASSWORD });
  check('a password alone signs you in again', !!plainAgain.data?.companyLogin?.token);

  console.log('— Enrolment is not reachable without a session —');
  const anon = await gql(START);
  check('starting enrolment unauthenticated is refused', !!anon.errors?.length);
  const anonConfirm = await gql(CONFIRM, { c: '000000' });
  check('confirming enrolment unauthenticated is refused', !!anonConfirm.errors?.length);

  console.log('— Cleanup —');
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.companyUser.delete({ where: { id: user.id } }).catch(() => {});

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
