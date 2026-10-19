// A stale invitation must never put a role back.
//
// Pentest finding (19 October 2026): an owner invitation stayed valid after the
// invitee was demoted, and accepting it from their own session overwrote the
// demotion with OWNER. A removed member who still belonged to another company
// could accept one the same way and walk back in. Now:
//   - changing a role, or removing a member, revokes their unused invitations;
//   - a current member cannot be invited (the role is changed instead);
//   - accepting never changes the role of someone already inside.
//
// Run: npx tsx scripts/staleInviteTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { hashToken, randomToken } from '../lib/tokens.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
async function gql(query: string, variables: object, token: string) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  return res.json() as Promise<any>;
}

const run = Date.now().toString(36);
const mk = async (name: string) => prisma.companyUser.create({
  data: { email: `si-${name}-${run}@test.local`, name, passwordHash: await bcrypt.hash('x-long-password', 4), emailVerifiedAt: new Date() },
});
const owner = await mk('owner');
const member = await mk('member');
const a = await prisma.company.create({ data: { name: `SI A ${run}`, slug: `si-a-${run}`, approvedAt: new Date() } });
const b = await prisma.company.create({ data: { name: `SI B ${run}`, slug: `si-b-${run}`, approvedAt: new Date() } });
await prisma.companyMember.createMany({
  data: [
    { companyId: a.id, userId: owner.id, role: 'OWNER' },
    { companyId: a.id, userId: member.id, role: 'OWNER' },
    { companyId: b.id, userId: member.id, role: 'OWNER' },
  ],
});
const ownerToken = signCompanyToken({ companyUserId: owner.id, companyId: a.id, role: 'OWNER' });

/** An owner invitation for the member, as one issued before these rules would be. */
async function staleInvite() {
  const raw = randomToken();
  await prisma.companyInvite.create({
    data: { companyId: a.id, email: member.email, role: 'OWNER', tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 86_400_000) },
  });
  return raw;
}
const openInvites = () => prisma.companyInvite.count({ where: { companyId: a.id, email: member.email, usedAt: null } });
const roleInA = async () => (await prisma.companyMember.findUnique({
  where: { companyId_userId: { companyId: a.id, userId: member.id } }, select: { role: true },
}))?.role ?? null;
const ACCEPT = 'mutation($t:String!){ acceptInviteSignedIn(token:$t){ role } }';

try {
  // 1. Inviting someone who is already inside is refused.
  const inv = await gql('mutation($e:String!){ inviteMember(email:$e, role: OWNER){ ok } }', { e: member.email.toUpperCase() }, ownerToken);
  check('a current member cannot be invited', !!inv.errors && (await openInvites()) === 0, JSON.stringify(inv.errors?.[0]?.message ?? inv.data));

  // 2. Demotion revokes the invitation the member was holding.
  const held = await staleInvite();
  const ch = await gql('mutation($u:ID!){ changeMemberRole(userId:$u, role: EMPLOYEE){ role } }', { u: member.id }, ownerToken);
  check('the demotion went through', ch.data?.changeMemberRole?.role === 'EMPLOYEE', JSON.stringify(ch.errors));
  check('and revoked the unused invitation', (await openInvites()) === 0);
  const memberInA = signCompanyToken({ companyUserId: member.id, companyId: a.id, role: 'EMPLOYEE' });
  const acc = await gql(ACCEPT, { t: held }, memberInA);
  check('the revoked invitation cannot be accepted', !!acc.errors && (await roleInA()) === 'EMPLOYEE', JSON.stringify(acc.data));

  // 3. Even an invitation that survived, accepted by someone inside, changes no role.
  const survivor = await staleInvite();
  const acc2 = await gql(ACCEPT, { t: survivor }, memberInA);
  check('accepting as a member keeps the current role', (await roleInA()) === 'EMPLOYEE', JSON.stringify(acc2.errors ?? acc2.data));

  // 4. Removal revokes too, so a session in another company cannot rejoin.
  const kept = await staleInvite();
  const rm = await gql('mutation($u:ID!){ removeMember(userId:$u) }', { u: member.id }, ownerToken);
  check('the removal went through', rm.data?.removeMember === true && (await roleInA()) === null, JSON.stringify(rm.errors));
  check('and revoked the unused invitation', (await openInvites()) === 0);
  const fromB = signCompanyToken({ companyUserId: member.id, companyId: b.id, role: 'OWNER' });
  const back = await gql(ACCEPT, { t: kept }, fromB);
  check('a removed member cannot rejoin from another company', !!back.errors && (await roleInA()) === null, JSON.stringify(back.data));

  // 5. A fresh invitation after removal still works: inviting people in is not broken.
  const again = await gql('mutation($e:String!){ inviteMember(email:$e, role: EMPLOYEE){ ok } }', { e: member.email }, ownerToken);
  check('a removed member can be invited again', again.data?.inviteMember?.ok === true, JSON.stringify(again.errors));
} finally {
  await prisma.companyInvite.deleteMany({ where: { companyId: { in: [a.id, b.id] } } });
  await prisma.company.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  await prisma.companyUser.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
