# Build stage. Vite inlines VITE_* variables at build time, so the API URL is
# a build argument here, not a runtime environment variable.
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@11.18.0

# Same slow-network tolerance and shared package cache as server/Dockerfile.
ENV pnpm_config_fetch_timeout=300000 \
    pnpm_config_fetch_retries=5 \
    pnpm_config_network_concurrency=4 \
    pnpm_config_store_dir=/pnpm-store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

# Serve stage: only the built static files behind nginx — no Node and no Vite
# dev server in the image that actually runs.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
