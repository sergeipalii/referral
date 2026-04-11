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
| `ENCRYPTION_KEY` | 32-byte hex string (64 chars) for AES-256-GCM encryption of analytics credentials |
| `CRON_DISABLED` | Set `true` to disable daily analytics sync cron |
| `PORT` | HTTP port (default 3001) |

Place `.env` file in `apps/backend/`.

## Architecture

### Framework & Runtime
- **Backend**: NestJS 11 on Node.js with TypeScript. PostgreSQL via TypeORM (`synchronize: false` in production — use migrations). Listens on `PORT` (default 3001). Global prefix `/api`. Swagger UI at `/api/docs`.
- **Frontend**: Next.js 15 with React 19, App Router (`src/app/`).

### Backend Module Layout (`apps/backend/src/modules/`)

- **auth** — Email/password registration + login. Issues JWT tokens (access: 15min, refresh: 30d). API key management for programmatic access. Guards: `JwtAuthGuard`, `ApiKeyAuthGuard`, `CombinedAuthGuard`.
- **users** — User entity (email, hashedPassword, name). Single controller with `GET /users/self`.
- **partners** — Referral partner CRUD. Each partner has a `code` (UTM value) unique per tenant. Soft-delete via `isActive` flag.
- **accrual-rules** — Payout rules per Amplitude event type. Rules can be partner-specific (`partnerId` set) or global (`partnerId` null). Priority: partner-specific > global for the same `eventName`. Supports `fixed` and `percentage` rule types.
- **analytics** — Integration with external analytics systems via provider pattern. Stores encrypted credentials (AES-256-GCM). Sync orchestration (manual + daily cron at 02:00 UTC). Currently implements Amplitude Export API. New provider = implement `AnalyticsProvider` interface + register in `AnalyticsProviderFactory`.
- **conversions** — Aggregated conversion data per (userId, partnerId, eventName, eventDate) bucket. Populated by analytics sync. Provides per-partner summary with accrual totals and balance.
- **payments** — Manual payment recording. Tracks status (pending/completed/cancelled), period, and reference. Balance endpoint computes accrued vs paid per partner.
- **config** — `configuration.ts` (typed config factory), `configuration.schema.ts` (Joi validation), `typeorm.config.ts` (CLI-only DataSource).

### Multi-tenancy
Every entity carries a `userId` column. All service methods receive `userId` from `@GetUser('id')` decorator. Data isolation at the query level — every query includes `WHERE userId = :userId`.

### Auth Pattern
Two auth methods, both resolve to the same `RequestUser { id }`:

1. **JWT (UI flow)** — `POST /api/auth/register` or `/login` → `{ accessToken, refreshToken }`. Protected routes use `@UseGuards(JwtAuthGuard)` + `Authorization: Bearer <accessToken>`.
2. **API Key (programmatic flow)** — Created via `POST /api/auth/api-keys`. Used via `X-API-Key` header. Protected routes can use `@UseGuards(ApiKeyAuthGuard)` or `@UseGuards(CombinedAuthGuard)` for either method.

API keys are stored as SHA-256 hashes; the raw key is shown only once at creation. Key format: `rk_<64 hex chars>`.

### Analytics Provider Pattern
```
apps/backend/src/modules/analytics/providers/
├── analytics-provider.interface.ts    — AnalyticsProvider interface + AnalyticsEvent type
├── analytics-provider.factory.ts      — maps providerType string to provider instance
└── amplitude/
    ├── amplitude.provider.ts          — implements AnalyticsProvider
    └── amplitude-api.client.ts        — HTTP calls to Amplitude Export API
```
Sync is idempotent: deletes existing conversion_events for the date range before inserting fresh data.

### DTO Convention
- Request DTOs in `dto/requests/`, response DTOs in `dto/responses/`.
- Response DTOs expose a static `fromEntity()` factory method.
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Pagination uses the shared `PaginatedResponseDto<T>` + `PaginationMetaDto` from `apps/backend/src/common/dto/pagination-meta.dto.ts`.
- Type aliases (e.g., `RuleType`, `PaymentStatus`) must use `import type` in DTO files due to `isolatedModules: true` + `emitDecoratorMetadata`.
