// Findings of the full security review of 19 October 2026, pinned.
//
// Each was a side path skipping a check the main path makes:
//   - accepting an invitation logged into an existing account with the
//     password alone, and the inviter was handed the link;
//   - a support session could change anything, including turning itself into
//     an ordinary owner session;
//   - a session alone could add a second factor, and with it pass every
//     "fresh second factor" check;
//   - the failure counter could be raced past the lock;
//   - statements and paid identity sessions were accepted without an open
//     company's form;
//   - a passkey ticket was a token of the same kind as a session.
//
// Run: npx tsx scripts/reviewFindingsTest.ts
//      (needs the API on :3000 with a public FRONTEND_URL, and the database)
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { startEnrolment, confirmEnrolment } from '../lib/mfa.ts';
import { totp } from '../lib/totp.ts';
import { decryptField } from '../lib/cipher.ts';
import { hashToken, randomToken } from '../lib/tokens.ts';
import { issueStepUp } from '../lib/stepUp.ts';

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
  return { status: res.status, ...(await res.json().catch(() => ({}))) } as any;
}
const code = (r: any) => r.errors?.[0]?.extensions?.code;

await prisma.rateLimitHit.deleteMany({});
const run = Date.now().toString(36);
const companies: string[] = [];
const users: string[] = [];
const PASSWORD = 'a-long-enough-password-1';

async function user(name: string, opts: { totp?: boolean; passkey?: boolean } = {}) {
  const u = await prisma.companyUser.create({
    data: { email: `rf-${name}-${run}@test.local`, name, passwordHash: await bcrypt.hash(PASSWORD, 4), emailVerifiedAt: new Date() },
  });
  users.push(u.id);
  let secret: string | null = null;
  if (opts.totp) {
    await startEnrolment('companyUser', u.id, u.email);
    const st = await prisma.companyUser.findUnique({ where: { id: u.id }, select: { totpSecret: true } });
    secret = decryptField(st!.totpSecret!, 'totpSecret');
    await confirmEnrolment('companyUser', u.id, totp(secret));
  }
  if (opts.passkey) {
    await prisma.passkey.create({ data: { userId: u.id, credentialId: `rf-cred-${name}-${run}`, publicKey: 'AA', name: 'Test key' } });
  }
  const freshCode = async () => {
    await prisma.companyUser.update({ where: { id: u.id }, data: { totpLastCounter: null } });
    return totp(secret!);
  };
  return { u, freshCode };
}
async function company(tag: string, ownerId: string) {
  const c = await prisma.company.create({
    data: { name: `RF ${tag} ${run}`, slug: `rf-${tag}-${run}`, approvedAt: new Date(), members: { create: { role: 'OWNER', userId: ownerId } } },
  });
  companies.push(c.id);
  return c;
}

try {
  const admin = await prisma.admin.create({ data: { username: `rf-admin-${run}`, password: 'x' } });
  const victim = await user('victim', { totp: true });
  const attacker = await user('attacker');
  const victimCo = await company('victim', victim.u.id);
  const attackerCo = await company('attacker', attacker.u.id);
  const attackerToken = signCompanyToken({ companyUserId: attacker.u.id, companyId: attackerCo.id, role: 'OWNER' });
  const victimToken = signCompanyToken({ companyUserId: victim.u.id, companyId: victimCo.id, role: 'OWNER' });

  console.log('— Invitations —');
  const inv = await gql('mutation($e:String!){ inviteMember(email:$e, role: OWNER){ ok inviteUrl } }', { e: victim.u.email }, attackerToken);
  check('the inviter is not handed the link on a public instance', inv.data?.inviteMember?.ok === true && inv.data.inviteMember.inviteUrl === null, JSON.stringify(inv.errors ?? inv.data));
  const raw = randomToken();
  const invite = await prisma.companyInvite.create({
    data: { companyId: attackerCo.id, email: victim.u.email, role: 'OWNER', tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 86_400_000) },
  });
  const viaPassword = await gql('mutation($t:String!,$n:String!,$p:String!){ acceptInvite(token:$t, name:$n, password:$p){ token } }', { t: raw, n: 'x', p: PASSWORD });
  check('the link plus the password no longer signs into an existing account', code(viaPassword) === 'SIGN_IN_TO_ACCEPT' && !viaPassword.data?.acceptInvite, JSON.stringify(viaPassword.errors ?? viaPassword.data));
  check('and the invitation is not spent by trying', (await prisma.companyInvite.findUnique({ where: { id: invite.id } }))?.usedAt === null);
  const wrongAccount = await gql('mutation($t:String!){ acceptInviteSignedIn(token:$t){ token } }', { t: raw }, attackerToken);
  check('another signed-in account cannot accept it', !!wrongAccount.errors?.length && !wrongAccount.data?.acceptInviteSignedIn);
  const right = await gql('mutation($t:String!){ acceptInviteSignedIn(token:$t){ token company { id } } }', { t: raw }, victimToken);
  check('the invited account, signed in, accepts it', right.data?.acceptInviteSignedIn?.company?.id === attackerCo.id, JSON.stringify(right.errors));
  check('only once', !!(await gql('mutation($t:String!){ acceptInviteSignedIn(token:$t){ token } }', { t: raw }, victimToken)).errors?.length);

  console.log('— Support sessions —');
  const support = signCompanyToken({ companyUserId: victim.u.id, companyId: victimCo.id, role: 'OWNER', support: true, adminId: admin.id });
  check('a support session can still read', Array.isArray((await gql('{ companySubmissions(limit: 1) { id } }', {}, support)).data?.companySubmissions));
  const refused: [string, string, object][] = [
    ['switching company', 'mutation($c:ID!){ switchCompany(companyId:$c){ token } }', { c: victimCo.id }],
    ['inviting', 'mutation{ inviteMember(email:"x@test.local", role: OWNER){ ok } }', {}],
    ['adding a passkey', 'mutation{ startPasskeyRegistration { ticket } }', {}],
    ['confirming an authenticator app', 'mutation{ confirmMfaEnrolment(code:"123456"){ token } }', {}],
    ['hiding the support notice', 'mutation{ markNotificationsRead }', {}],
    ['closing the account', 'mutation($s:String!){ requestCompanyDeletion(confirmSlug:$s) }', { s: victimCo.slug }],
  ];
  for (const [label, q, v] of refused) {
    const r = await gql(q, v, support);
    check(`${label} is refused`, code(r) === 'FORBIDDEN', JSON.stringify(r.errors?.[0] ?? r.data));
  }
  const reveal = await gql('mutation{ revealDocumentNumber(id:"none", credential:"123456"){ documentNumber } }', {}, support);
  check('the allowed reveal reaches its own checks', code(reveal) !== 'FORBIDDEN', JSON.stringify(reveal.errors?.[0]));
  await prisma.admin.update({ where: { id: admin.id }, data: { sessionsValidFrom: new Date(Date.now() + 2000) } });
  const revoked = await gql('{ companySubmissions(limit: 1) { id } }', {}, support);
  check('revoking the admin\'s sessions ends the support session too', !revoked.data?.companySubmissions, JSON.stringify(revoked.data));

  console.log('— Adding a factor needs the one you have —');
  const p1 = await gql('mutation{ startPasskeyRegistration { ticket } }', {}, victimToken);
  check('with an app set up, a passkey is not added on the session alone', code(p1) === 'STEP_UP_REQUIRED' && p1.errors[0].extensions.method === 'code', JSON.stringify(p1.errors?.[0]));
  const p2 = await gql('mutation($p:String){ startPasskeyRegistration(proof:$p){ ticket } }', { p: '000000' }, victimToken);
  check('nor with a wrong code', !p2.data?.startPasskeyRegistration);
  const p3 = await gql('mutation($p:String){ startPasskeyRegistration(proof:$p){ ticket } }', { p: await victim.freshCode() }, victimToken);
  check('with a current code it is', !!p3.data?.startPasskeyRegistration?.ticket, JSON.stringify(p3.errors));
  const pk = await user('passkeyonly', { passkey: true });
  const pkCo = await company('pk', pk.u.id);
  const pkToken = signCompanyToken({ companyUserId: pk.u.id, companyId: pkCo.id, role: 'OWNER' });
  const a1 = await gql('mutation{ startMfaEnrolment { secret } }', {}, pkToken);
  check('with a passkey, an app is not added on the session alone', code(a1) === 'STEP_UP_REQUIRED' && a1.errors[0].extensions.method === 'passkey', JSON.stringify(a1.errors?.[0]));
  const forged = 'su.' + jwt.sign({ kind: 'companyUser' }, 'not-the-secret', { audience: 'step-up', subject: pk.u.id, expiresIn: 60 });
  check('nor with a forged step-up token', !(await gql('mutation($p:String){ startMfaEnrolment(proof:$p){ secret } }', { p: forged }, pkToken)).data?.startMfaEnrolment);
  const other = issueStepUp('companyUser', attacker.u.id);
  check('nor with one made for another account', !(await gql('mutation($p:String){ startMfaEnrolment(proof:$p){ secret } }', { p: other }, pkToken)).data?.startMfaEnrolment);
  const good = issueStepUp('companyUser', pk.u.id);
  check('with a passkey step-up it is', !!(await gql('mutation($p:String){ startMfaEnrolment(proof:$p){ secret } }', { p: good }, pkToken)).data?.startMfaEnrolment?.secret);
  check('and that step-up works once', !(await gql('mutation($p:String){ startMfaEnrolment(proof:$p){ secret } }', { p: good }, pkToken)).data?.startMfaEnrolment);
  const fresh = await user('fresh');
  const freshCo = await company('fresh', fresh.u.id);
  const freshToken = signCompanyToken({ companyUserId: fresh.u.id, companyId: freshCo.id, role: 'OWNER' });
  check('an account with no factor yet sets up its first freely', !!(await gql('mutation{ startMfaEnrolment { secret } }', {}, freshToken)).data?.startMfaEnrolment?.secret);

  console.log('— Lockout —');
  await prisma.companyUser.update({ where: { id: victim.u.id }, data: { failedLogins: 0, lockedUntil: null } });
  // A fresh sign-in budget, so the guesses reach the account rather than the per-address limit.
  await prisma.rateLimitHit.deleteMany({});
  await Promise.all(Array.from({ length: 12 }, () =>
    gql('mutation{ disableMfa(password:"wrong-password-guess", code:"000000") }', {}, victimToken)));
  const locked = await prisma.companyUser.findUnique({ where: { id: victim.u.id }, select: { lockedUntil: true } });
  check('twelve guesses in parallel still lock the account', !!locked?.lockedUntil && locked.lockedUntil > new Date(), JSON.stringify(locked));

  console.log('— Only an open form —');
  const noSlug = await gql('mutation($i: SubmitInput!){ submitEndUserStatement(input:$i){ id } }', { i: {
    email: 'x@test.local', firstName: 'A', lastName: 'B', substances: 'Acetone', statement: 'lab use', agreedToTerms: true,
  } });
  check('a statement without a form is refused', code(noSlug) === 'FORM_NOT_OPEN', JSON.stringify(noSlug.errors?.[0]));
  const unknown = await gql('mutation($i: SubmitInput!){ submitEndUserStatement(input:$i){ id } }', { i: {
    email: 'x@test.local', firstName: 'A', lastName: 'B', substances: 'Acetone', statement: 'lab use', agreedToTerms: true, companySlug: `nobody-${run}`,
  } });
  check('a statement for a form nobody owns is refused', code(unknown) === 'FORM_NOT_OPEN');
  for (const [label, body] of [['no form', {}], ['a form nobody owns', { companySlug: `nobody-${run}` }]] as const) {
    const r = await fetch('http://localhost:3000/verification-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    check(`no paid identity session for ${label}`, r.status === 404 || r.status === 503, String(r.status));
  }

  console.log('— Tokens of one kind only —');
  const ticketAsSession = jwt.sign({ purpose: 'passkey-login', kind: 'companyUser', accountId: victim.u.id, challenge: 'x' },
    process.env.COMPANY_JWT_SECRET!, { audience: 'passkey-ticket', expiresIn: 60, algorithm: 'HS256' });
  const asSession = await gql('{ companySubmissions(limit: 1) { id } }', {}, ticketAsSession);
  check('a passkey ticket is not a session', !asSession.data?.companySubmissions && asSession.errors?.[0]?.message === 'Unauthorized', JSON.stringify(asSession.errors?.[0]));

  console.log('— Rate limits —');
  let limited = false;
  for (let i = 0; i < 14 && !limited; i++) {
    limited = (await gql('mutation{ beginPasskeyLogin(email:"nobody@test.local", password:"x"){ ticket } }')).status === 429;
  }
  check('passkey sign-in has the sign-in budget', limited);

  console.log('— Second verification pass —');
  // F1: a persisted query is a hash with no text, and the operation limits read the text.
  const apq = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1' },
    body: JSON.stringify({ extensions: { persistedQuery: { version: 1, sha256Hash: 'a'.repeat(64) } } }),
  }).then(r => r.json()).catch(() => ({})) as any;
  check('persisted queries are switched off', /PERSISTED_QUERY_NOT_SUPPORTED|PersistedQueryNotSupported/i.test(JSON.stringify(apq)), JSON.stringify(apq).slice(0, 160));

  // F2: a parallel burst of wrong codes cannot get more than the budget judged.
  await prisma.rateLimitHit.deleteMany({});
  await prisma.companyUser.update({ where: { id: victim.u.id }, data: { failedLogins: 0, lockedUntil: null } });
  const subRow = await prisma.submission.create({ data: {
    companyId: victimCo.id, email: 'r@test.local', orderNumber: '', firstName: 'R', lastName: 'R', street: '', zipCode: '',
    place: '', country: '', companyName: '', vatNumber: '', substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED',
  } });
  const burst = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    gql('mutation($id:ID!,$c:String!){ revealDocumentNumber(id:$id, credential:$c){ documentNumber } }',
      { id: subRow.id, c: String(100000 + i) }, victimToken)));
  const judged = burst.filter(r => code(r) === 'MFA_INVALID').length;
  check('twenty codes at once: at most eight are judged, the rest meet the lock', judged <= 8 && burst.some(r => code(r) === 'ACCOUNT_LOCKED'), `judged ${judged}: ${burst.map(code).join(',')}`);

  // F3: a passkey ticket works once, and only for what it was issued for.
  const { startAuthentication, finishAuthentication } = await import('../lib/passkeys.ts');
  const t1 = await startAuthentication('companyUser', pk.u.id, 'step-up');
  const first = await finishAuthentication({ ticket: t1!.ticket, responseJson: '{"id":"x"}', scope: 'step-up' });
  const again = await finishAuthentication({ ticket: t1!.ticket, responseJson: '{"id":"x"}', scope: 'step-up' });
  check('a ticket is spent by its first use', first.ok === false && first.reason !== 'bad-ticket' && again.ok === false && again.reason === 'bad-ticket', JSON.stringify([first, again]));
  const t2 = await startAuthentication('companyUser', pk.u.id, 'step-up');
  const wrongScope = await finishAuthentication({ ticket: t2!.ticket, responseJson: '{"id":"x"}', scope: `reveal:${subRow.id}` });
  check('a step-up ticket is not a reveal ticket', wrongScope.ok === false && wrongScope.reason === 'bad-ticket');
  const t3 = await startAuthentication('companyUser', pk.u.id, 'login');
  const loginAsStep = await finishAuthentication({ ticket: t3!.ticket, responseJson: '{"id":"x"}', scope: 'step-up' });
  check('a sign-in ticket is not a step-up ticket', loginAsStep.ok === false && loginAsStep.reason === 'bad-ticket');

  // F4: removing a passkey needs the factor you have, like adding one.
  await prisma.companyUser.update({ where: { id: victim.u.id }, data: { failedLogins: 0, lockedUntil: null } });
  const vk = await prisma.passkey.create({ data: { userId: victim.u.id, credentialId: `rf-cred-victim-${run}`, publicKey: 'AA', name: 'Victim key' } });
  const rm = await gql('mutation($id:ID!){ removePasskey(id:$id) }', { id: vk.id }, victimToken);
  check('a passkey is not removed on the session alone', code(rm) === 'STEP_UP_REQUIRED' && (await prisma.passkey.count({ where: { id: vk.id } })) === 1, JSON.stringify(rm.errors?.[0]));
  await prisma.submission.delete({ where: { id: subRow.id } });

  await prisma.passkey.deleteMany({ where: { userId: { in: users } } });
  await prisma.admin.delete({ where: { id: admin.id } });
} finally {
  await prisma.rateLimitHit.deleteMany({});
  for (const c of companies) {
    for (const m of ['notification', 'companyInvite', 'companyMember', 'submission'] as const) await (prisma as any)[m].deleteMany({ where: { companyId: c } });
    await prisma.company.delete({ where: { id: c } }).catch(() => {});
  }
  await prisma.passkey.deleteMany({ where: { userId: { in: users } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: users } } });
  await prisma.admin.deleteMany({ where: { username: `rf-admin-${run}` } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
