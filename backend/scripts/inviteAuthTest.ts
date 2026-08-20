// Invite acceptance must not double as a login.
//
// An invite proves the address was invited, not that whoever opened the link
// owns that account. When the invited email already has an account, accepting
// requires that account's password — otherwise a forwarded or leaked invite
// would mint a session for someone else.
//
// Run: npx tsx scripts/inviteAuthTest.ts   (backend must be running on :3000)
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
  registerCompany(name:$name,slug:$slug,email:$email,password:$password,yourName:$yourName){ token company{ id slug } }
}`;
const INVITE = `mutation($email:String!,$role:CompanyRole!){ inviteMember(email:$email,role:$role){ ok inviteUrl } }`;
const ACCEPT = `mutation($token:String!,$name:String!,$password:String!){
  acceptInvite(token:$token,name:$name,password:$password){ token role }
}`;

async function main() {
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
  console.log('  two tenants registered; the guest email already has an account');

  console.log('— Host invites the existing account —');
  const invited = await gql(INVITE, { email: guestEmail, role: 'EMPLOYEE' }, hostToken);
  const inviteToken = String(invited.data?.inviteMember?.inviteUrl ?? '').split('/invite/')[1] ?? '';
  check('invite created', !!inviteToken, JSON.stringify(invited.errors));

  console.log('— Accepting with the wrong password —');
  const wrong = await gql(ACCEPT, { token: inviteToken, name: 'Impostor', password: 'not-the-password' });
  check('refused without the account password', !wrong.data?.acceptInvite && !!wrong.errors?.length,
    wrong.errors?.[0]?.message ?? 'a session was issued');

  const stillOne = await prisma.companyMember.count({
    where: { user: { email: guestEmail } },
  });
  check('no membership was created by the failed attempt', stillOne === 1, `memberships=${stillOne}`);

  console.log('— Accepting with the right password —');
  const right = await gql(ACCEPT, { token: inviteToken, name: 'Guest Owner', password: GUEST_PASSWORD });
  check('accepted with the account password', !!right.data?.acceptInvite?.token, right.errors?.[0]?.message);

  console.log('— Cleanup —');
  const slugs = [`invtest-host-${run}`, `invtest-guest-${run}`];
  await prisma.company.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.companyUser.deleteMany({ where: { email: { in: [hostEmail, guestEmail] } } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
