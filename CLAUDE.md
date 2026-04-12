# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is an npm workspaces monorepo with two apps:

```
apps/
├── backend/    # NestJS API (@referral-system/backend)
└── frontend/   # Next.js UI (@referral-system/frontend)
```

## Commands

```bash
# Root-level shortcuts
npm run dev:backend       # start backend in watch mode
npm run dev:frontend      # start frontend dev server
npm run build             # build both apps
npm run lint              # lint all workspaces
npm run format            # format all workspaces

# Backend (run from root with -w or from apps/backend/)
npm -w @referral-system/backend run start:dev
npm -w @referral-system/backend run start:debug
npm -w @referral-system/backend run build
npm -w @referral-system/backend run lint
npm -w @referral-system/backend run test
npm -w @referral-system/backend run test:watch
npm -w @referral-system/backend run test:cov
npm -w @referral-system/backend run test:e2e

# Run a single backend test file
npx -w @referral-system/backend jest src/modules/users/users.service.spec.ts

# Database migrations (run from root with -w or from apps/backend/)
npm -w @referral-system/backend run migration:generate -- -n MigrationName
npm -w @referral-system/backend run migration:create -- src/migrations/MyMigration
npm -w @referral-system/backend run migration:run
npm -w @referral-system/backend run migration:revert
npm -w @referral-system/backend run migration:show

# Frontend (run from root with -w or from apps/frontend/)
npm -w @referral-system/frontend run dev
npm -w @referral-system/frontend run build
npm -w @referral-system/frontend run lint
```

## Environment Variables

Required for backend (validated at startup via Joi in `apps/backend/src/modules/config/configuration.schema.ts`):

| Variable | Description |
|---|---|
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL credentials |
| `DB_HOST`, `DB_PORT` | Used only by TypeORM CLI config (`typeorm.config.ts`); defaults to localhost:5432 |
| `DB_SYNCHRONIZE` | Set `true` only in dev; migrations are used otherwise |
| `JWT_SECRET` | JWT signing secret (min 32 chars) — used for both access and refresh tokens |
| `PORT` | HTTP port (default 3001) |

Place `.env` file in `apps/backend/`.

## Architecture

### Framework & Runtime
- **Backend**: NestJS 11 on Node.js with TypeScript. PostgreSQL via TypeORM (`synchronize: false` in production — use migrations). Listens on `PORT` (default 3001). Global prefix `/api`. Swagger UI at `/api/docs`.
- **Frontend**: Next.js 15 with React 19, App Router (`src/app/`).

### Backend Module Layout (`apps/backend/src/modules/`)

- **auth** — Email/password registration + login. Issues JWT tokens (access: 15min, refresh: 30d). API key management for programmatic access (each key has a signing secret for HMAC). Guards: `JwtAuthGuard`, `ApiKeyAuthGuard`, `CombinedAuthGuard`, `HmacAuthGuard`.
- **users** — User entity (email, hashedPassword, name). Single controller with `GET /users/self`.
- **partners** — Referral partner CRUD. Each partner has a `code` (UTM value) unique per tenant. Soft-delete via `isActive` flag.
- **accrual-rules** — Payout rules per event type. Rules can be partner-specific (`partnerId` set) or global (`partnerId` null). Priority: partner-specific > global for the same `eventName`. Supports `fixed` and `percentage` rule types.
- **conversions** — Aggregated conversion data per (userId, partnerId, eventName, eventDate) bucket. Populated via `POST /api/conversions/track` endpoint (API key + HMAC auth, rate limited, idempotent). Also supports manual entry from UI. Includes `IdempotencyService` with daily cleanup cron. Provides per-partner summary with accrual totals and balance.
- **payments** — Manual payment recording. Tracks status (pending/completed/cancelled), period, and reference. Balance endpoint computes accrued vs paid per partner.
- **config** — `configuration.ts` (typed config factory), `configuration.schema.ts` (Joi validation), `typeorm.config.ts` (CLI-only DataSource).

### Multi-tenancy
Every entity carries a `userId` column. All service methods receive `userId` from `@GetUser('id')` decorator. Data isolation at the query level — every query includes `WHERE userId = :userId`.

### Auth Pattern
Two auth methods, both resolve to the same `RequestUser { id }`:

1. **JWT (UI flow)** — `POST /api/auth/register` or `/login` → `{ accessToken, refreshToken }`. Protected routes use `@UseGuards(JwtAuthGuard)` + `Authorization: Bearer <accessToken>`.
2. **API Key (programmatic flow)** — Created via `POST /api/auth/api-keys`. Used via `X-API-Key` header. Protected routes can use `@UseGuards(ApiKeyAuthGuard)` or `@UseGuards(CombinedAuthGuard)` for either method.

API keys are stored as SHA-256 hashes; the raw key is shown only once at creation. Key format: `rk_<64 hex chars>`. Each key also has a `signingSecret` (plaintext, 32 bytes hex) for HMAC-SHA256 request signing.

### Conversion Tracking (`POST /api/conversions/track`)
- Auth: `HmacAuthGuard` (validates API key via `X-API-Key`, verifies HMAC signature via `X-Signature: sha256=<hex>`)
- Rate limited: `ApiKeyThrottleGuard` (100 req/min per API key, `@nestjs/throttler`)
- Idempotency: optional `idempotencyKey` field prevents duplicate processing (keys stored 24h)
- Additive upsert: uses `INSERT ... ON CONFLICT DO UPDATE SET count = count + EXCLUDED.count` for atomic aggregation
- Accrual calculation: applies `findApplicableRule()` (partner-specific > global) with fixed/percentage logic

### DTO Convention
- Request DTOs in `dto/requests/`, response DTOs in `dto/responses/`.
- Response DTOs expose a static `fromEntity()` factory method.
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Pagination uses the shared `PaginatedResponseDto<T>` + `PaginationMetaDto` from `apps/backend/src/common/dto/pagination-meta.dto.ts`.
- Type aliases (e.g., `RuleType`, `PaymentStatus`) must use `import type` in DTO files due to `isolatedModules: true` + `emitDecoratorMetadata`.
