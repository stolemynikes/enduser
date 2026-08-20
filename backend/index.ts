import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cron from 'node-cron';
import crypto from 'node:crypto';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import depthLimit from 'graphql-depth-limit';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema.ts';
import { submissionResolvers, runSubstanceCheck } from './resolvers/submission.ts';
import { SUBSTANCE_CHECK_ENABLED } from './services/substanceCheck.ts';
import { authResolvers } from './resolvers/auth.ts';
import { companyResolvers } from './resolvers/company.ts';
import { adminResolvers } from './resolvers/admin.ts';
import { verifyCompanyToken } from './services/companyAuth.ts';
import {
  DIDIT_ENABLED,
  createVerificationSession,
  retrieveDecision,
  deleteSession,
} from './services/didit.ts';
import {
  atCapacity,
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
import { prisma } from './lib/prisma.ts';

const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
if (!process.env.COMPANY_JWT_SECRET) throw new Error('COMPANY_JWT_SECRET env var is required');

const ALLOWED_ORIGIN: string | false = process.env.FRONTEND_URL ?? (IS_PROD ? false : '*');

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
  Query: { ...submissionResolvers.Query, ...companyResolvers.Query, ...adminResolvers.Query },
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
  introspection: !IS_PROD,
  // Reject one-request query batching (amplification vector).
  allowBatchedHttpRequests: false,
  // Deeply nested queries are a DoS vector; our schema needs depth ~4.
  validationRules: [depthLimit(8)],
  includeStacktraceInErrorResponses: !IS_PROD,
  formatError: (formatted) => {
    if (!IS_PROD) return formatted;
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

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: IS_PROD ? undefined : false,
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

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Starting a verification creates a paid Didit session, so this is a cost
// control as much as an abuse control: 10 per minute per IP.
const extractLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Polling runs for as long as the buyer is inside the hosted flow, so it needs
// far more headroom than starting one. The store's own 3s refresh floor is what
// keeps this from being amplified into requests against Didit.
const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public, unauthenticated, and each submission triggers costly outbound work
// (VIES lookup, PubChem substance check) — keep this well below the API limit.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Start a hosted identity verification. Public and unauthenticated, so it is
// rate-limited and bounded by the session store's capacity. The document never
// touches this server — the buyer completes capture, liveness and face match on
// Didit and we only ever read the decision back over the API.
app.post('/verification-session', extractLimiter, async (req, res) => {
  if (!DIDIT_ENABLED) {
    res.status(503).json({ error: 'Identity verification is not configured.' });
    return;
  }
  if (await atCapacity()) {
    res.status(503).json({ error: 'Server busy, please try again shortly.' });
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

  try {
    // vendor_data is echoed back by Didit and stored on their side, so it is a
    // random reference — never the buyer's email, name or our submission id.
    const { sessionId, url } = await createVerificationSession({
      vendorData: crypto.randomBytes(16).toString('hex'),
      callbackUrl: VERIFICATION_CALLBACK,
    });
    await registerSession(sessionId, companyId);
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
app.post('/didit-webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
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
app.use('/graphql', (req, res, next) => {
  const query = (req.body as { query?: string })?.query;
  if (typeof query !== 'string') return next();
  if (CREDENTIAL_OPS.test(query)) return loginLimiter(req, res, next);
  if (query.includes('submitEndUserStatement')) return submitLimiter(req, res, next);
  return next();
});

app.use(
  '/graphql',
  apiLimiter,
  expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = req.headers.authorization ?? '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        // Try admin token first
        try {
          const payload = jwt.verify(token, JWT_SECRET) as { adminId: string };
          return { admin: true, adminId: payload.adminId };
        } catch {}
        // Try company member token
        const company = verifyCompanyToken(token);
        if (company) {
          if (company.support) {
            // Admin acting as this company — audit-log every operation.
            const op = (req.body as { operationName?: string })?.operationName ?? 'anonymous operation';
            console.log(`[support] admin ${company.adminId} → company ${company.companyId}: ${op}`);
          }
          return { companyUserId: company.companyUserId, companyId: company.companyId, companyRole: company.role };
        }
      }
      return {};
    },
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
  if (sessions || events || tokens) {
    console.log(`Maintenance: pruned ${sessions} verification session(s), ${events} webhook event(s), ${tokens} auth token(s)`);
  }

  const purged = await purgeDeletedCompanies();
  if (purged > 0) console.log(`Deletion: purged ${purged} company account(s) past the grace period`);
});

app.listen(3000, () => {
  console.log('Backend running at http://localhost:3000/graphql');
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
