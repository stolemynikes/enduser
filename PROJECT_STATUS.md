# Project status — work completed & security posture

_Last updated: 2026-09-28_

A single reference covering what has been built and verified in this codebase,
the tooling added around it, and the security position with its open items.

**The project:** a multi-tenant EU end-user statement platform for precursor and
dual-use chemicals. Companies register, configure a public submission form, and
review buyer statements. The system verifies VAT numbers against VIES, extracts
and validates passport/ID documents, and runs an LLM compliance check on the
declared substance use — then routes everything to a human reviewer.

**Stack:** Express 5 + Apollo Server 4 + Prisma 7 (Postgres) on the backend;
React + Vite + Apollo Client on the frontend.

---

## Part 1 — Work completed

### 1.1 Approval gating, overrides & reviewer attribution

The **Approve** action was previously ungated — a reviewer could approve a
submission with an invalid VAT, a mismatched address, a synthetic-looking ID, or a
flagged substance check. This was moved to a **fail-closed** model.

- A submission is approvable only when **every** automated check is green across
  three categories: **VIES**, **IDENTITY**, **SUBSTANCE**
  (`backend/lib/approvalGate.ts`).
- A failing check can be **manually overridden**, but only with a **required
  reason**, attributed to a named user and timestamped as an audit row
  (`SubmissionOverride`).
- Substance `PENDING` blocks approval and **cannot** be overridden — the check
  must finish first.
- **Reopening** a submission deletes its overrides and clears reviewer
  attribution, so a later edit cannot ride an old bypass.
- Mirrored across both the company dashboard (role-gated: Owner + Employee+) and
  the platform-admin dashboard.
- The gate is enforced **server-side** (`assertApprovable`) with the frontend
  mirroring it for UX — defence in depth, not client trust.

### 1.2 ID document expiry capture

Passport/ID expiry dates were previously parsed from the MRZ and then discarded.
They are now captured (`idDocumentExpiry`), surfaced in both dashboards, and an
expired document fails the IDENTITY check — flagged for review and overridable,
consistent with the no-auto-deny policy.

### 1.3 Security implementation

A full security checklist was implemented and verified — tenant isolation,
GraphQL hardening, rate limiting, PII encryption, and identity integrity. This is
detailed in **Part 2** below.

### 1.4 Codebase knowledge graph (tooling)

The repository was mapped into a navigable knowledge graph using
[graphify](https://github.com/Graphify-Labs/graphify) (`graphifyy` on PyPI).

- **60 files** analysed → **538 nodes, 789 edges, 23 communities**.
- Extraction was structural (AST) — deterministic and free; cost was 55,229 input
  tokens for the semantic pass, 0 output.
- Outputs live in `graphify-out/`: `graph.html` (interactive), `graph.json`
  (GraphRAG-ready), `GRAPH_REPORT.md` (audit report).

**What it surfaced:**

- **God nodes** — `useDocumentTitle()` (19 edges), `CompanyDashboard()` (14),
  `Dashboard()` (13), `blockingCategories()` (10), `extractIdDocument()` (9).
- **Community structure** — 23 clusters including "Backend Server & Resolvers",
  "Approval Gate & Form Config", "PII Encryption Layer", "VIES VAT Verification".
- **A traced finding:** `memoryUpload`, `phoneSessions` and `resolvers` each have
  exactly **one** graph edge. Their near-orphan status is the structural signature
  of the intended security property — the ID image never persists. It lives in a
  memory buffer, is processed by `extractIdDocument()`, and only extracted *fields*
  reach the single-use token store. The one bridge between the Express world and
  the GraphQL world is `idExtractionStore.ts`: `index.ts` only writes to it,
  `submission.ts` only reads from it.

Useful for onboarding and for reasoning about blast radius. Not a runtime
dependency — the graph is a snapshot and drifts as code changes
(`graphify . --update` re-extracts only what changed).

### 1.5 Identity verification moved to Didit — audit of the switch

The in-house OCR/MRZ pipeline was replaced by Didit's hosted flow. A pass over
everything the old pipeline touched (2026-08-20) found the core intact and three
loose ends, now closed:

- **Reserved slugs were stale.** `RESERVED_SLUGS` in `backend/resolvers/company.ts`
  still reserved the retired `/extract-id` and `/phone-*` routes but not the new
  `/verification-session`, `/verification-status`, `/verification-complete` or
  `/didit-webhook`. A company whose name produced one of those slugs would have
  had its public form shadowed by a backend route. All are reserved now (the old
  ones kept, so an old link can never be captured either).
- **Enabling identity verification could not be honest.** Form Settings and the
  setup wizard offered Required/Hidden with no idea whether a provider was
  configured; with `DIDIT_API_KEY` unset, buyers only discovered it at submit
  time. `identityVerificationAvailable` is now exposed on `PublicFormInfo` and as
  a company-authenticated query — the wizard and Form Settings warn on the
  switch, and the public form says so up front instead of failing at the end.
- **An early submit destroyed the buyer's verification.** `submitEndUserStatement`
  spent the session (`consumeSession`) *before* checking whether the hosted flow
  had finished, so a submit that arrived while the decision was still `PENDING`
  was refused **and** left the buyer with a dead session — they had to verify
  again, costing a second verification against the monthly allowance. Ownership
  is now checked without spending (`sessionMatches`), the decision is fetched,
  and the session is only spent on a terminal outcome. Two submissions racing on
  one session still resolve to one winner. Reproduced against the live provider
  before and after the fix.
- **The process-and-purge delete never worked.** `deleteSession` called
  `DELETE /v3/session/{id}/`; Didit's deletion endpoint is
  `DELETE /v3/session/{id}/delete/`. Every purge returned 404, was swallowed by
  the never-throw wrapper, and left `idVerificationPurged = false` — so the
  documented "images are deleted at the provider once the result is in" was not
  actually happening. Path corrected and verified live: purge returns true and
  the decision endpoint then answers `Session not found`. Two pre-existing rows
  were left unpurged by the bug; `backend/scripts/purgeDiditSessions.ts`
  reconciles them (dry run by default, `--apply` to delete).
- **Nothing stopped a half-filled submit.** The form ran with `noValidate` and
  an always-enabled Send button, so incomplete forms bounced off server-side
  errors one field at a time — and, worse, a buyer could burn an identity
  verification on a form they had not filled in. The form now computes what is
  still missing and (a) disables Send while anything is, listing it, and (b)
  does not offer the identity check until everything else is complete. All three
  entry points — `/form`, `/{slug}` and `/embed/{slug}` — are the same component,
  so one gate covers them. Server-side validation is unchanged and remains the
  authority.
- **Marketing copy still described the old pipeline.** The landing page claimed
  MRZ checksums "all locally", photos "never stored", and VAT "auto-denied" —
  none of which is true post-switch (and auto-deny never was). Rewritten to
  describe the hosted flow, and the privacy claim now matches what actually
  happens.

Verified working: the hosted-session endpoints, single-use session store bound to
the tenant, webhook signature checks with re-fetch of the decision, the
process-and-purge delete, the approval gate reading Didit status while still
handling legacy MRZ rows, and the admin identity counters, which already span
both pipelines. The knowledge graph in `graphify-out/` predates the switch and
still references `idExtraction.ts` / `PhoneCapture.tsx`; re-run
`graphify . --update` before trusting it.

### 1.6 Embeddable form (`/embed/:slug`)

Sellers can now put the form directly on their own website — the pattern
laboratoriumdiscounter.nl uses — instead of sending customers to this platform.
Form Settings shows the ready-made snippet with a copy button (and the plain
form link next to it).

The form is embedded as an **iframe served from this origin**, never as a script
injected into the seller's page: the buyer's data, the identity session and the
submit mutation stay inside our origin where the host page cannot read them. The
only cross-frame traffic is a height message so the host can size the frame, and
the snippet verifies `event.origin` before acting on it. `?theme=dark` renders
the dark variant. Full reasoning and the residual clickjacking note: SECURITY.md
§2.11.

**Deployment prerequisite:** the static host must allow framing of `/embed/*`
and forbid it everywhere else — see SECURITY.md §5.2 for the exact headers.
Without it the embed simply will not render.

### 1.7 Full-app audit round (2026-08-20)

A pass over the whole app with the knowledge graph rebuilt first
(`graphify . --update --code-only` — 600 nodes, 805 edges, 39 communities after
pruning the three files the KYC switch deleted). Eight defects found and fixed:

1. **Migration history was months behind the schema.** `prisma/migrations` held
   one migration (8 Jun) creating Submission and Admin only; every table and
   column added since — Company, CompanyUser, CompanyMember, CompanyInvite,
   SupportAccess, SubmissionOverride, all Didit fields, `buyerType`, `isTest` —
   existed solely because of `db push`. `migrate deploy` against a fresh
   database produced an unrunnable app. Squashed into
   `00000000000000_baseline`, verified by applying it to a scratch database and
   diffing the result against the dev database column by column (identical), the
   old migration kept in `prisma/migrations-archive/`, and the dev database
   marked as baselined. `prisma migrate status` is clean.
2. **Test submissions bypassed the identity gate.** `createTestSubmission` never
   set `idDataCollectedAt`, which the gate reads as "this form did not ask for
   ID" — so a simulated DECLINED or expired document stayed approvable, the
   exact case the feature exists to rehearse.
3. **No indexes on the tenant path.** Postgres does not index foreign keys and
   Prisma does not add them for it, so every tenant query scanned the whole
   submission table before decrypting row by row. Nine indexes added
   (`companyId, createdAt`, `companyId, status`, `status`, `idDataCollectedAt`,
   plus the membership/invite/override/support foreign keys).
4. **An expired token left a dead dashboard.** The Apollo client had no error
   link, so a lapsed token (admin 8h, company 30d) turned every query into an
   "Unauthorized" toast with no way out. Auth failures now clear the stored
   token and return to the right login, which says the session expired.
5. **The dashboard trusted a role from localStorage.** Editing it to OWNER
   revealed the owner tabs; the server refused the queries behind them, so the
   result was a broken UI rather than a leak. The role now comes from `myRole`.
6. **Auth tokens rode along on public requests.** The client attached whichever
   token was in storage to any path outside `/admin` and `/company`, including
   the public form and the embed. Tokens are now scoped to those two areas.
7. **An invite link logged you into an existing account.** If the invited
   address already had an account, possession of the emailed link minted a
   session as that user and ignored the password typed. Accepting now requires
   that account's password. Covered by `backend/scripts/inviteAuthTest.ts`
   (4/4).
8. **Dead code from the retired pipeline** — the auto-rejection email (there is
   no auto-denial), an unrouted `Home.tsx`, and `backend/uploads/` left over
   from the deleted upload flow.

Dependencies were brought current in the same pass — see §3.6.

### 1.8 Quality-of-life round (2026-08-20)

Chosen from the audit's QoL list and built in one pass. Twelve items:

- **Sellers are told when a statement lands.** Notification goes to the owner and
  any Employee+ — the roles that can act on it — as bcc, so recipients do not see
  each other. The platform-admin notice is unchanged.
- **Mail carries the seller's name.** Buyer-facing messages come from
  "{Company} via EU Statement" and are signed by the company, with a line saying
  it was sent on their behalf. The envelope address stays ours because SPF and
  DKIM are bound to our domain. Found and fixed alongside it: **company-side
  approve and deny sent the buyer nothing at all** — only the platform-admin path
  mailed a decision.
- **The ID document number is withheld from plain Employees.** Stripped
  server-side, so it is absent from the dashboard and from the CSV export.
- **The review queue is paged.** 100 rows a page, filtered and counted by the
  server, fetched as the list scrolls. Search and the date range stay
  client-side: email, name and address are encrypted at rest, so no SQL query can
  match on them — a limitation worth remembering before promising server-side
  search.
- **A person can belong to several companies.** `myCompanies` lists them and
  `switchCompany` re-issues the token; the dashboard shows a switcher only when
  there is more than one. Login no longer silently picks the first membership if
  that company is closed.
- **Password reset and email verification.** One-time links, stored only as a
  SHA-256 hash, single-use, 60 minutes for a reset and 7 days for a
  confirmation. Requesting a reset reports the same result whether or not the
  address exists. An unverified address shows a dismissible banner rather than
  blocking the dashboard.
- **Closing a company account** is a 30-day scheduled deletion an owner triggers
  by typing the company's address. See SECURITY.md §5.5.
- **Retention covers every submission** — see SECURITY.md §5.5.
- **Concentration is asked for.** A CAS number identifies a substance, not its
  strength, and every Annex I limit is a concentration — so the check could
  quote "15 % w/w" but never apply it. It is now a configurable field like the
  others (optional by default so existing forms are unchanged) and the check
  compares the declared strength against the limit, flagging what exceeds it.
  Conditional entries (the ammonium nitrate nitrogen fraction) are left to the
  reviewer rather than guessed at.
- **Verification sessions and webhook dedupe moved to Postgres.** They were
  in-memory Maps: a restart stranded every buyer mid-verification — costing them
  a second verification against the monthly allowance — and a second instance
  was impossible. Single-use is now enforced by a conditional update, and
  duplicate webhook deliveries by a primary key.
- **Test submissions have their own view.** They are excluded from the real
  queue and reachable through a "Test data" toggle that appears only when any
  exist.
- **Lint is clean** (0 errors). The two real findings — setState called
  synchronously inside an effect, in three places — were rewritten as
  render-time state adjustment, React's own guidance for this. `no-explicit-any`
  is a warning: the GraphQL documents are untyped by choice, so the `any` type
  arguments are deliberate.

- **The buyer gets a copy of their statement.** A PDF is attached to the receipt
  and again to the approval: reference, date, status, what they declared
  (substance, CAS, concentration, use), and the terms they accepted, rendered
  from the seller's own configured terms. Identity is recorded as "completed on
  {date} through the identity provider" and nothing more — the document number,
  the name printed on it, expiry, liveness and face-match results, the VIES
  lookup, the substance-check note, reviewer names and override reasons are all
  absent. Email is not a confidential channel and this file sits in an inbox for
  years, so it carries what the buyer declared, not what was learned about them.
  `backend/scripts/statementPdfTest.ts` decodes the generated PDF and asserts
  both halves of that (11 assertions).

Covered by `backend/scripts/qolTest.ts` (31 assertions: reset, verification,
paging, test isolation, redaction, switching, closure and purge).

### 1.9 Security audit and hardening (2026-09-27/28)

A full review from both sides of the login, with every finding demonstrated
against a running instance before it was fixed. Sixteen issues closed; the
details and the before/after table are in SECURITY.md §2.12.

The three that mattered most: one HTTP request could carry any number of aliased
`submitEndUserStatement` mutations while the rate limiter saw a single request;
authorization trusted the JWT's claims, so removing a member or demoting an owner
did nothing for up to 30 days; and anyone could fill a global 1000-session bucket
and stop every seller's identity verification for an hour while burning the
monthly allowance.

Also added: Cloudflare Turnstile on the public form, both logins, registration
and password reset — inert until `TURNSTILE_SECRET` and `TURNSTILE_SITE_KEY` are
set, so development is unchanged.

`npm test` now runs all eight suites (134 assertions), including
`securityRegressionTest.ts`, which re-runs each exploit and asserts it fails.

**Environment variables added:** `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY`
(optional; bot protection off when absent) and `TRUST_PROXY_HOPS` (defaults to 1).

### 1.10 Verification tooling

`backend/scripts/crossTenantTest.ts` — an executable adversarial test that
registers two real tenants through the live GraphQL API, seeds a submission for
tenant A, then attacks it with tenant B's token. **14 / 14 passing.** See §2.11.

---

## Part 2 — Security posture

### 2.1 Threat model in one paragraph

Untrusted input arrives from three places: the **public submission form**
(unauthenticated, anyone on the internet), the **phone-capture flow**
(unauthenticated, holds a short-lived token), and **authenticated tenant users**
(who must never see another tenant's data). The highest-value target is the
**platform admin account**, which can read every tenant's decrypted PII and
impersonate any company owner. The most damaging realistic outcomes are
cross-tenant data theft, forged identity verification, and bulk PII exfiltration.

### 2.2 Tenant isolation — structural

Company resolvers never touch `prisma.submission` directly. All access goes
through `tenantSubmissions(companyId)` in `backend/lib/tenant.ts`, which injects
the `companyId` filter so a forgotten `where` clause is not possible.

- `findMany` — merges `companyId` into every query.
- `getOwned(id)` — returns the row only if it belongs to the tenant, else throws.
- `update` / `delete` — Prisma unique-where operations cannot carry a tenant
  filter, so ownership is verified first, then the operation runs by id.

### 2.3 Identity verification cannot be spoofed

MRZ validity and forgery verdicts are **server-authoritative**; the browser never
supplies them.

- `/extract-id` and `/phone-capture/:token` run extraction server-side.
- The result is stored under a single-use, 30-minute token
  (`backend/services/idExtractionStore.ts`).
- `submitEndUserStatement` consumes that token and derives `idMrzValid`,
  `idLikelySynthetic`, document name/type/number and expiry from it. Client-sent
  identity fields are discarded.
- Only passports and identity cards are accepted.

**Images are never written to disk** — memory storage only, buffer discarded after
extraction, only extracted text and booleans persist.

### 2.4 PII encryption at rest

Field-level AES-256-GCM (`backend/lib/cipher.ts`) applied transparently by a
Prisma client extension (`backend/lib/prisma.ts`) — encrypt on write, decrypt on
read, so resolvers never handle ciphertext. Random 12-byte IV per field, GCM auth
tag verified, key format-validated at boot. 16 PII fields covered.

### 2.5 GraphQL hardening

- Query **depth limit of 8** (schema needs ~4).
- **Batched HTTP requests disabled** — removes an amplification vector.
- **Introspection disabled in production.**
- **Error masking in production** — strips `"Did you mean …"` field suggestions
  and replaces internal errors (Prisma/Postgres/network) with a generic message.
- Stack traces disabled in production.

### 2.6 Rate limiting

| Limiter | Scope | Budget |
|---|---|---|
| `apiLimiter` | all `/graphql` | 120 / min |
| `loginLimiter` | `adminLogin`, `companyLogin`, `registerCompany`, `acceptInvite` | 10 / 15 min |
| `submitLimiter` | `submitEndUserStatement` | 10 / 15 min |
| `extractLimiter` | `/extract-id`, `/phone-capture/:token`, `/phone-session` | 10 / min |

### 2.7 Authentication & authorisation

- Admin JWT 8h; company JWT 30d; **support-session tokens 2h**, carrying
  `support`/`adminId` claims, recorded in `SupportAccess` and logged per operation.
- Both signing secrets **required at boot** — no hardcoded fallbacks.
- Roles `OWNER` / `EMPLOYEE_PLUS` / `EMPLOYEE` with `requireCompany`,
  `requireOwner`, `requireOwnerOrPlus`, `requireAdmin` guards.
- Passwords hashed with **bcrypt cost 12**.

### 2.8 Injection surface — verified clean

- **No raw SQL** anywhere (Prisma throughout).
- **No shell execution** in application code.
- **No XSS sinks** — zero `dangerouslySetInnerHTML` / `innerHTML` / `eval`.
- **No SSRF** — the only user-influenced outbound call is VIES, where the country
  code is sliced to two letters and the VAT stripped to alphanumerics against a
  fixed host.

### 2.9 Abuse & resource protection

Gemini substance check behind a **concurrency semaphore** (max 3). In-memory
stores have TTLs and periodic purges. Uploads capped at 10 MB with a
`jpeg`/`png`/`webp` allow-list. `helmet` headers; CORS restricted to
`FRONTEND_URL` in production.

### 2.10 Fixes from the latest review (2026-08-03)

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | Medium | Password minimum was **client-side only** — the API accepted a 1-character password | `assertPasswordStrength()` enforced in `registerCompany` and `acceptInvite` |
| A2 | Low–Med | `/phone-session` was unauthenticated **and unrated** — unbounded Map growth → memory DoS | `extractLimiter` applied + `MAX_PHONE_SESSIONS` cap of 1000 |
| A3 | Hygiene | `eng.traineddata` (~10 MB) could be committed accidentally | Added to `backend/.gitignore` |

### 2.11 Verification

`backend/scripts/crossTenantTest.ts` — **14 / 14 passing**:

- Tenant A sees its own submission; tenant B's list does not contain it.
- All 7 cross-tenant mutations rejected (approve, deny, reopen, delete, override,
  clear override, recheck substance).
- Unauthenticated access rejected.
- Depth-10 query rejected; batched request rejected.
- Short password rejected server-side.
- `/phone-session` burst returns 429.

Run with `npx tsx scripts/crossTenantTest.ts` (backend must be on `:3000`).

### 2.12 Assessed and deliberately not changed

- **Storage engine (Cloudflare R2 evaluation).** R2 is object storage, not a
  database. Moving there would discard SQL-enforced tenant isolation in favour of
  key-prefix conventions, trade a hard-to-misconfigure surface for the most common
  cloud-breach cause (public bucket exposure), and hand key custody to the
  provider — while PII is already encrypted before it reaches the DB. **Not more
  secure for this workload.** R2 is a good fit for *encrypted backups*; Cloudflare
  **Access** is the genuinely valuable product here (§3.1).
- **Prompt injection into the substance check.** User free-text reaches the model,
  but output only flags for manual review and can never auto-approve — impact nil.
- **Admin omniscience.** By design and audit-logged; the mitigation is MFA (§3.1),
  not a code change.

---

## Part 3 — Next steps

### 3.1 Admin & owner MFA — highest value

The admin account can read every tenant's decrypted PII and impersonate any
company owner, with **no second factor**. This is the single largest remaining
risk.

**Recommended:** **Cloudflare Access** in front of `/admin` — SSO + MFA at the
edge, no auth code to write or maintain. Alternative: TOTP on `adminLogin` /
`companyLogin`.

### 3.2 Deployment configuration — *needs a decision*

- **`trust proxy` hop count.** `backend/index.ts` sets
  `app.set('trust proxy', 1)`. All rate limiters key on the client IP from
  `X-Forwarded-For`. If production has more than one proxy hop, an attacker can
  inject a header hop and rotate their apparent IP to evade the login and submit
  limiters. **Set this to the exact number of trusted proxies in production.**
- **CORS.** Confirm `FRONTEND_URL` is the exact production origin — without it,
  `ALLOWED_ORIGIN` is `null` in production and browsers are blocked.

### 3.3 Database & infrastructure hardening

- **Least-privilege DB role** — the app should not connect as owner/superuser.
- **`sslmode=require`** on the connection string.
- **Private networking** — the database must not be internet-reachable.
- **Backups + a tested restore.** No verified backup path exists today. Encrypted
  dumps to object storage, with a restore drill that has **actually been run**.
- **Secret manager + key rotation.** `ENCRYPTION_KEY` has no rotation story.
  Rotating it requires re-encrypting existing rows; the `enc:v1:` prefix in
  `cipher.ts` was designed to allow versioned keys.
- **Alerting** — nothing monitors repeated auth failures, 429 spikes, or support
  sessions being opened.

### 3.4 Application hardening (smaller)

- **Company JWT lifetime** — 30-day tokens in `localStorage`. Safe today (no XSS
  sink exists), but the window is wide if one is introduced. Consider shorter
  lifetimes with refresh, or a token-version column for server-side revocation.
- **Per-account login lockout** — throttling is per-IP only. bcrypt cost 12 makes
  this low priority.
- **Cache size caps** — VIES cache and extraction store have TTLs but no maximum
  size.

### 3.5 Data retention gap — *needs a policy owner*

The 18-month purge cron only deletes submissions where `idDataCollectedAt` is set:

```ts
where: { idDataCollectedAt: { not: null, lt: cutoff } }
```

**Submissions without ID data are never purged.** A one-line change, but the
retention period for non-ID submissions is a **legal decision**, not an
engineering one.

### 3.6 Dependency vulnerabilities — cleared 2026-08-20

Was backend 14 (7 high) / frontend 7 (5 high). After the update pass:

- **frontend — 0.** Patch updates plus majors: Apollo Client 3 → 4 (hooks moved
  to `@apollo/client/react`, the error link rewritten for the new single-error
  handler, and the untyped documents given explicit `any` type arguments to keep
  Apollo 3's default), Vite 7 → 8, ESLint 9 → 10 with typescript-eslint 8.67,
  `@vitejs/plugin-react` 5 → 6. `axios` and `react-router` — the two real
  advisories — are current.
- **backend — 1, and it is not reachable at runtime.** `deepmerge-ts` arrives
  under the `prisma` CLI (dev dependency) and Prisma has not yet bumped it;
  nothing in the server imports it. Everything else cleared, including majors:
  nodemailer 8 → 9 (the high advisory) and Apollo Server 4 → 5, which required
  swapping `@apollo/server/express4` for `@as-integrations/express5`.

**Deliberately not taken:**

- **graphql 17** — Apollo Server 5 pins `graphql@^16.11`, and `graphql-depth-limit`
  is older still. No advisory drives it.
- **TypeScript 7 on the frontend** — installs cleanly and builds, but
  typescript-eslint peers at `<6.1.0`, so keeping TS 7 means losing lint. The
  backend, which has no lint stack, does run TypeScript 7. Revisit when
  typescript-eslint ships TS 7 support.

`npm audit` counts drift as advisories are published — re-run before acting
rather than trusting this snapshot.

**Priority:** `nodemailer` and `sharp` are both in the live request path (email
sending and phone-capture thumbnailing). Test those upgrades first, then add
automated dependency scanning to CI so this stops accumulating silently.

---

## Part 4 — Standing operational rules

- Passport/ID images are **never** written to disk — memory only, discarded after
  extraction. Only extracted fields are stored.
- **No BSN** (Dutch citizen service number) is ever stored.
- Driver's licences are **not accepted** as identity documents.
- Prisma schema changes use `npx prisma db push` + `npx prisma generate` —
  **never** `migrate dev`.
- Automated checks **flag only** — never auto-approve or auto-deny.
- Any cloudflared tunnel opened for development is killed when the session ends.

---

## Open questions

Three items are blocked on decisions rather than engineering:

1. **Production proxy hop count** — for `trust proxy` (§3.2).
2. **MFA approach** — Cloudflare Access vs. TOTP in-app (§3.1).
3. **Retention period for ID-less submissions** — a legal/policy call (§3.5).
