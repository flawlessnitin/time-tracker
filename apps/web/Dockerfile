# Web Dockerfile - Bun for build, serve static
FROM oven/bun:1.1-alpine AS base

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

WORKDIR /app/apps/web
RUN bun run build

# Production stage - serve with Bun
FROM base AS runner
WORKDIR /app

# Install a simple static file server
RUN bun add serve

COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 5173

CMD ["bunx", "serve", "-s", "dist", "-l", "5173"]
