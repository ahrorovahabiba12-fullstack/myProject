FROM node:22-alpine
WORKDIR /app

# Prisma's query engine needs OpenSSL, which Alpine doesn't ship.
# All "today"/day-of-week logic (schedule, streaks, progress) runs in the
# server's local time. Alpine ships without tz data, so a bare container ran
# in UTC and the day boundary fell at 05:00 in Tashkent — a quiz at 02:00
# counted as yesterday. Override TZ at deploy time for another region.
RUN apk add --no-cache openssl tzdata && npm install -g pnpm@11.18.0
ENV TZ=Asia/Tashkent

# Tolerant of slow/flaky connections: pnpm's 60s default fetch timeout aborted
# the whole install on a slow link. The store is a BuildKit cache mount, so a
# retried or later build reuses every package already downloaded.
ENV pnpm_config_fetch_timeout=300000 \
    pnpm_config_fetch_retries=5 \
    pnpm_config_network_concurrency=4 \
    pnpm_config_store_dir=/pnpm-store

# Same package manager and lockfile as local development, so the image gets
# exactly the tested dependency versions (pnpm-workspace.yaml carries the
# allowed dependency build scripts).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# The app only reads /app at runtime, so it doesn't need root — a hole in a
# dependency then can't write to the image or the rest of the container.
USER node

EXPOSE 4000
# `exec` replaces sh with node, so `docker stop`'s SIGTERM reaches node
# directly instead of stopping at sh and waiting out the 10s kill timeout.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm run prisma:seed-if-empty && exec node dist/server.js"]
