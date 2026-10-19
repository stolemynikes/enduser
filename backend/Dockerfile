# The API. No build step: Node 24 strips TypeScript natively, so `node index.ts`
# is the production entrypoint and there is no compiled output to keep in sync
# with the source.
FROM node:24-alpine

# bcrypt and the Prisma engines are the two things that care about the platform.
# Alpine needs libc6-compat for the prebuilt binaries; without it Prisma fails
# at runtime with an engine-not-found that reads like a missing file.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Dependencies first, so a source change does not reinstall them.
#
# Dev dependencies are installed on purpose. The Prisma CLI lives there — it is
# a build tool, not a runtime one — and both `prisma generate` below and
# `prisma migrate deploy` at start need it. Omitting them produces an image that
# cannot migrate, which is a confusing failure to meet on a first deploy.
COPY package.json package-lock.json ./
RUN npm ci

# The generated client is not in the repository (it is platform-specific and
# gitignored), so it is produced here against the schema being deployed.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Not root. The app writes nothing to disk at runtime, so the image's own
# unprivileged user can run it; a compromise of the process is then not root
# inside the container. The source stays owned by root, so it cannot be
# rewritten from inside either.
USER node

# Postgres is reached over the compose network; nothing here is published.
EXPOSE 3000

# Migrations run before the server, not alongside it. `migrate deploy` applies
# only what is in prisma/migrations and is idempotent, so a restart is safe —
# but it is not safe to race, so this image expects a single replica. More than
# one means moving migrations into their own one-shot job.
#
# exec, so Node is PID 1 and receives SIGTERM directly: without it the shell
# swallows the signal and the container is killed after the grace period instead
# of shutting down.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node index.ts"]
