# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl tzdata

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS prod-deps
RUN npm prune --omit=dev --ignore-scripts \
  && npm cache clean --force

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL=file:/app/data/dev.db \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN ./node_modules/.bin/nuxt prepare \
  && ./node_modules/.bin/prisma generate \
  && npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=41832 \
    TZ=Asia/Shanghai \
    DATABASE_URL=file:/app/data/dev.db \
    APP_UPLOADS_PATH=/app/public/uploads \
    APP_UPLOADS_BACKUP_PATH=/app/uploads_backup \
    APP_LINE_ARTS_PATH=/app/runtime-line-arts \
    APP_SETTINGS_PATH=/app/server/data/settings.json \
    APP_LINE_ART_HISTORY_PATH=/app/server/data/line-art-history.json \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nuxt

COPY --from=builder --chown=nuxt:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxt:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nuxt:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nuxt:nodejs /app/app/generated/prisma ./app/generated/prisma
COPY --from=prod-deps --chown=nuxt:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nuxt:nodejs /app/public ./public
COPY --chown=nuxt:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/data /app/public/uploads /app/uploads_backup /app/runtime-line-arts /app/server/data \
  && chown -R nuxt:nodejs /app/data /app/public/uploads /app/uploads_backup /app/runtime-line-arts /app/server/data \
  && chmod 0755 /app/docker-entrypoint.sh

USER nuxt
EXPOSE 41832

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:41832/api/health >/dev/null || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
