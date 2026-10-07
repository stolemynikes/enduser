# The browser app, built and then handed to Caddy to serve.
#
# Two stages so the image that runs in production holds static files and a web
# server, and not Node, npm, the sources or 400MB of node_modules.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Nothing here needs build-time configuration: the app calls /graphql relative
# to wherever it is served, so one image works on any hostname.
RUN npm run build

FROM caddy:2-alpine
# The headers, the SPA fallback and the API proxy all live in the Caddyfile,
# which replaces public/_headers in this deployment — that file is Netlify and
# Cloudflare Pages syntax and Caddy does not read it. The policy is restated
# there rather than translated at deploy time by hand, which is the step that
# silently gets skipped.
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
