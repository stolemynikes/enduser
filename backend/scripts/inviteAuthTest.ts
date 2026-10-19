// Invite acceptance must not double as a login.
//
// An invite proves the address was invited, not that whoever opened the link
// owns that account. When the invited email already has an account, accepting
// requires that account's password — otherwise a forwarded or leaked invite
// would mint a session for someone else.
//
// Run: npx tsx scripts/inviteAuthTest.ts   (backend must be running on :3000)
import { LEGAL_VERSION } from '../lib/legal.ts';
import { prisma } from '../lib/prisma.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function gql(query: string, variables?: object, token?: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<{ data?: any; errors?: { message: string }[] }>;
}

const REGISTER = `mutation($name:String!,$slug:String!,$email:String!,$password:String!,$yourName:String!){
  registerCompany(name:$name,slug:$slug,email:$email,password:$password,yourName:$yourName,legalVersion:"${LEGAL_VERSION}"){ token company{ id slug } }
}`;
const INVITE = `mutation($email:String!,$role:CompanyRole!){ inviteMember(email:$email,role:$role){ ok inviteUrl } }`;
const ACCEPT = `mutation($token:String!,$name:String!,$password:String!){
  acceptInvite(token:$token,name:$name,password:$password){ token role }
}`;

async function main() {
  // Budgets now live in Postgres and survive restarts, so a previous run's
  // registrations would otherwise refuse this one's.
  await prisma.rateLimitHit.deleteMany({});
  const run = Date.now();
  const hostEmail = `inv-host-${run}@test.local`;
  const guestEmail = `inv-guest-${run}@test.local`;
  const GUEST_PASSWORD = 'guest-password-1';

  console.log('— Setup —');
  const host = await gql(REGISTER, { name: `InvTest Host ${run}`, slug: `invtest-host-${run}`, email: hostEmail, password: 'host-password-1', yourName: 'Host Owner' });
  const guest = await gql(REGISTER, { name: `InvTest Guest ${run}`, slug: `invtest-guest-${run}`, email: guestEmail, password: GUEST_PASSWORD, yourName: 'Guest Owner' });
  if (!host.data?.registerCompany || !guest.data?.registerCompany) {
    console.error('setup failed:', JSON.stringify(host.errors ?? guest.errors));
    process.exit(1);
  }
  const hostToken = host.data.registerCompany.token;
  // Inviting now requires the inviting owner to have confirmed their own
  // address, so the fixture puts the host in the state a real seller is in
  // after clicking the confirmation link.
  await prisma.companyUser.update({ where: { email: hostEmail }, data: { emailVerifiedAt: new Date() } });
  console.log('  two tenants registered; the guest email already has an account');

  console.log('— Host invites the existing account —');
  const invited = await gql(INVITE, { email: guestEmail, role: 'EMPLOYEE' }, hostToken);
  check('invite created', invited.data?.inviteMember?.ok === true, JSON.stringify(invited.errors));
  // The link exists only in the guest's email; the test plants its own.
  const { randomToken, hashToken } = await import('../lib/tokens.ts');
  const inviteToken = randomToken();
  const hostCompany = await prisma.company.findUnique({ where: { slug: `invtest-host-${run}` } });
  await prisma.companyInvite.create({ data: {
    companyId: hostCompany!.id, email: guestEmail, role: 'EMPLOYEE',
    tokenHash: hashToken(inviteToken), expiresAt: new Date(Date.now() + 86_400_000),
  } });

  console.log('— The link and a password are not a sign-in —');
  for (const [label, password] of [['a wrong password', 'not-the-password'], ['even the right one', GUEST_PASSWORD]]) {
    const r = await gql(ACCEPT, { token: inviteToken, name: 'Guest Owner', password });
    check(`with ${label}, no session is issued — sign in first`,
      !r.data?.acceptInvite && (r.errors?.[0] as any)?.extensions?.code === 'SIGN_IN_TO_ACCEPT', JSON.stringify(r.errors?.[0] ?? r.data));
  }
  const stillOne = await prisma.companyMember.count({ where: { user: { email: guestEmail } } });
  check('no membership was created by trying', stillOne === 1, `memberships=${stillOne}`);

  console.log('— Signed in, the guest accepts —');
  const guestToken = guest.data.registerCompany.token;
  const joined = await gql(`mutation($t:String!){ acceptInviteSignedIn(token:$t){ token role } }`, { t: inviteToken }, guestToken);
  check('accepted from the guest\'s own session', joined.data?.acceptInviteSignedIn?.role === 'EMPLOYEE', JSON.stringify(joined.errors));

  console.log('— Cleanup —');
  const slugs = [`invtest-host-${run}`, `invtest-guest-${run}`];
  await prisma.company.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.companyUser.deleteMany({ where: { email: { in: [hostEmail, guestEmail] } } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
