# Security — implementation status & roadmap

_Last updated: 2026-09-28_

This document records the security work implemented in this codebase, how it was
verified, and what remains. It is the reference for anyone picking up the
security posture of the platform.

**Context:** multi-tenant EU end-user statement platform for precursor and
dual-use chemicals. It handles buyer PII, passport/ID document data, and
compliance decisions — so tenant isolation, identity integrity, and PII handling
are the controls that matter most.

---

## 1. Threat model in one paragraph

Untrusted input arrives from three places: the **public submission form**
(unauthenticated, anyone on the internet), the **phone-capture flow**
(unauthenticated, holds a short-lived token), and **authenticated tenant users**
(company owners/employees, who must never see another tenant's data). The
highest-value target is the **platform admin account**, which can read every
tenant's decrypted PII and impersonate any company owner. The most damaging
realistic outcomes are cross-tenant data theft, forged identity verification, and
bulk PII exfiltration.

---

## 2. What is implemented

### 2.1 Tenant isolation — structural

Company resolvers never touch `prisma.submission` directly. All access goes
through `tenantSubmissions(companyId)` in `backend/lib/tenant.ts`, which injects
the `companyId` filter so a forgotten `where` clause is not possible.

- `findMany` — merges `companyId` into every query.
- `getOwned(id)` — returns the row only if it belongs to the tenant, else throws.
- `update` / `delete` — Prisma unique-where operations cannot carry a tenant
  filter, so ownership is verified first, then the operation runs by id.

Every company mutation (approve, deny, reopen, delete, override, clear override,
recheck substance) routes through `getOwned` or the scoped wrappers.

### 2.2 Identity verification cannot be spoofed

Identity is verified by **Didit's hosted flow** (the in-house OCR/MRZ pipeline is
retired). Every identity fact is **server-authoritative** — the browser supplies
one thing, a session id, and nothing else about the document is accepted from it.

- `POST /verification-session` (public, rate-limited, capacity-bounded) creates
  the session server-to-server and records it in
  `backend/services/diditSessionStore.ts` against the company whose form started
  it. `vendor_data` is a random reference, never the buyer's email, name or a
  submission id, because Didit echoes and stores it.
- `submitEndUserStatement` verifies the session belongs to that company's form,
  **fetches the decision from Didit itself**, and derives status, liveness, face
  match, document type/number/name and expiry from that response
  (`backend/resolvers/submission.ts`). Client-sent identity fields are stripped.
- The session is **spent only on a terminal decision**, so a submit that arrives
  mid-flow is refused without destroying the buyer's verification; a spent
  session cannot be replayed into a second submission, and two submissions
  racing on one session resolve to a single winner.
- A plain **Employee never receives the ID document number** — the field is
  stripped server-side before it leaves the API, so it is absent from the
  dashboard and from the CSV export. Owners and Employee+ (the roles that decide)
  still see it.
- Accepting a team invite for an address that **already has an account**
  requires that account's password. The invite proves the address was invited,
  not that whoever opened the link owns it, so possession of a forwarded invite
  cannot mint a session for someone else (`backend/scripts/inviteAuthTest.ts`).
- Only passports and identity cards are accepted. Didit is told to offer nothing
  else, and the returned `document_type` is re-checked here — the provider-side
  setting is a convenience, this check is the control.
- The webhook (`POST /didit-webhook`) is public, so its HMAC signature is
  verified over the **exact bytes received** before anything is acted on, within
  a 300s replay window and once per event id. Even then the payload is not
  trusted: the decision is re-fetched from the API.

**Document images never reach this platform.** Capture, liveness and face match
all happen on Didit; we receive JSON. Once a terminal decision is stored, the
Didit session — images included — is deleted (process-and-purge), recorded per
row as `idVerificationPurged`.

### 2.3 PII encryption at rest

Field-level AES-256-GCM (`backend/lib/cipher.ts`), applied transparently by a
Prisma client extension (`backend/lib/prisma.ts`) — encrypt on write, decrypt on
read, so resolvers never handle ciphertext.

- Random 12-byte IV per field; GCM auth tag verified on decrypt.
- Key loaded from `ENCRYPTION_KEY` and format-validated (64 hex chars) at boot.
- 16 PII fields covered, including name, address, email, VAT, ID document name
  and number.

### 2.4 Approval gate (fail-closed)

A submission cannot be approved while any automated check is failing
(`backend/lib/approvalGate.ts`, enforced by `assertApprovable` in
`backend/lib/overrides.ts`).

- Categories: **VIES**, **IDENTITY**, **SUBSTANCE**.
- A failing check can be manually overridden only with a **required reason**,
  attributed to a named user and timestamped (`SubmissionOverride` audit rows).
- Substance `PENDING` blocks approval and **cannot** be overridden.
- Reopening a submission deletes its overrides and clears reviewer attribution,
  so a later edit cannot ride an old bypass.
- Checks **flag for review only** — the system never auto-approves or auto-denies.

### 2.5 GraphQL hardening

In `backend/index.ts`:

- Query **depth limit of 8** (`graphql-depth-limit`); the schema needs ~4.
- **Batched HTTP requests disabled** (`allowBatchedHttpRequests: false`) —
  removes an amplification vector.
- **Introspection disabled in production.**
- **Error masking in production** — `formatError` strips `"Did you mean …"` field
  suggestions (which aid schema enumeration) and replaces anything matching
  internal patterns (Prisma/Postgres/network errors) with a generic message.
- Stack traces disabled in production.

### 2.6 Rate limiting

Operation-aware limiters applied before the GraphQL middleware:

| Limiter | Scope | Budget |
|---|---|---|
| `apiLimiter` | all `/graphql` | 120 / min |
| `loginLimiter` | `adminLogin`, `companyLogin`, `registerCompany`, `acceptInvite` | 10 / 15 min |
| `submitLimiter` | `submitEndUserStatement` | 10 / 15 min |
| `extractLimiter` | `/extract-id`, `/phone-capture/:token`, `/phone-session` | 10 / min |

The submit limiter is deliberately tight because each submission triggers costly
outbound work (VIES lookup, Gemini substance check).

### 2.7 Authentication & authorisation

- Admin JWT — 8 hours; `JWT_SECRET` **required at boot**, no hardcoded fallback.
- Company JWT — 30 days; separate `COMPANY_JWT_SECRET`, also required at boot.
- **Support-session tokens — 2 hours** (admin acting inside a tenant), carry
  `support`/`adminId` claims, recorded in `SupportAccess` and logged per operation.
- Roles: `OWNER`, `EMPLOYEE_PLUS`, `EMPLOYEE`, guarded by `requireCompany`,
  `requireOwner`, `requireOwnerOrPlus`, `requireAdmin`.
- Passwords hashed with **bcrypt cost 12**; admin seeded from `ADMIN_PASSWORD`
  env, never a default.

### 2.8 Input validation & injection surface

- **No raw SQL anywhere** — Prisma throughout; verified by scan.
- **No shell execution** — no `child_process`/`exec` in application code.
- **No XSS sinks** — zero `dangerouslySetInnerHTML`/`innerHTML`/`eval` in the
  frontend; React escaping does the work.
- **No SSRF** — the only outbound user-influenced call is VIES, where the country
  code is sliced to two letters and the VAT number stripped to alphanumerics
  against a fixed host (`backend/services/vies.ts`).
- Per-field length caps and email format validation on submit.
- Form config is server-enforced: `HIDDEN` fields are discarded even if sent,
  `REQUIRED` fields rejected when empty.

### 2.9 Abuse & resource protection

- Gemini substance check runs behind a **concurrency semaphore** (max 3) to cap
  cost and outbound load.
- In-memory session stores (`phoneSessions`, extraction store, VIES cache) all
  have TTLs and periodic purges.
- Upload limits: 10 MB, MIME allow-list of `jpeg`/`png`/`webp`.
- Express body limit 1 MB; `helmet` security headers; CORS restricted to
  `FRONTEND_URL` in production.

### 2.10 Secret hygiene

- `.env` and `.env.*` gitignored and **not tracked** (verified).
- No hardcoded fallback secrets for JWT signing or encryption.
- `GEMINI_API_KEY` and database credentials live only in the gitignored
  `backend/.env`.
- `eng.traineddata` (large OCR binary) gitignored.

### 2.11 Embedded form (`/embed/:slug`)

A seller can put their form on their own website instead of linking to this
platform. The mechanism is an **iframe pointing at this origin** — never a
script that renders the form inside the seller's page — and that choice is the
control:

- The buyer's input, the identity session and the submit mutation all stay
  inside our origin. The embedding site cannot read the fields, the keystrokes
  or the response; the same-origin policy is what enforces that, not a
  convention.
- The seller's site never handles buyer PII, so embedding does not widen the
  set of parties holding passport or address data.
- The only thing crossing the frame boundary is a `postMessage` carrying a
  pixel height (`eustatement:height`) so the host can size the frame, plus a
  `eustatement:submitted` notice. Nothing identifying is posted, which is why
  posting to `*` is acceptable. The snippet handed to the seller checks
  `event.origin` before acting on the message, so another frame on their page
  cannot resize ours.
- Identity verification opens Didit in its **own window**, not in the frame
  (Didit refuses to be framed). The iframe therefore needs no camera or
  microphone permission delegation, and the document never enters a
  seller-controlled document. When a popup blocker stops it, the embedded form
  offers a new-tab link rather than navigating — an iframe must not be able to
  drive its host's navigation.
- `localStorage` access is wrapped in try/catch: in a third-party frame a
  browser may refuse storage entirely, and that must not break the form.
- `embed` is a reserved slug, so no company form can shadow the route.

**Residual risk — clickjacking.** Allowing the form to be framed means it can
be framed by anyone, not only by the seller. The exposure is bounded: the form
holds no session, performs no state-changing action on a click, and a
submission still requires the buyer to type every field and pass a hosted
identity check. Only `/embed/*` should be framable — see §5.2.

---

## 2.12 Findings from the 2026-09-27 audit, and what closed them

A full review, static and live, including an explicit pass from an
unauthenticated attacker's position. Every exploit below was demonstrated
against a running instance first and is now an assertion in
`backend/scripts/securityRegressionTest.ts` (20 checks).

| What was wrong | Why it mattered | What it is now |
|---|---|---|
| One request could carry many aliased mutations | The submit limiter counts requests, so a single request created a submission per copy — proven with 3, bounded only by the 1 MB body | A document may contain one mutation (`lib/queryCost.ts`) |
| Authorization read the JWT's claims | A removed member kept access and a demoted owner kept owner powers for the 30-day token lifetime — both proven | Membership and role are read from the database on every request (`lib/authContext.ts`) |
| A password reset left sessions open | Resetting *because* a token was stolen did not dislodge the thief | `sessionsValidFrom` refuses tokens issued earlier, with one second of grace for `iat` granularity |
| No breadth limit on queries | 50 aliased list queries returned 10,000 decrypted rows; 100 aliased public lookups needed no account | Field count, row budget and mutation count are bounded per document |
| Invite tokens were `cuid()` | Four consecutive invites shared 14 of 25 characters | 32 random bytes, stored only as a SHA-256 digest |
| The receipt email carried the PDF | The public form would send an attachment to any address, unproven | The copy is attached to the approval instead, and recipients have a budget |
| One global verification bucket | Filling 1000 sessions stopped every seller's identity step for an hour and burned the monthly allowance — proven with a 503 | Budgets are per address and per tenant, with a far higher global ceiling |
| The webhook had no rate limit | Rejecting a forged delivery cost ~16 ms of parsing and hashing, unauthenticated and unmetered | Limited, size-capped, and ordered so a forgery costs a string comparison |
| Logins were limited per IP only | Credential stuffing spread across hosts never met a limit | Per-account lockout after 8 failures, plus Turnstile |
| Registration named existing accounts | An enumeration oracle | One vague message, and login compares against a dummy hash so timing matches |
| Ciphertext was not bound to its column | A value moved between columns decrypted cleanly | AES-GCM now binds the column name as additional data (`enc:v2:`), v1 still readable |
| Secrets were unchecked at boot | A one-character `JWT_SECRET` would have been accepted | Both signing secrets must be at least 32 characters |
| `trust proxy` was hardcoded | Wrong hop count means forgeable client addresses | `TRUST_PROXY_HOPS`, validated at boot |
| Limiters lived in process memory | A restart cleared every budget; a second instance doubled them | Counted in Postgres (`lib/rateLimitStore.ts`) |
| No CSP on the frontend | Any XSS could read the tokens in `localStorage` | `script-src 'self'`, plus HSTS and a permissions policy |
| Signing up needed no proof of the address | Anyone could register with someone else's address, claim a slug trading on their name, and run a live form on this domain collecting buyers' details under a brand they did not own — proven | A form only goes live once the owner's address is confirmed, enforced in `formInfo` and again in the submit mutation |
| A committed script created a platform admin | `backend/scripts/.tmp-verify.ts` made an admin with the password `placeholder`; anyone able to run a script against the database had a one-command path to full access | Removed. Scripts with database access are part of the attack surface and are reviewed as such |

Verified clean in the same pass and unchanged since: tenant isolation, guards on
every resolver, JWT forgery (`alg=none` and wrong-secret both refused, algorithms
now pinned), outbound URL injection, ReDoS in the statement screener, email
header injection, and personal data in logs.

**Injection and privilege escalation** have their own suite
(`backend/scripts/injectionTest.ts`), because "can someone reach the database, or
make themselves an administrator" deserves evidence rather than assurance. Eight
classic payloads are sent at the public form lookup, both logins and the
verification-status route; afterwards every table is still present, no
administrator exists that did not before, and nobody has been promoted. A company
named `'; DROP TABLE "Submission"; --` is stored and returned character for
character. Unknown input fields (`isTest`, `status`, `companyId`, a `role`
argument) are refused by the schema, no mutation creates or grants platform
admin, and the only writes to the `Admin` table are command-line scripts that are
not reachable over HTTP.

---

## 2.13 Findings from the 2026-10-02 white-hat pass, and what closed them

A second adversarial pass over the hardened build, looking specifically for ways
round the controls 2.12 added. Each item below was reproduced against a running
instance and is now an assertion in `backend/scripts/hardeningTest.ts`
(12 checks).

| What was wrong | Why it mattered | What it is now |
|---|---|---|
| `inviteMember` was an outbound mailer | Registration is free and instant, and an owner needed no confirmed address to use it. One throwaway signup could send invitations to arbitrary inboxes, in its own chosen company name, from this platform's sending domain — 120 a minute, unbudgeted. The reputational damage lands on our domain, not the sender's | Inviting requires the owner's own address to be confirmed; recipients are validated and normalised; two budgets apply (3 per address per hour, 20 per tenant per day) and a dedicated limiter caps mail-sending operations at 20 per hour |
| The page size could be smuggled past the query budget | Validation runs before variables are coerced, so `limit: $l` was charged the default 100 while the resolver served its own maximum of 200. Five aliases returned 1000 decrypted rows against a 500-row budget — proven | An unknown page size is charged at the ceiling (`MAX_PAGE`), so the budget and the resolver agree |
| The lockout notice was an account oracle | A wrong guess against a locked account was told the account was locked, which confirms both that the address has an account and that it is under attack. It also let a guesser keep the lock alive against the real owner for free | The notice is shown only to someone who got the password right; a wrong guess gets the same message as an unknown address, and does not extend the lock |
| The substance re-check had no throttle | Every press is outbound work against PubChem, in this platform's name, with no cooldown and no in-flight check — an authenticated amplifier pointed at a third party | A run already in flight is refused, and so is one within 30 seconds of the last |
| `submissions` and `adminInsights` were unbounded | The platform queue decrypted every submission in the database into one response, and the insights query pulled every submission and every company into memory to count them. A single click became a memory spike proportional to the whole platform's history | `submissions` is paged (200 maximum), `adminCompanies` is capped, counts are aggregates, the review-time average reads the most recent 2000 decisions and the chart reads only the 12 weeks it draws |
| Hardening keyed off `NODE_ENV` | The instance published through a tunnel still had `NODE_ENV=development`: introspection answered the full schema, every error carried a stack trace with absolute filesystem paths, and the backend's own CSP was off — all three confirmed live | Hardening keys off whether the deployment is publicly reachable (`FRONTEND_URL` is not a loopback address), so a non-production environment name can no longer leave a public instance verbose |
| The two signing secrets could be set to the same value | A company token would then be accepted by the admin verifier and vice versa; the separation between "runs this tenant" and "runs the platform" would rest on which claims happen to be present | Boot refuses identical signing secrets, or either one reused as the encryption key |
| Addresses were stored in whatever case they were typed | Postgres compares case-sensitively, so an invite addressed to `Victim@Example.com` missed the existing `victim@example.com` account and created a second one — the password check that proves ownership had nothing to check against | One canonical form (trimmed, lower-cased, validated, length-capped) everywhere an address is stored or looked up |
| Free text that reaches an inbox was unbounded | Company and personal names, denial reasons and override reasons had no server-side ceiling; the public form's fields did | All bounded at the resolver (120 characters for names, 1000 for reasons) |
| Seller and platform notifications were unbudgeted | Volume is decided by whoever fills in the public form, so a flood of submissions became a flood of mail out of our domain | Budgeted per tenant and per platform inbox (60 per hour) |
| The VIES cache had no ceiling | Keys come from buyer-supplied VAT numbers, so every distinct malformed number was a permanent entry | Capped at 5000 entries, like the PubChem cache |
| `/embed/*` omitted the permissions policy | The one framed route was the one without `camera=(), microphone=()` | Added |

### 2.13.1 The duplicate fingerprints, and the one thing they gave away

The duplicate notice added on 2026-10-02 needed deterministic codes next to the
encrypted columns, because a random IV means the same passport number twice
produces two unrelated ciphertexts that no query can match. That trade-off was
decided deliberately: a code can be confirmed by guessing forward, which works
on short values in a predictable format, but only by someone who already holds
the encryption key — and with the key they could read the plaintext column
instead. Little lost, a real signal gained.

What was *not* decided deliberately: the codes were derived from the key alone,
so they were comparable platform-wide. The same person submitting to two
different sellers produced the same code in both queues. No seller could ever
see it, because the lookup has always been tenant-scoped — but anyone with raw
database access could have followed one buyer from one seller's queue into
another's without decrypting anything, which is a capability the feature never
needed.

Closed on 2026-10-05: the tenant id is part of the key derivation, so a code
means nothing outside the company it was computed for, and a submission
belonging to no company carries no codes at all. Nothing had to be migrated —
no submission had yet been written with a fingerprint. Held by
`backend/scripts/matchKeysTest.ts` (29 checks), which asserts both halves at
once: the same document in the same company still matches, and the same
document in two companies does not.

Re-examined in the same pass and found sound: the webhook signature path and its
ordering, the verification session store's single-use and tenant-ownership
checks, the mass-assignment surface of `SubmitInput` (no `isTest`, `status`,
`companyId` or identity field is accepted from the client), the tenant wrapper,
outbound URL construction in both the VIES and PubChem clients, the statement
screener (regex, not a language model — there is no prompt to inject), email
escaping, and the fail-open choices in the rate-limit store and mail budget,
which remain the right trade-off.

---

## 3. Fixes applied in the latest review (2026-08-03)

Full read-through of the auth, tenancy, crypto, resolver, upload and frontend
surfaces. Two real gaps found and closed:

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | Medium | Password minimum was **client-side only** — the GraphQL API accepted a 1-character password | `assertPasswordStrength()` in `backend/resolvers/company.ts`, enforced in `registerCompany` and `acceptInvite` |
| A2 | Low–Med | `/phone-session` was unauthenticated **and unrated** — unbounded Map growth → memory DoS | `extractLimiter` applied + `MAX_PHONE_SESSIONS` cap of 1000, returning 503 when full |
| A3 | Hygiene | `eng.traineddata` (~10 MB) could be committed accidentally | Added to `backend/.gitignore` |

### Verification

`backend/scripts/crossTenantTest.ts` — **14 / 14 passing**. It registers two real
tenants, seeds a submission for tenant A, and attacks it with tenant B's token:

- Tenant A sees its own submission; tenant B's list does not contain it.
- All 7 cross-tenant mutations rejected (approve, deny, reopen, delete, override,
  clear override, recheck).
- Unauthenticated access rejected.
- Depth-10 query rejected; batched request rejected.
- **New:** short password rejected server-side.
- **New:** `/phone-session` burst returns 429.

Run with `npx tsx scripts/crossTenantTest.ts` (backend must be on `:3000`).

---

## 4. Assessed and deliberately not changed

- **Storage engine (Cloudflare R2 evaluation).** R2 is object storage, not a
  database. Moving there would discard SQL-enforced tenant isolation in favour of
  key-prefix conventions, trade a hard-to-misconfigure surface for the most common
  cloud-breach cause (public bucket exposure), and hand key custody to the
  provider — while your PII is already encrypted client-side of the DB. Verdict:
  **not more secure for this workload.** R2 remains a good fit for *encrypted
  database backups* (see 5.3). Cloudflare **Access** is the genuinely valuable
  product here (see 5.1).
- **Prompt injection into the Gemini substance check.** User free-text reaches the
  model, but the output only flags for manual review and can never auto-approve,
  so impact is nil.
- **Admin omniscience.** The admin reading all tenants' PII and impersonating
  owners is by design and is audit-logged. The mitigation is MFA (5.1), not a code
  change.

---

## 5. Next steps

### 5.1 Admin & owner MFA — done 2026-10-05

Closed. TOTP (RFC 6238) for both account kinds, because an owner can read every
buyer's identity document number in their tenant and a platform admin can do it
in every tenant — the same control belongs on both.

The algorithm is written out in `backend/lib/totp.ts` rather than installed. It
is thirty lines of HMAC and a modulus, both RFCs publish known-answer vectors,
and `backend/scripts/totpTest.ts` runs every one of them (55 checks) — so the
one control standing between a stolen password and all of that data is
*demonstrated* correct instead of trusted. A package here would have been
unverifiable code in the authentication path with its own dependency tree.

What the surrounding design does, and why:

- **Enrolment is two steps.** A secret is stored when it is scanned, but the
  factor only switches on once a code proves the app really has it. Enabling on
  the strength of a scan alone is how people lock themselves out.
- **The secret is encrypted at rest** with the same key as buyer PII. A stolen
  secret is a permanent bypass, so it never sits in the clear.
- **A code cannot be replayed.** The accepted 30-second step is recorded; a code
  stays valid for the rest of its step, so without that, one read over a
  shoulder works for up to a minute.
- **Ten single-use recovery codes**, stored as digests, shown once. Without them
  the only way back in is a support path that can strip someone's MFA, which is
  itself an attack.
- **The factor is checked only after the password.** Asking earlier would tell
  an unauthenticated guesser which accounts have one — a map of which accounts
  are worth attacking.
- **A wrong code spends the login budget**, so six digits cannot be ground down;
  a code not yet given does not, because the form has simply not been filled in.
- **Turning it off needs the password and a current code**, so a stolen session
  cannot strip the factor protecting it.
- **No SMS.** A phone number is transferable by anyone who can convince a
  carrier, which defeats the point.

`backend/scripts/mfaTest.ts` (36 checks) exercises all of that over the real
API. Still open: enforcing it rather than offering it. Enrol first, then decide.

### 5.1.1 Original note, kept for the reasoning

The admin account can read every tenant's decrypted PII and impersonate any
company owner. It has **no second factor**. This is the single largest remaining
risk.

**Recommended:** put **Cloudflare Access** in front of the `/admin` route. It
provides SSO + MFA at the edge with no auth code to write or maintain.
Alternative: TOTP enrolment on `adminLogin` / `companyLogin`.

### 5.2 Deployment configuration

- **`trust proxy` hop count** — `backend/index.ts` currently sets
  `app.set('trust proxy', 1)`. All rate limiters key on the client IP derived from
  `X-Forwarded-For`. If production has more than one proxy hop, an attacker can
  inject a header hop and rotate their apparent IP to evade the login and submit
  limiters. **Set this to the exact number of trusted proxies in production.**
- **CORS** — confirm `FRONTEND_URL` is set to the exact production origin.
  Without it, `ALLOWED_ORIGIN` is `null` in production and browsers are blocked.
- **Frame-ancestors — shipped for Netlify/Cloudflare Pages, still needed
  elsewhere.** `frontend/public/_headers` now carries the policy below, so those
  two hosts are covered. Any other host (nginx, S3+CloudFront, a Node static
  server) needs it expressed its own way. The frontend is served as static
  files, so `helmet` on the API does not set its headers. The rule is, for
  `/embed/*` only:
  `Content-Security-Policy: frame-ancestors https:` (any seller site), and for
  **every other path** `frame-ancestors 'none'` plus `X-Frame-Options: DENY`,
  so the dashboards and the hosted form cannot be framed. Getting this backwards
  — a blanket `DENY` — silently breaks every seller's embed; a blanket `*`
  makes the admin dashboard clickjackable.

  nginx:

  ```nginx
  add_header Content-Security-Policy "frame-ancestors 'none'" always;
  add_header X-Frame-Options "DENY" always;

  location /embed/ {
      add_header Content-Security-Policy "frame-ancestors https:" always;
  }
  ```

  Netlify / Cloudflare Pages `_headers`:

  ```
  /*
    Content-Security-Policy: frame-ancestors 'none'
    X-Frame-Options: DENY
  /embed/*
    Content-Security-Policy: frame-ancestors https:
    X-Frame-Options:
  ```

  If a seller wants their embed locked to their own site, replace `https:` with
  their origin — that is a per-tenant policy this platform does not model yet.

### 5.3 Database & infrastructure hardening

- **Least-privilege DB role** — the app should not connect as owner/superuser.
- **`sslmode=require`** on the Postgres connection string.
- **Private networking** — the database must not be reachable from the internet.
- **Backups + a tested restore.** There is currently no verified backup path.
  Encrypted dumps to object storage (R2 is a fine target here) with a **restore
  drill that has actually been run**.
- **Secret manager + key rotation** — `ENCRYPTION_KEY` in particular has no
  rotation story. Note that rotating it requires re-encrypting existing rows;
  the `enc:v1:` prefix in `cipher.ts` was designed to allow versioned keys.
- **Alerting** — no monitoring on repeated auth failures, 429 spikes, or support
  sessions being opened.

### 5.4 Application hardening (smaller)

- **Company JWT lifetime** — 30-day tokens in `localStorage`. Safe today (no XSS
  sink exists), but the window is wide if one is ever introduced. Consider a
  shorter lifetime with refresh, or a token-version column for server-side
  revocation.
- **Per-account login lockout** — throttling is per-IP only. bcrypt cost 12 makes
  this low priority, but a distributed slow brute force faces no per-account
  limit.
- **Cache size caps** — the VIES cache and extraction store have TTLs but no
  maximum size.

### 5.5 Data retention — closed 2026-08-20

The 18-month purge used to key on `idDataCollectedAt`, so a submission from a
form with identity verification switched off was **kept forever**. It now runs
off `createdAt`, which covers every row, with the period in one place
(`RETENTION_MONTHS` in `backend/lib/retention.ts`).

Tenant erasure exists alongside it: an owner can close the company account,
which schedules a purge 30 days out (`DELETION_GRACE_DAYS`). Nothing is deleted
during the grace period and the owner can undo it; at the end the nightly job
removes the company, its submissions, its invites and memberships, and the
accounts of members who belonged to no other company. Covered by
`backend/scripts/qolTest.ts`.

### 5.6 Dependency vulnerabilities

As of 2026-08-03 (`npm audit`):

- **backend — 12** (4 high, 7 moderate, 1 low)
- **frontend — 4** (3 high, 1 moderate)

Notable: `nodemailer` (high), `sharp` (high), `brace-expansion` (high),
`fast-uri` (high), `@apollo/server` (moderate). All currently report
`fixAvailable`, though some require major-version upgrades with breaking changes.

These counts **drift as new advisories are published** — they roughly doubled over
the course of a few weeks without any dependency change. Re-run `npm audit` before
acting rather than trusting this snapshot.

**Recommendation:** schedule a dependency upgrade pass, test `nodemailer` and
`sharp` upgrades first (both are in the live request path — email sending and
phone-capture thumbnailing), and add automated dependency scanning to CI so this
does not silently accumulate.

---

## 6. Operational rules (standing)

- Passport/ID images are **never** written to disk — memory only, discarded after
  extraction. Only extracted fields are stored.
- **No BSN** (Dutch citizen service number) is ever stored.
- Driver's licences are **not accepted** as identity documents.
- Prisma schema changes use `npx prisma db push` + `npx prisma generate` —
  **never** `migrate dev`.
- Automated checks **flag only** — never auto-approve or auto-deny.
- Any cloudflared tunnel opened for development is killed when the session ends.
  A quick tunnel is bound to a **port**, not to a process: if the thing it was
  opened for stops and something else takes that port, the tunnel publishes the
  something else. Found live on 2026-10-02 — a tunnel opened for this app was
  serving an unrelated project's build directory from port 5174.
- Before trusting a test run, confirm the server answering it is the one you
  just started. `tsx index.ts` cannot bind an occupied port, so a second copy
  exits while the old one keeps serving — a full suite then passes against code
  that is days old. Check with `lsof -nP -iTCP:3000 -sTCP:LISTEN` and expect
  exactly one listener. Found twice now, in two different sessions.
- `NODE_ENV` is a developer's convenience, not a security boundary: the server
  decides whether to harden from whether `FRONTEND_URL` is publicly reachable.
  Watch the boot lines — it says which mode it chose, and warns when bot
  protection is inert on a public instance.
