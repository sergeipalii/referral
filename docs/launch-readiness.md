# Launch Readiness

Audit of what's missing before Refledger can legally and safely take its first paying customer. Distinguishes *hard blockers* (don't flip the "open" sign without these) from *soft blockers* (risky to skip but survivable for the first week) from *non-blockers* (ship later).

Last updated: 2026-04-22.

## Current status: **not ready to sell**

Five hard blockers open. Estimated path to first paying customer: **6-8 working days** after the biggest moving piece — switching billing from Stripe to Paddle.

---

## Hard blockers

### 1. Terms of Service + Privacy Policy — **partially done (2026-04-23)**

Frontend has no `/terms` or `/privacy` pages. This is not cosmetic:

- **Paddle requires** ToS and Privacy URLs during merchant onboarding — they will reject the application otherwise.
- **GDPR** — any EU visitor triggers Privacy-Policy obligations. Missing policy = regulatory exposure (fines up to €20M / 4% turnover).
- **Contractually** — without a ToS the customer accepted at signup, you can't hold them to payment terms, data retention rules, or liability limits.

**Scope.** Generate ToS and Privacy from a reputable template (termly.io, iubenda, or GPT-drafted and reviewed). Add `/terms` and `/privacy` pages, link from footer and from a required checkbox on `/register`. ~3-4 hours.

**Status (2026-04-23):** template-level ToS and Privacy pages shipped, footer links wired on landing + `/switch-from-rewardful`, required acceptance checkbox added on `/register`. What remains before this item can be closed:

- **Lawyer review** — both pages are template drafts, not reviewed by counsel. Governing-law clause in ToS is deliberately generic ("the jurisdiction in which Refledger is established") because the repo doesn't yet contain a legal entity / address. Substitute real entity details and have a lawyer review before the first real customer.
- **Sub-processor list in Privacy** — currently names only generic categories (payment processor, hosting, error monitoring, email). Update with concrete names once Paddle (item #3) and Sentry (item #6) are live.
- **Partner acceptance flow** — the ToS checkbox is only on the tenant `/register` flow, as scoped here. `/partner/accept-invite` has no in-flow acceptance; decide whether invited partners need their own agreement gesture or whether tenant-side acceptance is sufficient contractually.
- **Brand naming consistency** — legal pages use "Refledger", the landing header still says "Referral System". Align once the `docs/naming-research.md` decision lands.

### 2. Postgres has no backups — **done (2026-04-23)**

`docker-compose.yml` mounts `pgdata` as a persistent volume — but there's no `pg_dump`, no cron, no offsite copy. First disk failure, first bad migration = unrecoverable data loss = guaranteed refunds, possible lawsuit.

**Scope.** Daily `pg_dump` via cron inside the backend container or on the host, rotated 7-30 days, optionally synced to S3 or another host. Single bash script + crontab entry. ~1 hour.

**Status (2026-04-23):** implemented with stricter requirements than the original scope — hourly RPO, offsite Backblaze B2, restore verification. Layout:

- `ops/backup/backup.sh` — hourly `pg_dump -Fc` → restic repo on B2
- `ops/backup/schema-dump.sh` — nightly schema snapshots
- `ops/backup/prune.sh` — weekly `restic forget` with `--keep-hourly 24 --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --keep-last 3`
- `ops/backup/restore-test.sh` — monthly restore into throwaway container + sanity queries against real tables
- `ops/backup/restic-init.sh` + `ops/backup/crontab.example` + `ops/backup/README.md` (full operator runbook)
- Alerting via healthchecks.io (3 checks: backup, prune, restore-test)
- Also added Adminer under `docker compose --profile ops up -d adminer` for visual DB inspection / manual edits (bind `127.0.0.1:8081`, never public)

**Prod rollout (2026-04-23):** done on Hetzner CPX22 at `refledger.io`. Restic repo initialised on B2 (`b2:refledger-backups:prod`), 3 healthchecks.io checks registered, cron installed at `/etc/cron.d/refledger`, first automatic hourly backup fired and pinged healthchecks green. `restore-test.sh` passed end-to-end with real sanity queries. `BACKUP_RESTIC_PASSWORD` recorded in password manager.

### 3. Billing: switch from Stripe to Paddle

**Decision (2026-04-22):** going with Paddle instead of Stripe.

Current state: the backend has a full Stripe integration — `BillingModule` with `StripeService`, `StripeWebhookController`, `plans.ts` keyed on `STRIPE_PRICE_*` env vars, Stripe Checkout + Portal flows, invoice mirroring, `ProcessedWebhookEventEntity` for idempotency. All of that needs to be replaced or removed.

**Why Paddle** (captured here for future "why did we pick this?" reference):

- Paddle is a **Merchant of Record**. Handles global VAT / sales tax, invoicing, and tax remittance as the seller of record. Refledger never has to register for VAT in EU member states or US states.
- For a solo / small-team SaaS selling globally, MoR is usually a net win vs. Stripe's processor model — even accounting for the ~5% + $0.50 fee vs. Stripe's ~2.9% + $0.30.
- Simpler invoicing UX for customers — one receipt from Paddle, not separate tax paperwork per jurisdiction.

**Trade-offs to own:**

- Higher per-transaction fee.
- Checkout UX is a `Paddle.js` overlay, not a hosted redirect page — slightly different integration shape on the frontend.
- Paddle business verification takes 1-3 days (similar to Stripe, runs in parallel with dev work).
- Customer Portal in Paddle is different from Stripe's — invoice history, payment-method updates, cancellation all through Paddle's own URLs.

**Scope.** Two workstreams that can run in parallel:

- **Business track** (1-3 days wall-clock, mostly waiting): register Paddle merchant account, submit business docs, wait for approval, create Products + Prices for Starter / Pro / Business in Paddle dashboard, register webhook URL, capture webhook secret.
- **Engineering track** (~2 days focused work):
  - Remove `StripeService`, `StripeWebhookController`, `stripe` npm dep, `STRIPE_PRICE_*` env vars. Delete or archive on a feature branch if we want the option to fall back.
  - New `PaddleService` with the same surface as `StripeService`: `createCheckout`, `createPortal` (or Paddle equivalent), `constructWebhookEvent`, `retrieveSubscription`, `retrieveInvoice`. `plans.ts` switches from `stripePriceEnv` → `paddlePriceId` (or similar).
  - New webhook controller — Paddle's event types are different (`subscription.activated`, `subscription.updated`, `subscription.canceled`, `transaction.completed`, `transaction.billed`, etc.). Signing verification is HMAC-based similar to Stripe but different header name (`paddle-signature`).
  - Frontend: replace Stripe Checkout redirect in `/billing` page with Paddle.js overlay. Add Paddle client script + env-based `PADDLE_CLIENT_TOKEN`.
  - End-to-end test in Paddle sandbox before live.
- **Docs track** (~30 min): update `CLAUDE.md` billing section, update env-variable docs, update `.env.example`.

Existing soft-cap / partner-portal gating logic is **plan-provider-agnostic** — `BillingService.getVisibleCutoff`, `RequireCapability`, `plans.ts` capabilities — those don't change. Only the Stripe-specific surface area gets swapped.

**Risk to flag:** this is not a 15-minute config change. A realistic estimate is 2 focused days + waiting on Paddle business verification. If the timeline pressure is hard, consider: ship with Stripe now, migrate to Paddle in month 2-3 when it's less pressure. The code already works with Stripe.

### 4. No rate limiting on auth endpoints — **done (2026-04-23)**

`/auth/login` and `/auth/register` are not throttled. Only `/api/conversions/track` is (via `ApiKeyThrottleGuard`). Attack surface:

- Password brute-force against known emails.
- Mass-registration DoS filling up the `users` table.

**Scope.** `@nestjs/throttler` is already in the backend deps. Apply `@Throttle({ short: { limit: 5, ttl: 60_000 } })` on login and register handlers. ~15 minutes.

**Status (2026-04-23):** per-IP throttling wired on every password-touching endpoint. Limits: 5/min on `register` / `login` / `accept-invite`, 10/min on `refresh` (tokens are server-signed random, so replay-abuse is the only concern). `trust proxy 1` added in `main.ts` so Throttler resolves the real client IP from Caddy's `X-Forwarded-For` instead of the docker bridge IP. Affected files:

- `apps/backend/src/main.ts` (trust proxy)
- `apps/backend/src/modules/auth/auth.controller.ts` (register / login / refresh)
- `apps/backend/src/modules/partner-auth/partner-auth.controller.ts` (accept-invite / login / refresh)

### 5. Email infrastructure unverified

Contact address `hello@refledger.io` is referenced on the landing, `/switch-from-rewardful`, and billing comms. Need to verify:

- MX records on `refledger.io` are set up and pointing at a real mailbox.
- That mailbox is monitored (forwarded to a personal address is fine for MVP).
- SPF + DMARC records configured if we'll ever send outbound (partner invite emails eventually, welcome emails, password reset).

If a lead emails `hello@` and bounces, that's a lost customer. ~30 minutes to verify + fix.

---

## Soft blockers (fix in week 1)

### 6. No error monitoring — **code ready (2026-04-23), pending Sentry signup**

Without Sentry / Bugsnag / Rollbar, the first 500 errors reach you as angry customer emails, not alerts. For a solo founder this is a serious signal-loss problem.

**Scope.** Sentry Free tier. `@sentry/nestjs` for backend, `@sentry/nextjs` for frontend. Each is ~10 lines of init + env var. ~30 minutes.

**Status (2026-04-23):** SDK wired on both apps. Backend: `apps/backend/src/instrument.ts` imported first in `main.ts`, `SentryModule` + `SentryGlobalFilter` registered in `app.module.ts`. Frontend: `sentry.{client,server,edge}.config.ts` + `instrumentation.ts` (Next 15 picks it up natively), `NEXT_PUBLIC_SENTRY_DSN` plumbed through Docker build arg. All init code is a no-op when DSN env var is blank, so absence doesn't break anything.

**To finish on prod:**
- Sign up at sentry.io (free tier: 5k errors/mo)
- Create two projects: `refledger-backend` (Node/Nest), `refledger-frontend` (Next.js)
- Copy the two DSNs into `/opt/refledger/.env` as `SENTRY_DSN_BACKEND` and `NEXT_PUBLIC_SENTRY_DSN`
- `docker compose up -d --build` — frontend rebuild picks up the DSN as a build arg; backend picks up at start
- Trigger a test error (e.g. `curl https://refledger.io/api/does-not-exist-on-purpose` + a deliberately thrown error from an admin endpoint) to verify both projects receive it

### 7. No cookie consent / GDPR UI

Needed if the site sets non-functional cookies (analytics, heatmaps, A/B tooling). Current state: only functional cookies (auth session) — technically no banner required under ePrivacy/GDPR.

**Trigger to revisit.** The day we add the first analytics script (Plausible, Google Analytics, PostHog). Until then, defer.

### 8. Downgrade-path UX is undefined

Scenario: tenant on Pro has 50 partners. Stripe/Paddle Customer Portal lets them downgrade to Starter (20-cap). What happens?

- `@RequireWithinLimit('maxPartners')` only gates **creation** of new partners. Existing 50 keep working on Starter.
- Plan-capability gates for `mmpWebhook`, `csvExport`, `recurringRules` start returning 402.
- The tenant is now paying less but using more than Starter allows.

Is this intentional grace? Should we soft-archive partners past the cap? Auto-deactivate the N oldest? Need to decide and document before the first real downgrade event.

**Scope.** 30 min product decision + documentation. Code changes depend on decision; could be zero.

### 9. End-to-end flow never prod-tested — **mostly done (2026-04-23)**

Before first paying customer, someone needs to actually walk through:

1. Register on prod → log in.
2. Create a partner → generate invitation → accept invite from a second browser → partner portal login works.
3. Send a `POST /api/conversions/track` request with HMAC from curl → conversion appears in dashboard.
4. Upgrade to Pro via Paddle Checkout → webhook fires → subscription row in DB = pro, status = active.
5. Create a recurring rule → track another conversion → accrual computes.
6. Create batch payouts → CSV export downloads.
7. Downgrade via Paddle Portal → plan rolls back, limits kick in.

Any step that breaks = fix before selling. ~2 hours if everything works, more if bugs surface.

**Status (2026-04-23):** steps 1, 2, 3, 5, 6 passed end-to-end on `https://refledger.io` with real DNS + Caddy + Let's Encrypt. Steps 4 and 7 (billing) blocked on item #3 — Paddle integration. One real bug found and fixed mid-test: batch payouts were not idempotent (pending rows weren't counted as allocated, so repeat clicks stacked duplicates). Fixed in `payments.service.ts` + roadmap entry added for spec coverage. Also opened `batchPayouts` capability on Pro plan (was Business-only) — Pro vs Business now differentiates on scale limits + support, not on this feature.

**Remaining:** re-run steps 4 and 7 once Paddle lands.

---

## Non-blockers (ship later)

Documented so nobody talks themselves into pre-launch over-engineering:

- Status page / uptime dashboard
- Public SLA
- Data Processing Agreement (enterprise-only concern)
- `security.txt` + responsible disclosure policy
- Welcome email / onboarding email sequence
- Customer-facing changelog
- Usage-based overage billing (charge for conversions past cap instead of soft-hide)
- In-product product tours
- Live chat

All of these are valuable. None block first-customer revenue.

---

## Execution order

Wall-clock sequencing. "Day N" = N working days from start, not calendar days.

### Day 1 (~6 focused hours)

1. ToS + Privacy Policy — draft, review, ship pages + footer links + signup checkbox (3-4h)
2. `@Throttle` on login + register (15 min)
3. `pg_dump` cron + rotation (1h)
4. Sentry init on backend + frontend (30 min)
5. Verify MX records + test mailbox (30 min)
6. **Kick off Paddle merchant onboarding** — submit business, start verification (30 min of form-filling + waiting 1-3 days)

### Days 2-3 (parallel with Paddle verification wait)

7. Rip out Stripe code cleanly. Archive on `feat/stripe-billing` branch for optional revert.
8. Build `PaddleService` and webhook controller matching the old `StripeService` surface.
9. Update `plans.ts`, env vars, `.env.example`, `CLAUDE.md` billing section.
10. Wire `Paddle.js` overlay into `/billing` page replacing Stripe Checkout redirect.
11. Test full flow in Paddle Sandbox (works without production verification).

### Day 4-5 (Paddle verification complete)

12. Create live Paddle Products + Prices, plug ids into env.
13. Register webhook endpoint in Paddle live.
14. End-to-end test with a real card on prod.
15. Decide + document downgrade-path behavior.

### Day 6-8: **ready to take first paying customer**

Buffer day for whatever breaks during (14).

---

## Open questions for owner

Before moving forward:

- **Stripe code: delete or keep dormant?** Recommendation: delete, keep only in git history. Feature-flag "dual provider" is over-engineering at 0 customers.
- **Downgrade policy on partners cap**: grace (keep all, block creation) or enforce (soft-archive overflow)?
- **Paddle vs Paddle Billing.** Paddle has two products — "Paddle Classic" (older, simpler) and "Paddle Billing" (newer, more flexible subscription primitives). Decision needed: which to integrate. Default: Paddle Billing unless there's a reason otherwise.

---

## Changelog

- **2026-04-22** — initial audit, 5 hard + 4 soft blockers identified. Billing item switched from Stripe activation to full Paddle integration.
