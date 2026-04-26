FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/bot/package.json ./packages/bot/
COPY packages/api/package.json ./packages/api/
COPY packages/extension/package.json ./packages/extension/

RUN pnpm install --frozen-lockfile --filter '@faceit-coach/api...'

COPY packages/core ./packages/core
COPY packages/api ./packages/api

RUN pnpm --filter '@faceit-coach/api...' build

RUN pnpm --filter '@faceit-coach/api...' deploy --prod /out

FROM node:24-alpine AS runtime

WORKDIR /app
COPY --from=builder /out/dist ./dist
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /out/package.json ./package.json

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

ENV NODE_ENV=production
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8787/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/index.js"]
