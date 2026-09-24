FROM node:22-bookworm

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/miniapp/package.json ./apps/miniapp/package.json

RUN pnpm --filter @mood-record/api... install --frozen-lockfile
RUN pnpm build:shared && pnpm --filter @mood-record/api build
RUN mkdir -p /var/lib/mood-record && chown node:node /var/lib/mood-record

ENV HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/var/lib/mood-record/mood-record.sqlite3
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]
