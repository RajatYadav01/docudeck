# Build context must be the monorepo root so shared workspace packages are available.
FROM node:24-alpine AS base
WORKDIR /repo
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1

# Full workspace dependencies are retained in this target because the database-init
# container executes TypeScript migration and seed scripts from packages/database.
FROM base AS tools
COPY . .
RUN pnpm install --no-frozen-lockfile

FROM tools AS builder
ARG DATABASE_URL=postgres://docudeck:41532145@localhost:5432/docudeck
ARG SESSION_SECRET=docudeck-build-only-session-secret-change-this
ARG DOCUMENT_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ENV DATABASE_URL=$DATABASE_URL
ENV SESSION_SECRET=$SESSION_SECRET
ENV DOCUMENT_ENCRYPTION_KEY=$DOCUMENT_ENCRYPTION_KEY
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
RUN pnpm --filter @docudeck/web build

# Runtime image keeps workspace symlinks and package dependencies intact. For this
# time-boxed demo that favors reliable deployment over a tiny image size.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /repo /repo
EXPOSE 3000
CMD ["pnpm", "--filter", "@docudeck/web", "start"]
