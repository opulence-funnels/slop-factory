FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/client/package.json packages/client/package.json
RUN pnpm install --frozen-lockfile

# ── Build shared + client ────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/client/ packages/client/

RUN pnpm --filter @slop-factory/shared build
RUN pnpm --filter @slop-factory/client build

# ── Production image ─────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/packages/client/.next/standalone ./
COPY --from=build /app/packages/client/.next/static ./packages/client/.next/static

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", "packages/client/server.js"]
