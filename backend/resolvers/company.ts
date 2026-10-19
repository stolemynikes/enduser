import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import {
  sendCompanyInvite, sendApproved, sendDenied, sendPasswordReset, sendEmailVerification,
  sendAccessRequestToAdmin, ADMIN_INBOX,
} from '../services/email.ts';
import { REGISTRATION_OPEN, formOpen } from '../lib/access.ts';
import { consumeToken, issueToken } from '../lib/authTokens.ts';
import { hashToken, randomToken } from '../lib/tokens.ts';
import { mailBudgetAllows } from '../lib/mailBudget.ts';
import { DUMMY_HASH, LOCKED_MESSAGE, checkSecondFactorLimited, lockedFor, recordFailure, recordSuccess } from '../lib/loginGuard.ts';
import { verifyHumanOrThrow } from '../services/turnstile.ts';

import { statementCopy } from '../lib/statementCopy.ts';
import { resolveConfig, type FormConfig } from '../lib/formConfig.ts';
import { runSubstanceCheck } from './submission.ts';
import { SUBSTANCE_CHECK_ENABLED } from '../services/substanceCheck.ts';
import { assertApprovable, applyOverride, clearOverride } from '../lib/overrides.ts';
import { type OverrideCategory } from '../lib/approvalGate.ts';
import { tenantSubmissions } from '../lib/tenant.ts';
import { stripSensitiveAll } from '../lib/redact.ts';
import { DIDIT_ENABLED } from '../services/didit.ts';
import { notify } from '../lib/notifications.ts';
import {
  MFA_SELECT, checkSecondFactor, confirmEnrolment, disableMfa, issueRecoveryCodes,
  mfaEnabled, recoveryCodesLeft, startEnrolment,
} from '../lib/mfa.ts';
import { secondFactorError, mfaSetupRequiredError } from './auth.ts';
import { GraphQLError } from 'graphql';
import { checkCredential, revealDocumentNumber, revealHistory, revealsToday } from '../lib/reveal.ts';
import { buildBuyerExport, buyerStatementIds } from '../lib/buyerData.ts';
import { LEGAL_VERSION, acceptanceRecordPdf, legalStatus, recordAcceptance } from '../lib/legal.ts';
import { deleteSubmissions } from '../lib/submissionDelete.ts';
import {
  countPasskeys, finishAuthentication, finishRegistration, listPasskeys,
  removePasskey, startAuthentication, startRegistration,
} from '../lib/passkeys.ts';
import { findPriorApprovals } from '../lib/duplicates.ts';

type Ctx = {
  needsEnrolment?: boolean;
  companyUserId?: string;
  companyId?: string;
  companyRole?: string;
  /** Session the request came from, so a reveal can be attributed to a browser. */
  sessionId?: string;
  /** Set when platform staff are acting as this company. */
  support?: boolean;
  adminId?: string;
};

/**
 * Signed in, and allowed to do things.
 *
 * The enrolment check lives here because every company resolver already passes
 * through this one function — a guard added resolver by resolver is a guard
 * with a hole in it. The handful of operations somebody must be able to reach
 * *in order to* enrol use requireCompanyEnrolling instead.
 */
function requireCompany(ctx: Ctx) {
  const m = requireCompanyEnrolling(ctx);
  if (ctx.needsEnrolment) {
    throw new GraphQLError(
      'Set up two-factor authentication to continue.',
      { extensions: { code: 'MFA_ENROLMENT_REQUIRED' } },
    );
  }
  return m;
}

/** Signed in, without the enrolment requirement — for the enrolment screens. */
function requireCompanyEnrolling(ctx: Ctx) {
  if (!ctx.companyUserId || !ctx.companyId) throw new Error('Unauthorized');
  return { companyUserId: ctx.companyUserId, companyId: ctx.companyId, role: ctx.companyRole! };
}

function requireOwner(ctx: Ctx) {
  const m = requireCompany(ctx);
  if (m.role !== 'OWNER') throw new Error('Owner access required');
  return m;
}

/**
 * What every buyer-data request must pass, in this order: not a support
 * session (platform staff do not take buyers' data out or delete it on a
 * seller's behalf), the statement belongs to this tenant, and a current
 * second-factor code — a stolen session alone must not be enough to carry a
 * buyer's whole history away or to erase it.
 */
async function buyerRequestGate(ctx: Ctx, companyId: string, companyUserId: string, id: string, credential: string) {
  if (ctx.support) throw new GraphQLError('Not available in a support session.', { extensions: { code: 'FORBIDDEN' } });
  const anchor = await tenantSubmissions(companyId).getOwned(id);
  const m = await membershipOrThrow(companyId, companyUserId);
  const check = await checkCredential('companyUser', companyUserId, typeof credential === 'string' ? credential : '');
  if (!check.ok) throw check.reason === 'no-credential' ? mfaSetupRequiredError() : secondFactorError(check.reason);
  return { anchor, m };
}

async function recordBuyerAction(companyId: string, userId: string, userName: string, kind: 'EXPORT' | 'ERASURE', statements: number) {
  // Not caught: an export or erasure that cannot be written down is refused
  // after the fact by surfacing the error, rather than going unrecorded.
  await prisma.buyerDataAction.create({
    data: { companyId, userId, userName: userName.slice(0, 200), kind, statements },
  });
}

function requireOwnerOrPlus(ctx: Ctx) {
  const m = requireCompany(ctx);
  if (m.role !== 'OWNER' && m.role !== 'EMPLOYEE_PLUS') throw new Error('Insufficient permissions');
  return m;
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
  // The other public pages, and the account routes that were missing here: a
  // company called "Reset" would otherwise have taken /reset/... from everyone.
  'docs', 'privacy', 'terms', 'dpa', 'how-it-works', 'legal', 'help', 'contact',
  'security', 'about', 'pricing', 'status',
  'forgot', 'reset', 'verify', 'health', 'robots.txt', 'security-policy.txt',
  // Retired in-house OCR routes — still reserved so an old link can never be
  // shadowed by a company form.
  'extract-id', 'phone-session', 'phone-capture', 'phone-result',
]);

// Slugs are derived from the company name and not user-editable: on a reserved
// word or collision, append -2, -3, … instead of failing registration.
//
// Bounded, because the counting version was one database round trip per
// collision with no ceiling — so a few hundred companies all called "Test"
// made every later registration slower than the one before it. After a few
// tries it stops counting and takes a random suffix, which collides with
// nothing in practice and costs one query.
const SLUG_ATTEMPTS = 8;

async function availableSlug(base: string) {
  const taken = async (candidate: string) =>
    RESERVED_SLUGS.has(candidate)
    || (await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } })) != null;

  if (!(await taken(base))) return base;

  for (let n = 2; n <= SLUG_ATTEMPTS; n++) {
    const candidate = `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }

  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    if (!(await taken(candidate))) return candidate;
  }
  throw new Error('Could not allocate an address for this company. Please try a different name.');
}

const APP_URL = () => (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

/** Minimum gap between manual substance re-runs for one submission. */
const RECHECK_COOLDOWN_MS = 30_000;

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

/** The role names people see; the enum values stay as stored. */
const ROLE_NAMES: Record<string, string> = { OWNER: 'Owner', EMPLOYEE_PLUS: 'Reviewer', EMPLOYEE: 'Viewer' };
function roleName(role: string): string {
  return ROLE_NAMES[role] ?? role;
}

function buildAuthPayload(token: string, company: { id: string; name: string; slug: string }, role: string) {
  return { token, company: { id: company.id, name: company.name, slug: company.slug }, role };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * One canonical form for every address this server stores or looks up.
 *
 * Without it, "Victim@Example.com" and "victim@example.com" are two different
 * accounts in Postgres: an invite addressed to the capitalised form missed the
 * existing account entirely and created a second one, so the password check
 * that is supposed to prove ownership had nothing to check against.
 */
function normalizeEmail(raw: unknown): string {
  const address = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!address || address.length > EMAIL_MAX || !EMAIL_RE.test(address)) {
    throw new Error('Please enter a valid email address.');
  }
  return address;
}

/** Free text that will be stored, rendered in a dashboard, or put in an email. */
function boundedText(raw: unknown, max: number, label: string): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) throw new Error(`${label} is required.`);
  if (value.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return value;
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
      const { companyId } = requireCompany(ctx);
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
      return stripSensitiveAll(rows);
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

    /**
     * The bell's contents. Scoped to this tenant, and to messages addressed to
     * everyone or to this person specifically.
     */
    notifications: async (_: unknown, { limit }: { limit?: number }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireCompany(ctx);
      const rows = await prisma.notification.findMany({
        where: {
          companyId,
          OR: [{ userId: null }, { userId: companyUserId }],
          NOT: { dismissedBy: { has: companyUserId } },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit ?? 30, 1), 100),
      });
      return rows.map(n => ({
        id: n.id, kind: n.kind, title: n.title, body: n.body,
        submissionId: n.submissionId,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      }));
    },

    /**
     * Who decided what, for the owner's Activity page. Read straight off the
     * statements' own review fields, so it is the current decision on each one
     * (a reopened statement drops out until it is decided again). Test
     * submissions stay out. reviewerName is null where it was never recorded.
     */
    teamDecisions: async (
      _: unknown,
      { search, reviewerId, decision, from, to, offset, limit }:
        { search?: string; reviewerId?: string; decision?: string; from?: string; to?: string; offset?: number; limit?: number },
      ctx: Ctx,
    ) => {
      const { companyId } = requireOwner(ctx);
      // Names and emails are encrypted at rest, so they cannot be matched in
      // SQL: the decided statements are read (decrypted) and filtered here.
      // Capped, which is far beyond what one seller decides in the 18 months
      // a statement is kept.
      const rows = await tenantSubmissions(companyId).findMany({
        where: {
          status: decision === 'APPROVED' || decision === 'DENIED' ? decision : { in: ['APPROVED', 'DENIED'] },
          isTest: false,
          ...(reviewerId === 'NONE' ? { reviewedById: null } : reviewerId ? { reviewedById: reviewerId } : {}),
        },
        orderBy: [{ reviewedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        take: 5000,
        include: { _count: { select: { overrides: true } } },
      });
      const day = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
      const fromDay = day(from), toDay = day(to);
      const needle = (search ?? '').trim().toLowerCase().slice(0, 100);
      const all = rows
        .map((s: any) => ({
          submissionId: s.id,
          reviewerId: s.reviewedById,
          buyerName: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Unknown buyer',
          email: s.email ?? '',
          orderNumber: s.orderNumber || null,
          decision: s.status,
          reviewerName: s.reviewedByName,
          decidedAt: (s.reviewedAt ?? s.updatedAt).toISOString(),
          reason: s.status === 'DENIED' ? s.adminNote : null,
          overrides: s._count?.overrides ?? 0,
        }))
        .filter(d => {
          const date = d.decidedAt.slice(0, 10);
          if (fromDay && date < fromDay) return false;
          if (toDay && date > toDay) return false;
          if (!needle) return true;
          return [d.buyerName, d.email, d.orderNumber ?? ''].some(v => v.toLowerCase().includes(needle));
        });
      const start = Math.max(offset ?? 0, 0);
      const size = Math.min(Math.max(limit ?? 20, 1), 100);
      return {
        total: all.length,
        items: all.slice(start, start + size).map(({ email: _email, ...d }) => d),
      };
    },

    supportAdminHasSecondFactor: async (_: unknown, __: unknown, ctx: Ctx) => {
      requireCompany(ctx);
      if (!ctx.support || !ctx.adminId) return false;
      const admin = await prisma.admin.findUnique({ where: { id: ctx.adminId }, select: { id: true, ...MFA_SELECT } });
      return !!admin && mfaEnabled(admin);
    },

    companySubmission: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireCompany(ctx);
      const rows = await tenantSubmissions(companyId).findMany({
        where: { id }, include: { overrides: true }, take: 1,
      });
      return stripSensitiveAll(rows)[0] ?? null;
    },

    /** Just the number behind the dot — cheap enough to poll. */
    unreadNotificationCount: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId, companyUserId } = requireCompany(ctx);
      return prisma.notification.count({
        where: {
          companyId, readAt: null,
          OR: [{ userId: null }, { userId: companyUserId }],
          NOT: { dismissedBy: { has: companyUserId } },
        },
      });
    },

    /**
     * Earlier approvals that look like this request. Read when a reviewer opens
     * a submission, so the panel can say "you approved this in March" next to
     * the approve button.
     */
    priorApprovals: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireCompany(ctx);
      const submission = await tenantSubmissions(companyId).getOwned(id);
      return findPriorApprovals(submission as Parameters<typeof findPriorApprovals>[0]);
    },

    /**
     * Who looked at a document number, and when. Owner only: it is a record of
     * what the people in this company did, so it belongs to whoever is
     * accountable for them.
     */
    revealLog: async (_: unknown, { limit }: { limit?: number }, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      return revealHistory(companyId, limit ?? 50);
    },

    myPasskeys: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompanyEnrolling(ctx);
      return listPasskeys('companyUser', companyUserId);
    },

    /** The last day's count, for the badge on the account screen. */
    revealsToday: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireCompany(ctx);
      return revealsToday(companyId);
    },

    /** What the browser needs before anyone has signed in. */
    publicConfig: () => ({ turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? null }),

    formInfo: async (_: unknown, { slug }: { slug: string }) => {
      const company = await prisma.company.findUnique({ where: { slug } });
      if (!company || company.deletedAt) return null;
      return {
        companyName: company.name,
        // Configured, approved and the owner's address confirmed — see lib/access.ts.
        configured: company.formConfig != null && await formOpen(company.id),
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
      const { companyUserId } = requireCompanyEnrolling(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId },
        select: { id: true, email: true, name: true, emailVerifiedAt: true, ...MFA_SELECT },
      });
      if (!user) throw new Error('Membership not found');
      const enabled = mfaEnabled(user);
      return {
        id: user.id, email: user.email, name: user.name,
        emailVerified: user.emailVerifiedAt != null,
        mfaEnabled: enabled,
        recoveryCodesLeft: enabled ? await recoveryCodesLeft('companyUser', user.id) : 0,
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

    companyLegal: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireCompany(ctx);
      return legalStatus(companyId);
    },

    legalAcceptanceRecord: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyId } = requireOwner(ctx);
      return acceptanceRecordPdf(companyId, APP_URL());
    },
  },

  Mutation: {
    registerCompany: async (
      _: unknown,
      { name, slug, email, password, yourName, turnstileToken, requestNote, legalVersion }:
        { name: string; slug: string; email: string; password: string; yourName: string; turnstileToken?: string; requestNote?: string; legalVersion?: string }
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      // Agreement is to a specific text. A page left open across an update
      // showed the old one, so the applicant is asked to look again.
      if (legalVersion !== LEGAL_VERSION) {
        throw new GraphQLError('Our terms were updated while this page was open. Reload it, read them, and agree again.', { extensions: { code: 'LEGAL_VERSION' } });
      }
      // The company name is shown on a public form and inside every email this
      // tenant causes to be sent, so it is bounded here rather than wherever it
      // is rendered.
      const companyName = boundedText(name, 120, 'Company name');
      const ownerName = boundedText(yourName, 120, 'Your name');
      const slugBase = slug.toLowerCase().slice(0, 100).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slugBase) throw new Error('Invalid slug');
      const slugClean = await availableSlug(slugBase);

      assertPasswordStrength(password);

      const address = normalizeEmail(email);
      const existingUser = await prisma.companyUser.findUnique({ where: { email: address } });
      if (existingUser) {
        // Deliberately vague: telling a stranger which addresses have accounts
        // is an enumeration oracle, and login and reset are already careful.
        throw new Error('That account could not be created. If you already have one, sign in instead.');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const note = typeof requestNote === 'string' ? requestNote.trim().slice(0, 1000) || null : null;

      const company = await prisma.company.create({
        data: {
          name: companyName,
          slug: slugClean,
          requestNote: note,
          // Registration is a request; see lib/access.ts.
          approvedAt: REGISTRATION_OPEN ? new Date() : null,
          members: {
            create: {
              role: 'OWNER',
              user: {
                create: { email: address, passwordHash, name: ownerName },
              },
            },
          },
        },
      });

      const member = await prisma.companyMember.findFirst({ where: { companyId: company.id }, include: { user: true } });
      await recordAcceptance(company.id, member!.user);
      void sendVerification(member!.user);
      if (!REGISTRATION_OPEN) {
        // One message per request to the platform admin. Budgeted per recipient
        // like every other mail, so a burst of sign-ups cannot become a burst
        // of mail.
        if (await mailBudgetAllows(ADMIN_INBOX, 'access-request')) {
          void sendAccessRequestToAdmin(companyName, ownerName, address, note).catch(() => {});
        }
      }
      const token = signCompanyToken({ companyUserId: member!.userId, companyId: company.id, role: 'OWNER' });
      return buildAuthPayload(token, company, 'OWNER');
    },

    companyLogin: async (
      _: unknown,
      { email, password, turnstileToken, totp }:
        { email: string; password: string; turnstileToken?: string; totp?: string },
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const user = address
        ? await prisma.companyUser.findUnique({
            where: { email: address },
            include: { memberships: { include: { company: true } } },
          })
        : null;


      const minutes = lockedFor(user);

      // Always run a comparison, so an unknown address and a wrong password
      // take the same time and cannot be told apart.
      const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

      // The lockout notice is only shown to someone who got the password right.
      // Announcing it to a wrong guess turned the lock into an oracle: it said
      // "this address has an account, and someone is attacking it".
      if (!user || !valid) {
        if (user && minutes === 0) await recordFailure('companyUser', user);
        throw new Error('Invalid email or password');
      }
      if (minutes > 0) throw new Error(LOCKED_MESSAGE(minutes));

      // Only now, with the password already proved. Asking for a code before
      // that would tell a guesser which accounts have a second factor.
      const second = await checkSecondFactor('companyUser', user, totp);
      if (!second.ok) {
        // A wrong code spends the same budget as a wrong password; a code not
        // yet given does not.
        if (second.reason === 'invalid') await recordFailure('companyUser', user);
        throw secondFactorError(second.reason);
      }
      if (second.usedRecoveryCode) {
        console.warn(`[mfa] user ${user.id} signed in with a recovery code`);
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
      const address = normalizeEmail(email);

      const m = await membershipOrThrow(companyId, companyUserId);
      const company = m.company;
      const inviterName = m.user.name;

      // Inviting is an outbound email, in this tenant's name, to an address the
      // tenant chose. Registration is free and instant, so the only thing that
      // separates a seller from a phishing operator here is having proved they
      // own the address they signed up with.
      if (!m.user.emailVerifiedAt) {
        throw new Error('Confirm your own email address before inviting colleagues.');
      }

      // Two budgets: one so a single inbox cannot be targeted repeatedly, one
      // so a tenant cannot spray many inboxes once each.
      if (!(await mailBudgetAllows(companyId, 'invite-tenant'))) {
        throw new Error('Too many invitations sent recently. Try again tomorrow.');
      }
      if (!(await mailBudgetAllows(address, 'invite'))) {
        throw new Error('An invitation was already sent to that address recently.');
      }

      // Delete any existing unused invite for this email+company
      await prisma.companyInvite.deleteMany({ where: { companyId, email: address, usedAt: null } });

      // The raw token exists in the email and nowhere else; only its hash is
      // stored, and it carries no structure an attacker can learn from.
      const inviteToken = randomToken();
      const invite = await prisma.companyInvite.create({
        data: {
          companyId,
          email: address,
          role: role as any,
          tokenHash: hashToken(inviteToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      const inviteUrl = `${frontendUrl}/invite/${inviteToken}`;

      await sendCompanyInvite(address, inviterName, company.name, inviteUrl).catch(() => {});

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
      const memberName = boundedText(name, 120, 'Your name');

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
        user = await prisma.companyUser.create({ data: { email: invite.email, passwordHash, name: memberName } });
      }

      // Add membership (or update role if already a member)
      await prisma.companyMember.upsert({
        where: { companyId_userId: { companyId: invite.companyId, userId: user.id } },
        create: { companyId: invite.companyId, userId: user.id, role: invite.role },
        update: { role: invite.role },
      });

      await prisma.companyInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

      void notify({
        companyId: invite.companyId,
        kind: 'INVITE_ACCEPTED',
        title: 'An invitation was accepted',
        body: `${memberName} joined as ${roleName(invite.role)}.`,
      });

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
      const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
      // Still returns true for a malformed address: which addresses this
      // endpoint considers valid is not information it needs to give away.
      const user = address && EMAIL_RE.test(address) && address.length <= EMAIL_MAX
        ? await prisma.companyUser.findUnique({
            where: { email: address },
            select: { id: true, email: true, name: true },
          })
        : null;
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

    startPasskeyRegistration: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompanyEnrolling(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId }, select: { email: true },
      });
      if (!user) throw new Error('Membership not found');
      return startRegistration('companyUser', companyUserId, user.email);
    },

    finishPasskeyRegistration: async (
      _: unknown,
      { ticket, responseJson, name }: { ticket: string; responseJson: string; name: string },
      ctx: Ctx,
    ) => {
      const { companyUserId } = requireCompanyEnrolling(ctx);
      const result = await finishRegistration({
        kind: 'companyUser', id: companyUserId, ticket, responseJson,
        name: boundedText(name, 60, 'A name for this passkey'),
      });
      if (!result.ok) {
        throw new Error(
          result.reason === 'bad-ticket' ? 'That set-up attempt expired — start again.'
          : result.reason === 'duplicate' ? 'That device is already enrolled.'
          : 'The browser could not complete the set-up. Try again.',
        );
      }
      const all = await listPasskeys('companyUser', companyUserId);
      return all.find(p => p.id === result.passkeyId) ?? all[all.length - 1];
    },

    /**
     * Removing the last factor is refused while a second factor is required,
     * because the next sign-in would have nothing to offer.
     */
    removePasskey: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyUserId } = requireCompany(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId }, select: { totpEnabledAt: true },
      });
      const keys = await countPasskeys('companyUser', companyUserId);
      if (keys <= 1 && !user?.totpEnabledAt) {
        throw new Error(
          'That is your only second factor. Add an authenticator app or another passkey first.',
        );
      }
      return removePasskey('companyUser', companyUserId, id);
    },

    /**
     * Proves the password, then hands back a challenge the browser can sign.
     *
     * Split in two because a passkey needs a server challenge before the
     * browser can do anything — unlike a code, which the person simply types.
     * Nothing useful comes back without the correct password, so this is not a
     * way to discover which accounts have passkeys.
     */
    beginPasskeyLogin: async (
      _: unknown,
      { email, password, turnstileToken }: { email: string; password: string; turnstileToken?: string },
    ) => {
      await verifyHumanOrThrow(turnstileToken);
      const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const user = address
        ? await prisma.companyUser.findUnique({ where: { email: address } })
        : null;

      const minutes = lockedFor(user);
      const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid) {
        if (user && minutes === 0) await recordFailure('companyUser', user);
        throw new Error('Invalid email or password');
      }
      if (minutes > 0) throw new Error(LOCKED_MESSAGE(minutes));

      const challenge = await startAuthentication('companyUser', user.id);
      if (!challenge) throw new Error('This account has no passkey. Use your authenticator app.');
      return challenge;
    },

    finishPasskeyLogin: async (
      _: unknown,
      { ticket, responseJson }: { ticket: string; responseJson: string },
    ) => {
      const outcome = await finishAuthentication({ ticket, responseJson });
      if (!outcome.ok) {
        // One message for every failure: which part went wrong is not
        // something an unauthenticated caller gets to learn.
        throw new Error('That passkey could not be verified. Try again.');
      }
      const user = await prisma.companyUser.findUnique({
        where: { id: outcome.accountId },
        include: { memberships: { include: { company: true } } },
      });
      if (!user) throw new Error('Invalid email or password');
      await recordSuccess('companyUser', user.id);

      const live = user.memberships.filter(m => m.company.deletedAt == null);
      if (live.length === 0) throw new Error('No company membership found');
      const membership = live[0];
      console.log(`[passkey] user ${user.id} signed in with "${outcome.passkeyName}"`);
      const token = signCompanyToken({
        companyUserId: user.id, companyId: membership.companyId, role: membership.role,
      });
      return buildAuthPayload(token, membership.company, membership.role);
    },

    /** A passkey satisfies the reveal as well as a code does. */
    startRevealWithPasskey: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      await tenantSubmissions(companyId).getOwned(id);
      const challenge = await startAuthentication('companyUser', companyUserId);
      if (!challenge) throw new Error('This account has no passkey.');
      return challenge;
    },

    finishRevealWithPasskey: async (
      _: unknown,
      { id, ticket, responseJson }: { id: string; ticket: string; responseJson: string },
      ctx: Ctx,
    ) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      const submission = await tenantSubmissions(companyId).getOwned(id);
      const outcome = await finishAuthentication({ ticket, responseJson });
      // The assertion is bound to an account by its ticket, so this also
      // refuses a signature made by somebody else's passkey.
      if (!outcome.ok || outcome.accountId !== companyUserId) {
        throw new Error('That passkey could not be verified. Try again.');
      }
      const m = await membershipOrThrow(companyId, companyUserId);
      await prisma.revealLog.create({
        data: {
          companyId, submissionId: id, userId: companyUserId,
          userName: m.user.name.slice(0, 200),
          sessionId: ctx.sessionId ?? null,
          adminId: ctx.support ? ctx.adminId ?? null : null,
        },
      }).catch(() => {});
      return { submissionId: id, documentNumber: submission.idDocumentNumber };
    },

    /**
     * Step one of enrolment: a secret the app can scan, not yet in force. The
     * factor only switches on when a code proves the app really has it —
     * enabling on the strength of a scan alone is how people lock themselves
     * out of their own account.
     */
    startMfaEnrolment: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompanyEnrolling(ctx);
      const user = await prisma.companyUser.findUnique({
        where: { id: companyUserId }, select: { email: true, totpEnabledAt: true },
      });
      if (!user) throw new Error('Membership not found');
      if (user.totpEnabledAt) {
        throw new Error('Two-factor authentication is already on. Turn it off first to re-enrol.');
      }
      return startEnrolment('companyUser', companyUserId, user.email);
    },

    /** Step two: switch it on, and hand over the recovery codes exactly once. */
    confirmMfaEnrolment: async (_: unknown, { code }: { code: string }, ctx: Ctx) => {
      const { companyUserId, companyId, role } = requireCompanyEnrolling(ctx);
      const result = await confirmEnrolment('companyUser', companyUserId, code);
      if (!result.ok) {
        throw result.reason === 'not-started'
          ? new Error('Start the set-up again — no pending secret was found.')
          : secondFactorError('invalid');
      }
      // Enabling ended every session, this one included. A replacement keeps
      // the person who just enrolled signed in while evicting everyone else —
      // which is the point when someone enables this because they suspect
      // their account is already in the wrong hands.
      return {
        recoveryCodes: result.recoveryCodes,
        token: signCompanyToken({ companyUserId, companyId, role }),
      };
    },

    /**
     * Turning it off needs the password and a current code. Either alone would
     * make a stolen session enough to strip the very factor that session was
     * supposed to be protected by.
     */
    disableMfa: async (
      _: unknown, { password, code }: { password: string; code: string }, ctx: Ctx,
    ) => {
      const { companyUserId } = requireCompany(ctx);
      const user = await prisma.companyUser.findUnique({ where: { id: companyUserId } });
      if (!user) throw new Error('Membership not found');
      if (!mfaEnabled(user)) return true;
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        throw new Error('That password is not correct.');
      }
      const second = await checkSecondFactorLimited('companyUser', user, code);
      if (!second.ok) throw secondFactorError(second.reason);
      await disableMfa('companyUser', companyUserId);
      return true;
    },

    /** Replaces the remaining codes with a fresh set, on a current code. */
    regenerateRecoveryCodes: async (_: unknown, { code }: { code: string }, ctx: Ctx) => {
      const { companyUserId } = requireCompany(ctx);
      const user = await prisma.companyUser.findUnique({ where: { id: companyUserId } });
      if (!user || !mfaEnabled(user)) throw new Error('Two-factor authentication is not on.');
      const second = await checkSecondFactorLimited('companyUser', user, code);
      if (!second.ok) throw secondFactorError(second.reason);
      return { recoveryCodes: await issueRecoveryCodes('companyUser', companyUserId) };
    },

    /**
     * Hands back one submission's identity document number.
     *
     * Reviewers are allowed to see it — the point is that a session alone is
     * not enough, so a stolen one (which is what a phishing proxy and malware
     * both produce, with the second factor already passed) cannot read the
     * tenant's numbers. Viewers cannot reveal at all; that has always
     * been true and stays true.
     */
    revealDocumentNumber: async (
      _: unknown,
      { id, credential }: { id: string; credential: string },
      ctx: Ctx,
    ) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      // Tenant ownership is settled before anything else, by the wrapper that
      // injects the filter structurally.
      const submission = await tenantSubmissions(companyId).getOwned(id);
      const m = await membershipOrThrow(companyId, companyUserId);

      const outcome = await revealDocumentNumber({
        submission,
        companyId,
        userId: companyUserId,
        userName: m.user.name,
        sessionId: ctx.sessionId,
        adminId: ctx.support ? ctx.adminId : null,
        // In a support session it is the admin's own factor that counts, not
        // the owner's: the admin is the one asking.
        asAdmin: !!ctx.support,
        credential,
      });
      if (!outcome.ok) {
        throw outcome.reason === 'no-credential'
          ? mfaSetupRequiredError()
          : secondFactorError(outcome.reason);
      }
      return { submissionId: id, documentNumber: outcome.documentNumber };
    },

    acceptLegal: async (_: unknown, { version }: { version: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwner(ctx);
      // Platform staff cannot agree to a contract on a seller's behalf.
      if (ctx.support) throw new GraphQLError('Not available in a support session.', { extensions: { code: 'FORBIDDEN' } });
      if (version !== LEGAL_VERSION) {
        throw new GraphQLError('The terms changed again since this page loaded. Reload it and review the latest version.', { extensions: { code: 'LEGAL_VERSION' } });
      }
      const m = await membershipOrThrow(companyId, companyUserId);
      await recordAcceptance(companyId, m.user);
      return legalStatus(companyId);
    },

    exportBuyerData: async (_: unknown, { id, credential }: { id: string; credential: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwnerOrPlus(ctx);
      const { anchor, m } = await buyerRequestGate(ctx, companyId, companyUserId, id, credential);
      const ids = await buyerStatementIds(companyId, anchor);
      const out = await buildBuyerExport(companyId, ids, APP_URL());
      await recordBuyerAction(companyId, companyUserId, m.user.name, 'EXPORT', out.statements);
      return out;
    },

    eraseBuyerData: async (_: unknown, { id, credential }: { id: string; credential: string }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireOwner(ctx);
      const { anchor, m } = await buyerRequestGate(ctx, companyId, companyUserId, id, credential);
      const ids = await buyerStatementIds(companyId, anchor);
      // Written down first: an erasure that cannot be recorded does not happen.
      await recordBuyerAction(companyId, companyUserId, m.user.name, 'ERASURE', ids.length);
      // Scoped by companyId as well as by id: the ids came from this tenant,
      // and the filter makes sure nothing else can be in the set.
      const { count, sessionFailures } = await deleteSubmissions({ id: { in: ids }, companyId });
      if (sessionFailures) console.error(`[erasure] ${sessionFailures} Didit session(s) could not be deleted for company ${companyId}`);
      return count;
    },

    markNotificationsRead: async (_: unknown, { ids }: { ids?: string[] }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireCompany(ctx);
      // Scoped by tenant and addressee, so an id from another company's stream
      // marks nothing.
      const { count } = await prisma.notification.updateMany({
        where: {
          companyId,
          readAt: null,
          OR: [{ userId: null }, { userId: companyUserId }],
          ...(ids && ids.length > 0 ? { id: { in: ids.slice(0, 200) } } : {}),
        },
        data: { readAt: new Date() },
      });
      return count;
    },

    clearNotifications: async (_: unknown, { ids }: { ids?: string[] }, ctx: Ctx) => {
      const { companyId, companyUserId } = requireCompany(ctx);
      // Hidden for this person only, scoped like markNotificationsRead so an id
      // from another company's stream clears nothing.
      const { count } = await prisma.notification.updateMany({
        where: {
          companyId,
          OR: [{ userId: null }, { userId: companyUserId }],
          NOT: { dismissedBy: { has: companyUserId } },
          ...(ids && ids.length > 0 ? { id: { in: ids.slice(0, 200) } } : {}),
        },
        data: { dismissedBy: { push: companyUserId } },
      });
      return count;
    },

    resendEmailVerification: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId } = requireCompanyEnrolling(ctx);
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
     * Extends the current session without a new sign-in.
     *
     * Seller tokens used to live 30 days, which is how long a token captured by
     * a phishing proxy kept working — and a proxy that relays the sign-in live
     * is precisely what a one-time code does not stop. They now last a day and
     * are renewed while somebody is working, so a daily user never notices and
     * a captured token is stale by tomorrow.
     *
     * Renewal is not a free pass: it runs through the same context as every
     * other request, so a removed member, a demoted role, a closed company or a
     * password reset all stop it. The session id is carried over rather than
     * reminted, so renewing does not look like a new browser in the audit trail.
     */
    refreshSession: async (_: unknown, __: unknown, ctx: Ctx) => {
      const { companyUserId, companyId, role } = requireCompanyEnrolling(ctx);
      const membership = await prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId, userId: companyUserId } },
        include: { company: true },
      });
      if (!membership || membership.company.deletedAt) throw new Error('Unauthorized');
      // A support session is deliberately short and is not extendable — that
      // is the point of giving platform staff two hours rather than a day.
      if (ctx.support) throw new Error('Support sessions cannot be extended.');
      const token = signCompanyToken({
        companyUserId, companyId, role, sid: ctx.sessionId,
      });
      return buildAuthPayload(token, membership.company, role);
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
      // Addressed to the one person it concerns. They can still log in, which
      // is exactly why this belongs in the bell and not in their email.
      void notify({
        companyId, userId,
        kind: 'ROLE_CHANGED',
        title: 'Your role changed',
        body: `You are now ${roleName(member.role)} in this company.`,
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
      // Goes into the buyer's email and the stored note — bound it at the edge.
      const note = boundedText(reason, 1000, 'A reason');
      const m = await membershipOrThrow(companyId, companyUserId);
      const updated = await tenantSubmissions(companyId).update(
        id,
        { status: 'DENIED', adminNote: note, reviewedById: companyUserId, reviewedByName: m.user.name, reviewedAt: new Date() },
        { overrides: true },
      );
      await sendDenied(
        updated.email, `${updated.firstName} ${updated.lastName}`, note, m.company.name,
      ).catch(() => {});
      return updated;
    },

    recheckCompanySubmissionSubstance: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const { companyId } = requireOwnerOrPlus(ctx);
      if (!SUBSTANCE_CHECK_ENABLED) throw new Error('Substance check is not configured.');
      const scoped = tenantSubmissions(companyId);
      const current = await scoped.getOwned(id);
      // Each re-run is outbound work against PubChem. A button held down was an
      // unbounded amplifier pointed at them, in this platform's name, so a run
      // already in flight and a run that just finished both refuse a new one.
      if (current.substanceCheckStatus === 'PENDING') {
        throw new Error('The substance check is already running.');
      }
      if (current.substanceCheckedAt && Date.now() - current.substanceCheckedAt.getTime() < RECHECK_COOLDOWN_MS) {
        throw new Error('This check just ran — wait a moment before running it again.');
      }
      const updated = await scoped.update(
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
      const why = boundedText(reason, 1000, 'A reason');
      await tenantSubmissions(companyId).getOwned(id);
      const m = await membershipOrThrow(companyId, companyUserId);
      return applyOverride(id, category, why, companyUserId, m.user.name);
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
