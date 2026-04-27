FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app
ENV CI=true

# Copy workspace manifests and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json .npmrc ./
COPY packages/core/package.json ./packages/core/
COPY packages/bot/package.json ./packages/bot/
COPY packages/api/package.json ./packages/api/
COPY packages/extension/package.json ./packages/extension/

# Install deps for bot and its workspace dependencies
RUN pnpm install --frozen-lockfile --filter '@faceit-coach/bot...'

# Copy source for the packages we need to build
COPY packages/core ./packages/core
COPY packages/bot ./packages/bot

# Build, then produce a self-contained prod-only bundle in /out
RUN pnpm --filter '@faceit-coach/bot...' build
RUN pnpm --filter '@faceit-coach/bot' deploy --prod /out

FROM node:24-alpine AS runtime

WORKDIR /app
COPY --from=builder /out/dist ./dist
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
