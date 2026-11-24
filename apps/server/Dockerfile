FROM node:26-slim AS builder
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci

ENV NODE_ENV=production
RUN cd apps/server && npm run build

FROM node:26-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Africa/Maputo
COPY --from=builder /app /app

EXPOSE 3000
USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=10 \
  CMD node -e "fetch('http://localhost:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "cd /app/packages/db && npx --no-install drizzle-kit migrate && cd /app/apps/server && exec node dist/index.mjs"]
