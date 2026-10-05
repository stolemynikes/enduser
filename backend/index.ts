import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { PrismaRateLimitStore, pruneRateLimits } from './lib/rateLimitStore.ts';
import cron from 'node-cron';
import crypto from 'node:crypto';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import depthLimit from 'graphql-depth-limit';
import { costLimit } from './lib/queryCost.ts';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema.ts';
import { submissionResolvers, runSubstanceCheck } from './resolvers/submission.ts';
import { SUBSTANCE_CHECK_ENABLED } from './services/substanceCheck.ts';
import { authResolvers } from './resolvers/auth.ts';
import { companyResolvers } from './resolvers/company.ts';
import { adminResolvers } from './resolvers/admin.ts';
import { contextFor } from './lib/authContext.ts';
import {
  DIDIT_ENABLED,
  createVerificationSession,
  retrieveDecision,
  deleteSession,
} from './services/didit.ts';
import {
  checkCapacity,
  cacheStatus,
  cachedStatus,
  isKnownSession,
  pruneSessions,
  registerSession,
  shouldRefresh,
} from './services/diditSessionStore.ts';
import { WEBHOOK_CONFIGURED, claimEvent, pruneEvents, verifyWebhook } from './services/diditWebhook.ts';
import { purgeDeletedCompanies, DELETION_GRACE_DAYS, RETENTION_MONTHS } from './lib/retention.ts';
import { pruneAuthTokens } from './lib/authTokens.ts';
import { pruneMailBudget } from './lib/mailBudget.ts';
import { prisma } from './lib/prisma.ts';
import { pseudonym } from './lib/tokens.ts';

// Is this instance reachable by someone who is not sitting at this machine?
//
// NODE_ENV is a developer's convenience, and it was still "development" on an
// instance published to the internet through a tunnel — which quietly means
// introspection on, stack traces with absolute paths in every error, and the
// backend's own CSP switched off. The deployment answers that question better
// than the environment name does: if the public URL is not a loopback address,
// the hardening is on regardless of NODE_ENV.
function publiclyReachable(): boolean {
  const url = process.env.FRONTEND_URL;
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i.test(hostname) && !hostname.endsWith('.local');
  } catch {
    return false;
  }
}

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_EXPOSED = IS_PROD || publiclyReachable();
// Everything that leaks schema or internals keys off this, not off NODE_ENV.
const HARDENED = IS_EXPOSED;

// A signing secret decides who is an administrator, so its strength is checked
// at boot the same way the encryption key's format is.
const MIN_SECRET_LENGTH = 32;
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required`);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters (generate with: openssl rand -hex 32)`);
  }
  return value;
}
const JWT_SECRET = requireSecret('JWT_SECRET');
const COMPANY_SECRET = requireSecret('COMPANY_JWT_SECRET');

// Two token audiences, two keys. Set to the same value, a company token would
// be handed to the admin verifier (and vice versa) and the separation between
// "runs this tenant" and "runs the platform" would rest on nothing but which
// claims happen to be present.
if (JWT_SECRET === COMPANY_SECRET) {
  throw new Error('JWT_SECRET and COMPANY_JWT_SECRET must be different values');
}
if (process.env.ENCRYPTION_KEY === JWT_SECRET || process.env.ENCRYPTION_KEY === COMPANY_SECRET) {
  throw new Error('ENCRYPTION_KEY must not be reused as a signing secret');
}

// Behind more proxies than this, X-Forwarded-For can be forged and every
// IP-keyed limit evaded; behind fewer, every client looks like the proxy.
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 1);
if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}

const ALLOWED_ORIGIN: string | false = process.env.FRONTEND_URL ?? (IS_EXPOSED ? false : '*');

// Where Didit sends the buyer back after the hosted flow. It only needs to be
// a page that tells them to return to the form — no result is read from it.
const VERIFICATION_CALLBACK = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL.replace(/\/+$/, '')}/verification-complete`
  : undefined;

const resolvers = {
  // Prisma returns Date objects; the String scalar would coerce them to epoch
  // millis, which the dashboards can't parse — serialize to ISO 8601 instead.
  Submission: {
    createdAt: (s: { createdAt: Date | string }) =>
      s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    substanceCheckedAt: (s: { substanceCheckedAt?: Date | string | null }) =>
      s.substanceCheckedAt instanceof Date ? s.substanceCheckedAt.toISOString() : s.substanceCheckedAt ?? null,
    idDocumentExpiry: (s: { idDocumentExpiry?: Date | string | null }) =>
      s.idDocumentExpiry instanceof Date ? s.idDocumentExpiry.toISOString() : s.idDocumentExpiry ?? null,
    reviewedAt: (s: { reviewedAt?: Date | string | null }) =>
      s.reviewedAt instanceof Date ? s.reviewedAt.toISOString() : s.reviewedAt ?? null,
    /**
     * The identity document number never leaves with a query — not for any
     * role, not from any resolver.
     *
     * Stripped here rather than in each resolver on purpose: a submission is
     * returned by a dozen queries and mutations, and the one that gets
     * forgotten is the one an attacker finds. It comes back only from
     * revealDocumentNumber, which demands a fresh second factor and records
     * the access. See lib/reveal.ts.
     */
    idDocumentNumber: () => null,
  },
  SubmissionOverride: {
    createdAt: (o: { createdAt: Date | string }) =>
      o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
  },
  // formConfig stays null until the owner saves form settings for the first
  // time — that's the "setup completed" marker.
  Company: {
    formConfigured: (c: { formConfig?: unknown }) => c.formConfig != null,
    deletionRequestedAt: (c: { deletionRequestedAt?: Date | string | null }) =>
      c.deletionRequestedAt instanceof Date ? c.deletionRequestedAt.toISOString() : c.deletionRequestedAt ?? null,
    // When the grace period runs out, so the dashboard can count down.
    deletionScheduledFor: (c: { deletionRequestedAt?: Date | string | null }) => {
      if (!c.deletionRequestedAt) return null;
      const requested = new Date(c.deletionRequestedAt).getTime();
      return new Date(requested + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    },
  },
  Query: {
    ...submissionResolvers.Query, ...companyResolvers.Query,
    ...adminResolvers.Query, ...authResolvers.Query,
  },
  Mutation: {
    ...submissionResolvers.Mutation,
    ...authResolvers.Mutation,
    ...companyResolvers.Mutation,
    ...adminResolvers.Mutation,
  },
};

// Error messages our resolvers throw are user-facing and safe. Anything that
// escapes from lower layers (Prisma, pg, fetch) is multi-line or mentions
// internals — mask those in production so schema/DB details never leak.
const INTERNAL_ERROR = /\n|prisma|postgres|ECONN|ETIMEDOUT|EAI_AGAIN|Invalid `/i;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !HARDENED,
  // Reject one-request query batching (amplification vector).
  allowBatchedHttpRequests: false,
  // Depth bounds how far a query reaches; cost bounds how much it asks for.
  // Without the second, aliases multiplied both work and side effects while the
  // per-request rate limiters saw one request.
  validationRules: [depthLimit(8), costLimit()],
  includeStacktraceInErrorResponses: !HARDENED,
  formatError: (formatted) => {
    if (!HARDENED) return formatted;
    // "Did you mean …?" suggestions aid field enumeration.
    const message = formatted.message.replace(/ Did you mean .*$/s, '');
    if (INTERNAL_ERROR.test(message)) {
      return { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
    }
    return { ...formatted, message, extensions: { code: formatted.extensions?.code } };
  },
});
await server.start();

const app = express();

app.set('trust proxy', TRUST_PROXY_HOPS);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: HARDENED ? undefined : false,
}));

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const jsonParser = express.json({ limit: '1mb' });
app.use((req, res, next) => {
  // The Didit webhook signature is computed over the exact bytes received, so
  // its body must reach the route unparsed (express.raw is applied there).
  if (req.path === '/didit-webhook') return next();
  return jsonParser(req, res, next);
});

// Every limiter counts in Postgres: budgets survive a restart and are shared
// across instances.
const limiter = (name: string, windowMs: number, max: number) => rateLimit({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  store: new PrismaRateLimitStore(name),
});

const apiLimiter = limiter('api', 60 * 1000, 120);

const loginLimiter = limiter('login', 15 * 60 * 1000, 10);

// Starting a verification creates a paid Didit session, so this is a cost
// control as much as an abuse control: 10 per minute per IP.
const extractLimiter = limiter('verify-start', 60 * 1000, 10);

// Polling runs for as long as the buyer is inside the hosted flow, so it needs
// far more headroom than starting one. The store's own 3s refresh floor is what
// keeps this from being amplified into requests against Didit.
const statusLimiter = limiter('verify-status', 60 * 1000, 60);

// Public, unauthenticated, and each submission triggers costly outbound work
// (VIES lookup, PubChem substance check) — keep this well below the API limit.
const submitLimiter = limiter('submit', 15 * 60 * 1000, 10);

// The webhook route had no limiter at all, and rejecting a forged delivery is
// not free — see services/diditWebhook.ts for the ordering that makes it cheap.
const webhookLimiter = limiter('webhook', 60 * 1000, 120);

// Outbound mail triggered by an authenticated caller: invitations and
// re-sends. Low, because no legitimate use needs more.
const mailLimiter = limiter('mail-out', 60 * 60 * 1000, 20);

// Start a hosted identity verification. Public and unauthenticated, so it is
// rate-limited and bounded by the session store's capacity. The document never
// touches this server — the buyer completes capture, liveness and face match on
// Didit and we only ever read the decision back over the API.
app.post('/verification-session', extractLimiter, async (req, res) => {
  if (!DIDIT_ENABLED) {
    res.status(503).json({ error: 'Identity verification is not configured.' });
    return;
  }
  // The form's company decides which tenant the session belongs to; the session
  // can then only be spent on that company's form.
  const slug = typeof (req.body as { companySlug?: unknown })?.companySlug === 'string'
    ? (req.body as { companySlug: string }).companySlug.slice(0, 100)
    : '';
  let companyId: string | null = null;
  if (slug) {
    const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
    companyId = company?.id ?? null;
  }

  // Budgets are per caller and per tenant. The previous single global bucket
  // was itself the vulnerability: filling it stopped every seller's buyers from
  // verifying, and burned the monthly allowance doing so.
  const ipHash = req.ip ? pseudonym(req.ip) : null;
  const capacity = await checkCapacity(ipHash, companyId);
  if (!capacity.ok) {
    console.warn(`[didit] verification refused — ${capacity.reason} capacity reached`);
    res.status(429).json({
      error: capacity.reason === 'ip'
        ? 'Too many verifications started from this device. Finish the one you started, or try again shortly.'
        : 'Identity verification is busy, please try again shortly.',
    });
    return;
  }

  try {
    // vendor_data is echoed back by Didit and stored on their side, so it is a
    // random reference — never the buyer's email, name or our submission id.
    const { sessionId, url } = await createVerificationSession({
      vendorData: crypto.randomBytes(16).toString('hex'),
      callbackUrl: VERIFICATION_CALLBACK,
    });
    await registerSession(sessionId, companyId, ipHash);
    res.json({ sessionId, url });
  } catch (err: any) {
    console.error(`[didit] session creation failed: ${err?.message ?? 'unknown error'}`);
    res.status(502).json({ error: 'Could not start identity verification. Please try again.' });
  }
});

// Poll for progress. Returns the status and nothing else: the browser has no
// need for the document fields, and this endpoint is only guarded by knowledge
// of the session id.
app.get('/verification-status/:sessionId', statusLimiter, async (req, res) => {
  const sessionId = String(req.params.sessionId ?? '');
  if (!(await isKnownSession(sessionId))) {
    res.status(404).json({ error: 'Session expired or not found' });
    return;
  }
  if (await shouldRefresh(sessionId)) {
    try {
      const decision = await retrieveDecision(sessionId);
      await cacheStatus(sessionId, decision.status);
    } catch {
      // Leave the cached status alone; the buyer can keep polling.
    }
  }
  res.json({ status: (await cachedStatus(sessionId)) ?? 'PENDING' });
});

// Didit webhook. Mounted with express.raw so the signature is checked against
// the exact bytes received — see services/diditWebhook.ts. Nothing in the body
// is trusted: on a valid signature the decision is re-fetched from the API.
app.post('/didit-webhook', webhookLimiter, express.raw({ type: '*/*', limit: '256kb' }), async (req, res) => {
  if (!WEBHOOK_CONFIGURED) { res.status(503).end(); return; }

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const check = verifyWebhook(raw, req.headers as Record<string, unknown>);
  if (!check.ok) {
    console.warn(`[didit] rejected webhook: ${check.reason}`);
    res.status(401).end();
    return;
  }

  let payload: any;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { res.status(400).end(); return; }

  const sessionId = String(payload?.session_id ?? '');
  const eventId = String(payload?.event_id ?? '') || `${sessionId}:${payload?.status ?? ''}`;
  if (!sessionId) { res.status(400).end(); return; }

  // Acknowledge immediately; the decision fetch and DB write happen after.
  res.status(200).end();

  if (!(await claimEvent(eventId))) return;

  try {
    const submission = await prisma.submission.findUnique({
      where: { idVerificationSessionId: sessionId },
      select: { id: true },
    });
    // No row yet: the buyer has not submitted the form. The submit mutation
    // fetches the decision itself, so there is nothing to reconcile.
    if (!submission) return;

    const decision = await retrieveDecision(sessionId);
    if (decision.status === 'PENDING') return;

    const purged =
      decision.status === 'APPROVED' || decision.status === 'DECLINED' || decision.status === 'EXPIRED'
        ? await deleteSession(sessionId)
        : false;

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        idVerificationStatus: decision.status,
        idLivenessPassed: decision.livenessPassed,
        idFaceMatch: decision.faceMatch,
        idVerificationWarnings: decision.warnings,
        idVerificationCheckedAt: new Date(),
        idVerificationPurged: purged,
        ...(decision.documentType ? { idDocumentType: decision.documentType } : {}),
        ...(decision.expiryDate ? { idDocumentExpiry: new Date(decision.expiryDate) } : {}),
      },
    });
  } catch (err: any) {
    console.error(`[didit] webhook processing failed for ${sessionId}: ${err?.message ?? 'unknown error'}`);
  }
});

// Operation-aware rate limiters applied before GraphQL. Credential guessing
// (any login/registration path) and the public submit mutation get their own
// tighter budgets than the general API limit.
const CREDENTIAL_OPS =
  /adminLogin|companyLogin|registerCompany|acceptInvite|requestPasswordReset|resetPassword|verifyEmail/;
// Mutations that make this server send mail to an address the caller chose.
// Signing up is free, so "authenticated" is not a budget — an owner who has
// just registered could otherwise push 120 invitations a minute at arbitrary
// inboxes, carrying their own wording, from our sending domain.
const MAIL_OPS = /inviteMember|resendEmailVerification/;
app.use('/graphql', (req, res, next) => {
  // GraphQL over GET carries the document in the query string. Apollo refuses
  // mutations there, but reading both keeps the routing honest if that changes.
  const query = (req.body as { query?: string })?.query
    ?? (typeof req.query?.query === 'string' ? req.query.query : undefined);
  if (typeof query !== 'string') return next();
  if (CREDENTIAL_OPS.test(query)) return loginLimiter(req, res, next);
  if (MAIL_OPS.test(query)) return mailLimiter(req, res, next);
  if (query.includes('submitEndUserStatement')) return submitLimiter(req, res, next);
  return next();
});

app.use(
  '/graphql',
  apiLimiter,
  expressMiddleware(server, {
    context: async ({ req }) =>
      contextFor(
        req.headers.authorization,
        (req.body as { operationName?: string })?.operationName ?? 'anonymous operation',
      ),
  })
);

// Nightly maintenance, 02:00.
cron.schedule('0 2 * * *', async () => {
  // Retention runs off createdAt, so it covers every submission. It used to key
  // on idDataCollectedAt, which meant a form with identity verification switched
  // off was kept forever — the opposite of the intent.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  const { count } = await prisma.submission.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (count > 0) console.log(`Retention: deleted ${count} submission(s) older than ${RETENTION_MONTHS} months`);

  const sessions = await pruneSessions();
  const events = await pruneEvents();
  const tokens = await pruneAuthTokens();
  const limits = await pruneRateLimits();
  const mail = await pruneMailBudget();
  if (sessions || events || tokens || limits || mail) {
    console.log(`Maintenance: pruned ${sessions} verification session(s), ${events} webhook event(s), `
      + `${tokens} auth token(s), ${limits} rate-limit row(s), ${mail} mail budget row(s)`);
  }

  const purged = await purgeDeletedCompanies();
  if (purged > 0) console.log(`Deletion: purged ${purged} company account(s) past the grace period`);
});

app.listen(3000, () => {
  console.log('Backend running at http://localhost:3000/graphql');
  if (IS_EXPOSED) {
    console.log(`[security] hardened mode: introspection off, errors masked (FRONTEND_URL=${process.env.FRONTEND_URL})`);
    if (!process.env.TURNSTILE_SECRET) {
      console.warn('[security] TURNSTILE_SECRET is not set — bot protection is INERT on a publicly reachable instance.');
    }
    if (!IS_PROD) {
      console.warn('[security] NODE_ENV is not "production" on a publicly reachable instance — set it.');
    }
  }
  if (!DIDIT_ENABLED) {
    console.warn('[didit] DIDIT_API_KEY / DIDIT_WORKFLOW_ID not set — identity verification is disabled.');
  } else if (!WEBHOOK_CONFIGURED) {
    console.warn('[didit] DIDIT_WEBHOOK_SECRET not set — webhooks will be rejected.');
  }
});

// Requeue any substance checks left PENDING by a restart mid-check.
if (SUBSTANCE_CHECK_ENABLED) {
  prisma.submission.findMany({ where: { substanceCheckStatus: 'PENDING' }, select: { id: true } })
    .then(rows => { for (const r of rows) void runSubstanceCheck(r.id); })
    .catch(() => {});
}
