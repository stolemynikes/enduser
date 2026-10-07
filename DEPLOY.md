# Going live

Written after a sweep on 2026-10-07. The application is ready; the deployment
does not exist yet. This is what stands between the two.

Nothing here needs a build step: Node 24 strips TypeScript natively, so
`npm start` runs `node index.ts` directly. Verified.

**The Docker setup in this repository has never been built.** There is no
container runtime on the machine it was written on, so the Dockerfiles, the
Caddyfile and `docker-compose.yml` are reviewed but unrun. Expect to fix
something on the first `docker compose up`. Three mistakes were already found
and corrected by reading, including an internal-only network that would have
left the API unable to reach the identity provider at all.

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

On a server, with Docker:

```sh
cp .env.example .env     # then fill it in; compose refuses to start on a gap
docker compose up -d --build
docker compose logs -f api
```

Three containers. `web` is Caddy: it terminates TLS with a certificate it
fetches itself, serves the built app, proxies `/graphql` and the identity
routes, and sets the security headers. `api` is the server. `db` is Postgres on
an internal network with no route to or from the internet.

The API container runs `prisma migrate deploy` before starting, which is
idempotent, so a redeploy is safe. It is not safe to *race*, so this expects a
single replica; more than one means moving migrations to their own one-shot job.

Without Docker the same thing by hand:

```sh
npm ci                 # dev dependencies included: prisma is one, and migrate needs it
npm run migrate        # prisma migrate deploy
npm start              # node index.ts
```

Two notes either way. The Prisma CLI is a `devDependency`, so a release step
that installs with `--omit=dev` cannot migrate — the Dockerfile installs fully
for that reason. And `prisma migrate deploy` only applies what is in
`prisma/migrations`; there is one partial index that Prisma's schema language
cannot express and that lives in SQL only (`20261005180000`), so never reset the
database from `schema.prisma` alone.

## 4a. The Ubuntu host

Take the current LTS. Nothing in this stack depends on the distribution —
Docker provides the runtime, and the host needs Docker, a firewall and an
accurate clock. Five things bite specifically here.

**Install Docker from Docker's own repository, not `apt install docker.io`.**
The packaged version lags and the compose plugin is separate:

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # log out and back in
```

Membership of the `docker` group is equivalent to root — the daemon will mount
any path you ask it to. Treat it as an admin account, not a convenience.

**The firewall and Docker disagree, and Docker wins.** `ufw` filters the `INPUT`
chain; Docker publishes ports by writing its own `DOCKER` chain rules that are
evaluated first. So a published port is reachable from the internet *even with
`ufw deny` in place* — people discover this when their database turns up in a
scan.

```sh
sudo ufw default deny incoming
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

That is correct for this stack because only Caddy publishes anything, and 80
and 443 are what should be open. The rule to remember: never add `ports:` to the
`db` service to point a GUI client at it. Use `docker compose exec db psql`, or
tunnel over SSH. A published database port is public regardless of `ufw`.

**The clock is load-bearing.** One-time codes are derived from the current
30-second window, and the identity provider's webhook is rejected outside a
300-second signature window. A drifting clock breaks sign-in and silently drops
webhook deliveries — two failures that look like nothing to do with time.
`systemd-timesyncd` is on by default; confirm rather than assume:

```sh
timedatectl status | grep -E 'synchronized|NTP'
```

**Cap the logs.** Docker's default driver grows without limit, and a full disk
takes Postgres down with it. In `/etc/docker/daemon.json`:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
```

Then `sudo systemctl restart docker`.

**Give it swap if the box is small.** `npm ci` plus a Vite build plus Postgres
on 1GB will be killed mid-build, and the error points at the build rather than
at memory. 2GB of swap costs nothing:

```sh
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Also worth doing, in the ordinary way: key-only SSH with root login disabled,
and `unattended-upgrades` so security patches land without being remembered.

## 4b. Backups

Two things, kept apart, which is the whole point:

```sh
# The data. Run it from a systemd timer or cron; keep copies off the server.
docker compose exec -T db pg_dump -U enduser enduser | gzip > enduser-$(date +%F).sql.gz
```

And `ENCRYPTION_KEY`, stored somewhere that is **not** where those dumps go. A
dump without the key is unreadable, which is the design working; a dump beside
the key is one theft away from being plaintext.

Test a restore before you need one. An untested backup is a belief.

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

Two copies of one policy, which is a maintenance hazard worth knowing about:

- `frontend/public/_headers` — Netlify and Cloudflare Pages syntax
- `frontend/Caddyfile` — what the Docker deployment actually uses

Caddy does not read `_headers`, and nothing checks that the two agree. Change
one, change the other. Both carry the same exception: `/embed/*` may be framed
because sellers put it on their own site, and everything else may not.

Check after deploying that they are really there, because a header policy that
is quietly absent is the worst outcome — the page works, so nothing complains:

```sh
curl -sI https://<host>/ | grep -iE 'content-security-policy|x-robots-tag|strict-transport'
curl -sI https://<host>/embed/some-slug | grep -i 'frame-ancestors\|x-frame-options'
```

The second should show `frame-ancestors https:` and **no** `X-Frame-Options`.

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
