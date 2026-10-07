# Going live

Written after a sweep on 2026-10-07. The application is ready; the deployment
does not exist yet. This is what stands between the two.

Nothing here needs a build step: Node 24 strips TypeScript natively, so
`npm start` runs `node index.ts` directly. Verified.

---

## 1. Two machines, not one

The single most important item, and the only one that defeats every control in
the application.

Right now `DATABASE_URL` points at `localhost`, which is the same laptop that
holds `.env`, which holds `ENCRYPTION_KEY`. Whoever has that machine has both
the ciphertext and the key, and then:

- every buyer's name, address and identity document number reads in the clear
- the TOTP secrets are in that database, encrypted with that key, so codes can
  be generated at will
- one `INSERT` into `Passkey` with an attacker's own public key signs them in as
  anybody, so passkeys do not help either
- `JWT_SECRET` forges a platform-admin token

So: the database on its own host, reachable only from the application, over TLS,
and the encryption key held by the application host and **not** in the same
backup as the database. A database backup and a key backup in one place is the
same failure with extra steps.

## 2. Secrets

Treat everything currently in `.env` as burned — it has sat on a public tunnel
for days. Generate fresh:

```sh
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # COMPANY_JWT_SECRET   (must differ; boot refuses if equal)
openssl rand -hex 32   # ENCRYPTION_KEY
```

`ENCRYPTION_KEY` cannot be rotated by anything that exists yet: change it and
every submission already written becomes unreadable. Back it up separately from
the database, and write down where.

## 3. Environment

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Hardening also triggers on a non-loopback `FRONTEND_URL`, so this is belt rather than braces — set it anyway |
| `FRONTEND_URL` | the real origin | Drives CORS, email links, the Didit callback, and the passkey relying party |
| `RP_ID` | the bare hostname | Only needed if it differs from `FRONTEND_URL`'s host |
| `TRUST_PROXY_HOPS` | count your proxies | Too high and `X-Forwarded-For` is forgeable, so every IP-keyed limit is evaded; too low and every client looks like the proxy and shares one bucket. Behind Cloudflare alone it is 1 |
| `SMTP_*` | real credentials | **No mail has ever been delivered.** Every decision, invitation and reset currently fails into a `.catch` |
| `TURNSTILE_SECRET` / `TURNSTILE_SITE_KEY` | from Cloudflare | Without them the anti-robot check is inert and the public form is free to script |
| `REQUIRE_MFA` | `1` — *after* step 5 | Setting it first locks you out of your own product |

## 4. Run it

```sh
npm ci                 # dev dependencies included: prisma is one, and migrate needs it
npm run migrate        # prisma migrate deploy
npm start              # node index.ts
```

Two notes. The Prisma CLI moved to `devDependencies`, so a release step that
installs with `--omit=dev` cannot migrate — install fully in the release step,
or run migrations from a job that does. And `prisma migrate deploy` only applies
what is in `prisma/migrations`; there is one partial index that Prisma's schema
language cannot express and that lives in SQL only (`20261005180000`), so never
reset the database from `schema.prisma` alone.

## 5. Enrol, then enforce

In this order, or the next step locks you out:

1. Sign in, Account tab, add a passkey. Then the admin account.
2. Save the recovery codes somewhere other than the laptop with the passkey.
3. Set `REQUIRE_MFA=1` and restart.

Until this is done, every authentication control built in October is code with
nothing switched on. As of 2026-10-07: 0 of 7 seller accounts and 0 of 1 admin
account have a second factor.

A passkey enrolled against a temporary tunnel address dies with the tunnel, so
enrol on the real domain.

## 6. Headers

`frontend/public/_headers` is Netlify and Cloudflare Pages syntax. On nginx or
anything else the same policy has to be restated by hand — including the one
exception, where `/embed/*` may be framed and everything else may not. Serving
the app without those headers removes the CSP that is the main defence against a
script reading the tokens in `localStorage`.

Check after deploying that `X-Robots-Tag` and `Content-Security-Policy` actually
appear on a response. A `_headers` file on a host that ignores it fails silently.

## 7. Didit

Point the production webhook at `https://<host>/didit-webhook`. The signature
secret is already set; the URL is not.

## 8. Before real buyers

- **The data now in the database is development data**, including one real
  passport number. Decide what carries over; the cheapest security measure is
  not holding what you do not need.
- **A pentest by somebody else**, against a copy with invented data. Two
  adversarial passes in this repo were both mine, and I wrote most of the code —
  that has a ceiling I cannot see past.
- **Monitoring.** There is none. The reveal log is the only place an intrusion
  would leave a trace, and only for one field.
- **An edge** — Cloudflare in front, bot protection on. `robots.txt` is a
  request; the rate limiter writes to Postgres on every hit, so a flood
  amplifies database load rather than being absorbed.
- **The suspicion screening is English-only.** "Ich will damit eine Waffe
  bauen" passes unflagged, and the form is about to become multilingual. This is
  an Article 9 gap, not a translation nicety.
- **`security.txt`** still says `eustatement.example`. Replace the addresses and
  the `Expires` date.
