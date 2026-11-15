# Docudeck

Docudeck is a lightweight, browser-based collaborative document editor. It supports rich-text documents, text-file import, persistent storage, document sharing, comments, version history, presence indicators, and Markdown/PDF-friendly export.

## Table of contents

- [Docudeck](#docudeck)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
    - [Document creation and editing](#document-creation-and-editing)
    - [File import](#file-import)
    - [Sharing and permissions](#sharing-and-permissions)
    - [Collaboration and document history](#collaboration-and-document-history)
    - [Security and engineering](#security-and-engineering)
  - [Tech stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Working](#working)
    - [Application flow](#application-flow)
    - [API endpoints](#api-endpoints)
    - [Permission matrix](#permission-matrix)
    - [Optional enhancement status](#optional-enhancement-status)
  - [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
    - [1. Clone the project's repository](#1-clone-the-projects-repository)
    - [2. Install dependencies](#2-install-dependencies)
    - [3. Configure local environment variables](#3-configure-local-environment-variables)
    - [4. Start PostgreSQL, migrate and seed](#4-start-postgresql-migrate-and-seed)
    - [5. Start the web application](#5-start-the-web-application)
    - [7. Run checks and browser tests](#7-run-checks-and-browser-tests)
  - [To run the project using Docker](#to-run-the-project-using-docker)

## Features

### Document creation and editing

- Create, rename, edit, save, reopen, and delete documents.
- Tiptap rich-text editor with bold, italic, underline, headings, paragraphs, blockquotes, and ordered/unordered lists.
- Explicit save state and optimistic revision checks to reduce accidental overwrites.
- Document ownership and shared-document sections on the dashboard.

### File import

- Import UTF-8 `.txt` files into new editable documents.
- File size is limited to 1 MiB. Unsupported extensions, empty files, invalid UTF-8, and binary-looking content are rejected.

### Sharing and permissions

- Seeded demo users and signed, HttpOnly sessions.
- Owner, Editor, Commenter, and Viewer access levels.
- Owners can invite another seeded user, change their role, and revoke access.
- Permissions are checked by server-side API handlers, not only by the user interface.

### Collaboration and document history

- Presence indicators use a short polling heartbeat; they indicate who has recently opened a document but do not synchronize simultaneous edits.
- Collaborators can post and resolve document-level comments.
- Commenters and editors can submit exact-phrase replacement suggestions; owners and editors can accept or reject them. Acceptance updates the document and creates a version snapshot.
- Saved content revisions are snapshotted and can be restored by owners and editors.
- Export to Markdown; browser print styles support Print / Save as PDF.

### Security and engineering

- Document content, comment bodies/anchors, suggestion text, and version snapshots are encrypted before database persistence using AES-256-GCM.
- Database connections use TLS for non-local database URLs. Hosted PostgreSQL providers should also have encryption-at-rest enabled.
- Zod request validation, database constraints, foreign keys, and meaningful Vitest unit tests.
- Feature-based code organization, Drizzle ORM, migration scripts, Biome, and a GitHub Actions check workflow.

## Tech stack

- **Web**: Next.js, TypeScript, Tailwind CSS
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **AI**: OpenRouter
- **Testing**: Vitest for unit and integration tests, Playwright for E2E tests
- **Tooling**: pnpm, Turborepo, Biome, Zod, Docker, Docker Compose
- **Deployment**: [Vercel](https://vercel.com) (Web) and [Neon](https://neon.com) (Database)

## Project Structure

```text
docudeck/
├── apps/
│   └── web/
│       ├── public/
│       │   └── favicon.svg
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/
│       │   │   ├── (dashboard)/documents/
│       │   │   └── api/v1/
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── comments/
│       │   │   ├── documents/
│       │   │   ├── editor/
│       │   │   ├── presence/
│       │   │   └── sharing/
│       │   └── lib/
│       ├── vitest.config.ts
│       ├── vitest.setup.ts
│       └── Dockerfile
├── packages/
│   ├── config/                 # Zod environment schemas
│   ├── constants/              # Shared constants and roles
│   ├── database/
│   │   ├── drizzle/             # SQL migrations
│   │   ├── src/db/
│   │   │   ├── relations.ts     # Drizzle defineRelations
│   │   │   └── schema.ts        # Normalized PostgreSQL schema
│   │   ├── drizzle.config.ts
│   │   └── src/migrate.ts       # Idempotent migration runner
│   ├── e2e-tests/               # Playwright browser tests
│   ├── schemas/                 # Shared Zod request schemas
│   ├── tsconfig/                # Shared TypeScript configurations
│   └── types/                   # Shared application types
├── .github/workflows/ci.yml
├── docker-compose.yml
├── biome.json
├── lint-staged.config.mjs
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

The web application uses a feature-based architecture. Pages in `app/` compose feature components, while API route handlers are versioned beneath `app/api/v1/`. Authentication, document access, validation, and encryption helpers are kept separate from presentation components.

## Working

### Application flow

1. A user signs in with one of the seeded demo accounts. The server verifies the password hash and issues a signed session cookie.
2. The dashboard queries owned and shared documents separately. A document only appears when its owner or a share record grants access.
3. New documents start with an empty Tiptap JSON tree. The editor sends structured JSON to the versioned API when the user saves.
4. Before content updates, the API checks access role and the expected document revision. A pre-update encrypted snapshot is added to `document_versions`.
5. Document content and comment bodies are encrypted in the application before persistence. PostgreSQL stores ciphertext, nonce, authentication tag, and the encryption-format prefix together in a versioned payload.
6. Sharing writes a normalized `document_shares` record. API handlers enforce owner/editor/commenter/viewer capabilities on every protected operation.
7. Presence heartbeats refresh every 20 seconds and the API reports users seen within the active-presence window. This is presence awareness, not real-time collaborative editing.

### API endpoints

All application endpoints are under `/api/v1`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Sign in with a seeded demo account |
| POST | `/auth/logout` | Clear the session cookie |
| GET | `/auth/me` | Return the current session user |
| GET / POST | `/documents` | List or create documents |
| GET / PATCH / DELETE | `/documents/:documentId` | Read, save/rename, or delete a document |
| GET / POST | `/documents/:documentId/share` | List collaborators or grant/update access |
| DELETE | `/documents/:documentId/share/:userId` | Revoke collaborator access |
| GET | `/documents/:documentId/versions` | List document snapshots |
| POST | `/documents/:documentId/restore` | Restore a previous snapshot |
| GET / POST | `/documents/:documentId/comments` | List or add comments |
| GET / POST | `/documents/:documentId/suggestions` | List or submit text replacement suggestions |
| PATCH | `/documents/:documentId/suggestions/:suggestionId` | Accept or reject a suggestion |
| PATCH | `/documents/:documentId/comments/:commentId` | Resolve or reopen a comment |
| GET / POST | `/documents/:documentId/presence` | Read or refresh collaborator presence |
| GET | `/documents/:documentId/export?format=markdown` | Export Markdown |
| POST | `/import` | Import a `.txt` file into a new document |

### Permission matrix

| Operation | Owner | Editor | Commenter | Viewer |
| --- | --- | --- | --- | --- |
| Read | Yes | Yes | Yes | Yes |
| Edit content | Yes | Yes | No | No |
| Rename document | Yes | No | No | No |
| Share/manage access | Yes | No | No | No |
| Add/resolve comments | Yes | Yes | Yes | No |
| Submit text suggestions | Yes | Yes | Yes | No |
| Accept/reject suggestions | Yes | Yes | No | No |
| Read version history | Yes | Yes | No | No |
| Restore version | Yes | Yes | No | No |
| Export Markdown / print | Yes | Yes | Yes | Yes |

### Optional enhancement status

| Enhancement | Status | Notes |
| --- | --- | --- |
| Real-time collaboration indicators | Implemented (polling) | Presence only; simultaneous editing is not synchronized. |
| Commenting | Implemented | Document-level comments with resolve/reopen. Text-range anchors and threaded replies are not implemented. |
| Suggestion mode | Implemented (phrase replacement) | Collaborators submit unique single-line replacement proposals; owners/editors accept or reject. Anchored selections and inline change marks are not implemented. |
| Document version history | Implemented | Snapshots are created for saved content revisions; restore creates another snapshot. |
| Export to Markdown | Implemented | Supports the editor's current content subset. |
| Export to PDF | Implemented via browser print | Use Print / Save as PDF; browser print rendering can vary. |
| Advanced role-based sharing | Implemented | Owner, Editor, Commenter, Viewer. |

## Development

Common root commands:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js web app in development mode |
| `pnpm build` | Build workspace apps |
| `pnpm start` | Start the built web app |
| `pnpm lint` | Run Biome checks |
| `pnpm format` | Apply Biome formatting |
| `pnpm typecheck` | Type-check workspace packages and app |
| `pnpm test` | Run Vitest tests |
| `pnpm test:e2e` | Run Playwright browser tests |
| `pnpm db:generate` | Generate Drizzle migration snapshots from schema changes |
| `pnpm db:migrate` | Apply SQL migrations |
| `pnpm db:seed` | Seed demo users and sample content |
| `pnpm db:setup` | Apply migrations and seed data |

The `packages/database/drizzle/` directory contains SQL migrations used by `migrate.ts`. The Drizzle Kit generation command is provided for future schema changes; review generated migrations before committing them.

## Prerequisites

- Node.js 22 or later.
- pnpm 10.21.0 (use Corepack).
- PostgreSQL 16 or a compatible Neon PostgreSQL database.
- Git.
- Docker Engine and Docker Compose only if using the container workflow.

## Setup

### 1. Clone the project's repository

```bash
git clone <your-repository-url> docudeck
cd docudeck
```

If this source is being used from an exported archive, extract it and change into the `docudeck` directory instead.

### 2. Install dependencies

```bash
corepack enable
corepack prepare pnpm@10.21.0 --activate
pnpm install
```

The first install generates `pnpm-lock.yaml` if the repository has not yet been locked. Commit that lockfile before relying on frozen installs in CI or deployment.

### 3. Configure local environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

- `DATABASE_URL`: local PostgreSQL or Neon connection string. For Neon, use the provider's TLS-enabled connection string.
- `SESSION_SECRET`: a random string of at least 32 characters.
- `DOCUMENT_ENCRYPTION_KEY`: exactly 32 random bytes encoded as 64 hex characters.
- `NEXT_PUBLIC_APP_URL`: the web application's public URL.

Generate strong local secrets with:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

The values in `.env.example` are development placeholders only. Never reuse them in production. Keep the encryption key backed up securely: losing it makes encrypted document contents and comments unrecoverable. Rotating it requires a controlled re-encryption migration.

### 4. Start PostgreSQL, migrate and seed

Start a local PostgreSQL instance separately, or use the included database service:

```bash
docker compose up -d docudeck-database
```

For a database running on localhost, keep the `.env.example` `DATABASE_URL` value. For an external database, replace it with the provider's connection string.

Then apply the schema and insert demo data:

```bash
pnpm db:migrate
pnpm db:seed
```

Seeded demo accounts (same password for all):

| User | Email | Password |
| --- | --- | --- |
| Alice Morgan | `alice@example.com` | `Docudeck!2026` |
| Bob Chen | `bob@example.com` | `Docudeck!2026` |
| Charlie Rivera | `charlie@example.com` | `Docudeck!2026` |

The seed creates a sample Alice-owned document and shares it with Bob as an Editor. The seed is safe to re-run for the demo records; it does not reset existing users or documents.

### 5. Start the web application

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the demo accounts.

### 7. Run checks and browser tests

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For browser tests, start the app and make sure the database has been migrated and seeded in another terminal. Then run:

```bash
BASE_URL=http://localhost:3000 pnpm test:e2e
```

Playwright browser binaries may need to be installed once:

```bash
pnpm --filter @docudeck/e2e-tests exec playwright install chromium
```

## To run the project using Docker

1. Copy `.env.example` to `.env` and replace the example secrets.
2. From the repository root, build and start the complete stack:

```bash
docker compose up --build
```

Compose starts the `docudeck-database` PostgreSQL service, waits for its health check, runs `docudeck-database-init` using the web application's Dockerfile `tools` target, then starts `docudeck-web` after migrations and seeding complete.

Open [http://localhost:3000](http://localhost:3000). To stop the services:

```bash
docker compose down
```

To remove the local database volume as well (this permanently deletes local database data):

```bash
docker compose down -v
```

The Docker image intentionally retains workspace dependencies so the same web Dockerfile can also run TypeScript migration and seed scripts in the initialization service. This favors a predictable demo setup over the smallest possible production image.
