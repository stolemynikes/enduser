import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import {
  sendCompanyInvite, sendApproved, sendDenied, sendPasswordReset, sendEmailVerification,
} from '../services/email.ts';
import { consumeToken, issueToken } from '../lib/authTokens.ts';
import { hashToken, randomToken } from '../lib/tokens.ts';
import { mailBudgetAllows } from '../lib/mailBudget.ts';
import { LOCKED_MESSAGE, lockedFor, recordFailure, recordSuccess } from '../lib/loginGuard.ts';
import { verifyHumanOrThrow } from '../services/turnstile.ts';

// Compared against when the address is unknown, so a missing account costs the
// same time as a wrong password.
const DUMMY_HASH = '$2b$12$K8pQZ1sTBFQ9DfP6y0kZsuQ0tHfZ0Uu7uN3sT2mN5nGZ8vKcX2h5S';
import { statementCopy } from '../lib/statementCopy.ts';
import { resolveConfig, type FormConfig } from '../lib/formConfig.ts';
import { runSubstanceCheck } from './submission.ts';
import { SUBSTANCE_CHECK_ENABLED } from '../services/substanceCheck.ts';
import { assertApprovable, applyOverride, clearOverride } from '../lib/overrides.ts';
import { type OverrideCategory } from '../lib/approvalGate.ts';
import { tenantSubmissions } from '../lib/tenant.ts';
import { redactAllForRole, redactForRole } from '../lib/redact.ts';
import { DIDIT_ENABLED } from '../services/didit.ts';

type Ctx = {
  companyUserId?: string;
  companyId?: string;
  companyRole?: string;
};

function requireCompany(ctx: Ctx) {
  if (!ctx.companyUserId || !ctx.companyId) throw new Error('Unauthorized');
  return { companyUserId: ctx.companyUserId, companyId: ctx.companyId, role: ctx.companyRole! };
}

function requireOwner(ctx: Ctx) {
  const m = requireCompany(ctx);
  if (m.role !== 'OWNER') throw new Error('Owner access required');
  return m;
}

function requireOwnerOrPlus(ctx: Ctx) {
  const m = requireCompany(ctx);
  if (m.role !== 'OWNER' && m.role !== 'EMPLOYEE_PLUS') throw new Error('Insufficient permissions');
  return m;
}

/**
 * A form is only live once its owner has proved they own the address they signed
 * up with.
 *
 * Without this, anyone could register using someone else's address, claim a slug
 * trading on their name, and have a working public form on this domain —
 * collecting buyers' details and pushing them through a real identity check
 * under a brand they do not own.
 */
async function ownerVerified(companyId: string): Promise<boolean> {
  const owner = await prisma.companyMember.findFirst({
    where: { companyId, role: 'OWNER' },
    select: { user: { select: { emailVerifiedAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return owner?.user.emailVerifiedAt != null;
}

async function membershipOrThrow(companyId: string, companyUserId: string) {
  const m = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId, userId: companyUserId } },
    include: { company: true, user: true },
  });
  if (!m) throw new Error('Membership not found');
  return m;
}

// Forms are served at the root (/{slug}), so a slug must never shadow an app
// route or a backend endpoint the dev proxy / reverse proxy forwards.
const RESERVED_SLUGS = new Set([
  'admin', 'form', 'register', 'login', 'signup', 'capture', 'invite', 'company',
  'dashboard', 'graphql', 'uploads', 'assets', 'api',
  // Identity verification (Didit) routes and the embeddable form wrapper.
  'embed', 'verification-complete', 'verification-session', 'verification-status',
  'didit-webhook',
  // Retired in-house OCR routes — still reserved so an old link can never be
  // shadowed by a company form.
  'extract-id', 'phone-session', 'phone-capture', 'phone-result',
]);

// Slugs are derived from the company name and not user-editable: on a reserved
// word or collision, append -2, -3, … instead of failing registration.
async function availableSlug(base: string) {
  let candidate = base;
  for (let n = 2; RESERVED_SLUGS.has(candidate) || await prisma.company.findUnique({ where: { slug: candidate } }); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

const APP_URL = () => (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

/** Emails a fresh confirmation link. Never throws — signup must not fail on mail. */
async function sendVerification(user: { id: string; email: string; name: string }) {
  try {
    if (!(await mailBudgetAllows(user.email, 'verification'))) return;
    const token = await issueToken(user.id, 'EMAIL_VERIFICATION');
    await sendEmailVerification(user.email, user.name, `${APP_URL()}/verify/${token}`);
  } catch (err: any) {
    console.error(`[auth] could not send verification to ${user.id}: ${err?.message ?? 'unknown error'}`);
  }
}

function buildAuthPayload(token: string, company: { id: string; name: string; slug: string }, role: string) {
  return { token, company: { id: company.id, name: company.name, slug: company.slug }, role };
}

// Password policy is enforced server-side too — the 8-char minimum in the
// register/accept-invite UIs is a convenience, not a control (the GraphQL API is
// directly reachable). Keep this threshold in sync with the frontend.
function assertPasswordStrength(password: unknown) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
}

export const companyResolvers = {
  Query: {
    /**
     * One page of the review queue. Everything used to come back at once —
     * every row decrypted and shipped — which is fine at a dozen submissions and
     * not at a few thousand.
     *
     * Searching is still done in the browser over the loaded pages: email, name
     * and address are encrypted at rest, so no SQL query can match on them.
     */
    companySubmissions: async (
      _: unknown,
      { status, includeTest, limit, offset }:
        { status?: string; includeTest?: boolean; limit?: number; offset?: number },
      ctx: Ctx,
    ) => {
      const { companyId, role } = requireCompany(ctx);
      const rows = await tenantSubmissions(companyId).findMany({
        where: {
          ...(status ? { status: status as never } : {}),
          // Test submissions are a rehearsal tool; they stay out of the real
          // queue unless the dashboard explicitly asks for them.
          isTest: includeTest === true,
        },
        orderBy: { createdAt: 'desc' },
        include: { overrides: true },
        take: Math.min(Math.max(limit ?? 100, 1), 200),
        skip: Math.max(offset ?? 0, 0),
      });
      return redactAllForRole(rows, role);
    },

    /** Row counts per status, for the queue's tab badges and paging. */
    companySubmissionCounts: async (
      _: unknown,
      { includeTest }: { includeTest?: boolean },
      ctx: Ctx,
    ) => {
      const { companyId } = requireCompany(ctx);
      const scoped = tenantSubmissions(companyId);
      const isTest = includeTest === true;
      const [all, pending, approved, denied, tests] = await Promise.all([
        scoped.count({ isTest }),
        scoped.count({ isTest, status: 'PENDING_REVIEW' }),
        scoped.count({ isTest, status: 'APPROVED' }),
        scoped.count({ isTest, status: 'DENIED' }),
        scoped.count({ isTest: true }),
      ]);
      return { all, pending, approved, denied, tests };
    },

    /** What the browser needs before anyone has signed in. */
    publicConfig: () => ({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? null }),

    formInfo: async (_: unknown, { slug }: { slug: string }) => {
      const company = await prisma.company.findUnique({ where: { slug } });
      if (!company || company.deletedAt) return null;
      return {
        companyName: company.name,
        // Configured *and* the owner's address confirmed — see ownerVerified().
        configured: company.formConfig != null && await ownerVerified(company.id),
        config: resolveConfig(company.formConfig),
        // The form asks for identity verification only when the platform can
        // actually run one — otherwise the buyer would fill in everything and
        // hit a hard error at submit time.
        identityVerificationAvailable: DIDIT_ENABLED,
      };
    },

    // Whether the platform has an identity verification provider configured.
    // Read by the setup wizard and Form Settings so an owner is not offered a
    // switch that cannot work.
    identityVerificationAvailable: async (_: unknown, __: unknown, ctx: Ctx) => {
      requireCompany(ctx);
      return DIDIT_ENABLED;
    },

    myCompany: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireCompany(ctx);
      return prisma.company.findUnique({ where: { id: companyId } });
    },

    // The role the dashboard renders from. It used to come out of
    // localStorage, where anyone could promote themselves to OWNER and get a
    // dashboard full of requests the server then refused.
    myRole: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId, companyUserId } = requireCompany(ctx);
      const m = await prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId, userId: companyUserId } },
        select: { role: true },
      });
      if (!m) throw new Error('Membership not found');
      return m.role;
    },

    /** Every company this user belongs to, for the switcher. */
    myCompanies: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId, companyId } = requireCompany(ctx);
      const memberships = await prisma.companyMember.findMany({
        where: { userId: companyUserId, company: { deletedAt: null } },
        include: { company: true },
        orderBy: { createdAt: 'asc' },
      });
      return memberships.map(m => ({
        id: m.company.id,
        name: m.company.name,
        slug: m.company.slug,
        role: m.role,
        current: m.companyId === companyId,
      }));
    },

    myAccount: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompany(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId },
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
      });
      if (!user) throw new Error('Membership not found');
      return {
        id: user.id, email: user.email, name: user.name,
        emailVerified: user.emailVerifiedAt != null,
      };
    },

    myFormConfig: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      return resolveConfig(company?.formConfig);
    },

    companyMembers: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      const members = await prisma.companyMember.findMany({
        where: { companyId },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      });
      return members.map(m => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      }));
    },
  },

  Mutation: {
    registerCompany: async (
      _: unknown,
      { name, slug, email, password, yourName, turnstileToken }:
        { name: string; slug: string; email: string; password: string; yourName: string; turnstileToken?: string }
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      const slugBase = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slugBase) throw new Error('Invalid slug');
      const slugClean = await availableSlug(slugBase);

      assertPasswordStrength(password);

      const address = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new Error('Please enter a valid email address.');
      }
      const existingUser = await prisma.companyUser.findUnique({ where: { email: address } });
      if (existingUser) {
        // Deliberately vague: telling a stranger which addresses have accounts
        // is an enumeration oracle, and login and reset are already careful.
        throw new Error('That account could not be created. If you already have one, sign in instead.');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const company = await prisma.company.create({
        data: {
          name,
          slug: slugClean,
          members: {
            create: {
              role: 'OWNER',
              user: {
                create: { email: address, passwordHash, name: yourName },
              },
            },
          },
        },
      });

      const member = await prisma.companyMember.findFirst({ where: { companyId: company.id }, include: { user: true } });
      void sendVerification(member!.user);
      const token = signCompanyToken({ companyUserId: member!.userId, companyId: company.id, role: 'OWNER' });
      return buildAuthPayload(token, company, 'OWNER');
    },

    companyLogin: async (
      _: unknown,
      { email, password, turnstileToken }: { email: string; password: string; turnstileToken?: string },
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      const user = await prisma.companyUser.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { memberships: { include: { company: true } } },
      });

      const minutes = lockedFor(user);
      if (minutes > 0) throw new Error(LOCKED_MESSAGE(minutes));

      // Always run a comparison, so an unknown address and a wrong password
      // take the same time and cannot be told apart.
      const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid) {
        if (user) await recordFailure('companyUser', user);
        throw new Error('Invalid email or password');
      }
      await recordSuccess('companyUser', user.id);

      if (user.memberships.length === 0) throw new Error('No company membership found');

      // A user with several memberships lands in the one they joined first and
      // switches from the dashboard (switchCompany). Closed companies are skipped.
      const live = user.memberships.filter(m => m.company.deletedAt == null);
      if (live.length === 0) throw new Error('No company membership found');
      const membership = live[0];
      const token = signCompanyToken({ companyUserId: user.id, companyId: membership.companyId, role: membership.role });
      return buildAuthPayload(token, membership.company, membership.role);
    },

    inviteMember: async (
      _: unknown,
      { email, role }: { email: string; role: string },
      ctx: Ctx
    ) => {
      const { companyId, companyUserId } = requireOwner(ctx);

      const m = await membershipOrThrow(companyId, companyUserId);
      const company = m.company;
      const inviterName = m.user.name;

      // Delete any existing unused invite for this email+company
      await prisma.companyInvite.deleteMany({ where: { companyId, email, usedAt: null } });

      // The raw token exists in the email and nowhere else; only its hash is
      // stored, and it carries no structure an attacker can learn from.
      const inviteToken = randomToken();
      const invite = await prisma.companyInvite.create({
        data: {
          companyId,
          email,
          role: role as any,
          tokenHash: hashToken(inviteToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      const inviteUrl = `${frontendUrl}/invite/${inviteToken}`;

      await sendCompanyInvite(email, inviterName, company.name, inviteUrl).catch(() => {});

      return { ok: true, inviteUrl };
    },

    acceptInvite: async (
      _: unknown,
      { token, name, password }: { token: string; name: string; password: string }
    ) => {
      const invite = await prisma.companyInvite.findUnique({
        where: { tokenHash: hashToken(token) }, include: { company: true },
      });
      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        throw new Error('This invite link is invalid or has expired.');
      }

      assertPasswordStrength(password);

      const passwordHash = await bcrypt.hash(password, 12);

      // The invite proves the address was invited, not that whoever opened the
      // link is its owner. When an account already exists, the password typed
      // must be that account's — otherwise a forwarded invite would mint a
      // session for someone else's account.
      let user = await prisma.companyUser.findUnique({ where: { email: invite.email } });
      if (user) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          throw new Error('An account already exists for this email — enter its password to accept the invite.');
        }
      } else {
        user = await prisma.companyUser.create({ data: { email: invite.email, passwordHash, name } });
      }

      // Add membership (or update role if already a member)
      await prisma.companyMember.upsert({
        where: { companyId_userId: { companyId: invite.companyId, userId: user.id } },
        create: { companyId: invite.companyId, userId: user.id, role: invite.role },
        update: { role: invite.role },
      });

      await prisma.companyInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

      const jwtToken = signCompanyToken({ companyUserId: user.id, companyId: invite.companyId, role: invite.role });
      return buildAuthPayload(jwtToken, invite.company, invite.role);
    },

    /**
     * Always reports success. Whether an address has an account is not something
     * an unauthenticated caller gets to learn from this endpoint.
     */
    requestPasswordReset: async (
      _: unknown,
      { email, turnstileToken }: { email: string; turnstileToken?: string },
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      const user = await prisma.companyUser.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, email: true, name: true },
      });
      // The budget is per address, so flooding someone else's inbox with reset
      // links is not something this endpoint will do, however many callers ask.
      if (user && await mailBudgetAllows(user.email, 'reset')) {
        try {
          const token = await issueToken(user.id, 'PASSWORD_RESET');
          await sendPasswordReset(user.email, user.name, `${APP_URL()}/reset/${token}`);
        } catch (err: any) {
          console.error(`[auth] password reset mail failed: ${err?.message ?? 'unknown error'}`);
        }
      }
      return true;
    },

    resetPassword: async (_: unknown, { token, password }: { token: string; password: string }) => {
      assertPasswordStrength(password);
      const userId = await consumeToken(token, 'PASSWORD_RESET');
      if (!userId) throw new Error('This reset link is invalid or has expired — request a new one.');
      await prisma.companyUser.update({
        where: { id: userId },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          // Only the address owner could have followed the link, so this also
          // settles the question the verification mail asks.
          emailVerifiedAt: new Date(),
          // Every token issued before now stops working. Without this, someone
          // resetting *because* their session was stolen kept the thief signed
          // in for the remaining 30 days.
          sessionsValidFrom: new Date(),
          failedLogins: 0,
          lockedUntil: null,
        },
      });
      return true;
    },

    verifyEmail: async (_: unknown, { token }: { token: string }) => {
      const userId = await consumeToken(token, 'EMAIL_VERIFICATION');
      if (!userId) throw new Error('This confirmation link is invalid or has expired — request a new one.');
      await prisma.companyUser.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
      return true;
    },

    resendEmailVerification: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompany(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId },
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
      });
      if (!user) throw new Error('Membership not found');
      if (user.emailVerifiedAt) return true;
      await sendVerification(user);
      return true;
    },

    /**
     * Re-issues the token for another company this user belongs to. The token
     * carries the company, so switching means signing a new one — there is no
     * way to be "in" two tenants on one token, by design.
     */
    switchCompany: async (_: unknown, { companyId }: { companyId: string }, ctx: Ctx) => {
      const { companyUserId } = requireCompany(ctx);
      const membership = await prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId, userId: companyUserId } },
        include: { company: true },
      });
      if (!membership || membership.company.deletedAt) throw new Error('You are not a member of that company.');
      const token = signCompanyToken({ companyUserId, companyId, role: membership.role });
      return buildAuthPayload(token, membership.company, membership.role);
    },

    /**
     * Closes the company account. Nothing is destroyed yet: the tenant keeps
     * working for 30 days so the decision can be undone, and only the nightly
     * purge past that point is irreversible.
     */
    requestCompanyDeletion: async (_: unknown, { confirmSlug }: { confirmSlug: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwner(ctx);
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) throw new Error('Company not found');
      // Typing the slug is the guard against a mis-click closing a live account.
      if (confirmSlug.trim().toLowerCase() !== company.slug.toLowerCase()) {
        throw new Error(`Type the company address (${company.slug}) to confirm.`);
      }
      if (company.deletionRequestedAt) throw new Error('This account is already scheduled for deletion.');
      await prisma.company.update({
        where: { id: companyId },
        data: { deletionRequestedAt: new Date(), deletionRequestedById: companyUserId },
      });
      return true;
    },

    cancelCompanyDeletion: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      await prisma.company.update({
        where: { id: companyId },
        data: { deletionRequestedAt: null, deletionRequestedById: null },
      });
      return true;
    },

    removeMember: async (_: unknown, { userId }: { userId: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwner(ctx);
      if (userId === companyUserId) throw new Error('You cannot remove yourself');
      await prisma.companyMember.deleteMany({ where: { companyId, userId } });
      return true;
    },

    changeMemberRole: async (
      _: unknown,
      { userId, role }: { userId: string; role: string },
      ctx: Ctx
    ) => {
      const { companyId, companyUserId } = requireOwner(ctx);
      if (userId === companyUserId) throw new Error('You cannot change your own role');
      const member = await prisma.companyMember.update({
        where: { companyId_userId: { companyId, userId } },
        data: { role: role as any },
        include: { user: true },
      });
      return {
        id: member.id, userId: member.userId,
        email: member.user.email, name: member.user.name,
        role: member.role, joinedAt: member.createdAt.toISOString(),
      };
    },

    deleteCompanySubmission: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      await tenantSubmissions(companyId).delete(id);
      return true;
    },

    approveCompanySubmission: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      const scoped = tenantSubmissions(companyId);
      await scoped.getOwned(id);
      await assertApprovable(id);
      const m = await membershipOrThrow(companyId, companyUserId);
      const updated = await scoped.update(
        id,
        { status: 'APPROVED', reviewedById: companyUserId, reviewedByName: m.user.name, reviewedAt: new Date() },
        { overrides: true },
      );
      // The buyer used to hear nothing when the seller decided — only the
      // platform-admin path sent mail.
      await sendApproved(
        updated.email, `${updated.firstName} ${updated.lastName}`, m.company.name,
        await statementCopy(updated),
      ).catch(() => {});
      return updated;
    },

    // Re-open an already approved/denied submission back into the review queue.
    // Overrides are invalidated so a later edit can't ride an old bypass.
    reopenCompanySubmission: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireOwnerOrPlus(ctx);
      const scoped = tenantSubmissions(companyId);
      await scoped.getOwned(id);
      await prisma.submissionOverride.deleteMany({ where: { submissionId: id } });
      return scoped.update(
        id,
        { status: 'PENDING_REVIEW', adminNote: null, reviewedById: null, reviewedByName: null, reviewedAt: null },
        { overrides: true },
      );
    },

    updateFormConfig: async (_: unknown, { config }: { config: FormConfig }, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      // The GraphQL enum admits OPTIONAL even though FormConfig's type does not,
      // so this arrives as a real value from the wire and has to be refused.
      if ((config.idVerification as string) === 'OPTIONAL') {
        throw new Error('Identity verification can only be Required or Hidden.');
      }
      if (config.customTermsMode === 'TEXT' && !config.customTermsText?.trim()) {
        throw new Error('Please enter your terms text.');
      }
      if (config.customTermsMode === 'LINK') {
        const termsUrl = config.customTermsUrl?.trim();
        if (!termsUrl) throw new Error('Please enter a link to your terms page.');
        if (!/^https?:\/\//i.test(termsUrl)) {
          throw new Error('Terms & conditions link must start with http:// or https://');
        }
      }
      const clean = resolveConfig(config); // drops unknown keys / invalid values
      await prisma.company.update({ where: { id: companyId }, data: { formConfig: clean } });
      return clean;
    },

    denyCompanySubmission: async (
      _: unknown,
      { id, reason }: { id: string; reason: string },
      ctx: Ctx
    ) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      const m = await membershipOrThrow(companyId, companyUserId);
      const updated = await tenantSubmissions(companyId).update(
        id,
        { status: 'DENIED', adminNote: reason, reviewedById: companyUserId, reviewedByName: m.user.name, reviewedAt: new Date() },
        { overrides: true },
      );
      await sendDenied(
        updated.email, `${updated.firstName} ${updated.lastName}`, reason, m.company.name,
      ).catch(() => {});
      return updated;
    },

    recheckCompanySubmissionSubstance: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireOwnerOrPlus(ctx);
      if (!SUBSTANCE_CHECK_ENABLED) throw new Error('Substance check is not configured.');
      const updated = await tenantSubmissions(companyId).update(
        id,
        { substanceCheckStatus: 'PENDING' },
        { overrides: true },
      );
      void runSubstanceCheck(id);
      return updated;
    },

    overrideCompanySubmissionCheck: async (
      _: unknown,
      { id, category, reason }: { id: string; category: OverrideCategory; reason: string },
      ctx: Ctx
    ) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      await tenantSubmissions(companyId).getOwned(id);
      const m = await membershipOrThrow(companyId, companyUserId);
      return applyOverride(id, category, reason, companyUserId, m.user.name);
    },

    clearCompanySubmissionCheckOverride: async (
      _: unknown,
      { id, category }: { id: string; category: OverrideCategory },
      ctx: Ctx
    ) => {
      const { companyId } = requireOwnerOrPlus(ctx);
      await tenantSubmissions(companyId).getOwned(id);
      return clearOverride(id, category);
    },
  },
};
