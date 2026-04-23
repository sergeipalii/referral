# Refledger Roadmap

Living document. Describes what's shipped, what's explicitly deferred and why, and the signals that would trigger picking up each deferred item. Update whenever the plan shifts.

Last updated: 2026-04-22.

## Shipped

Features in the current codebase, in rough order of recency:

- **Soft-cap on conversions** (`billing.service.getVisibleCutoff` + `effectiveDateTo`). Ingest accepts everything; tenant-facing read endpoints (conversions list/summary, analytics) clip display at a per-day cutoff. Partner portal and accrual balances intentionally uncapped — partners see their truth. `PlanCapBanner` surfaces hidden count + upgrade CTA.
- **Starter tier ($19/mo, 14-day trial)**. 20 partners, 5k conversions, 2 API keys, `partnerPortal` capability only.
- **Pro bump**: 50 → 100 partners.
- **`partnerPortal` capability gate** on `POST /partner-auth/invitations`. Free-tier tenants can't onboard real partners with logins. Existing partners from downgraded tenants keep working (login/refresh not gated).
- **Landing trust-strip**: Stripe Billing → HMAC-signed API → No fees/No cut of referred revenue. Partner Portal badge removed (now paywalled on Starter+).
- **Landing hero**: "Track referrals / Automate commissions / Reward partners", subhead tightened.
- **Features grid**: Stripe Billing card replaced with Transparent Pricing. MMP description clarified (Adjust and Branch postbacks coming next).
- **Pricing section**: 4 tiers, 14-day trial on all paid, "No transaction fees on any plan" callout.
- **Refledger vs Rewardful comparison table** on landing — 6 honest rows, shared strengths in footer.
- **`/switch-from-rewardful`** SEO page with interactive savings calculator, "migration coming soon" badge, `mailto:` fallback for manual migrations.
- **Single-domain nginx config** for prod (`refledger.io` → frontend `:3010`, `refledger.io/api` → backend `:3011`).

## Deferred — documented, not scheduled

Each entry: what it is → why we're not doing it now → what signal would reverse that.

### Migration tool from Rewardful

**What.** One-shot import of affiliates, referral history, commission rules and payout records via Rewardful's `api.getrewardful.com/v1/` API. Minimum viable scope: affiliates + referrals + commission rules (3-5 days of work).

**Why deferred.** Zero existing Rewardful prospects. Building it speculatively for an unproven market. A half-working tool is worse than no tool — trust erodes on import errors.

**Trigger.** First serious inbound from a Rewardful-dependent team saying "I'd switch but migration is scary". Use them as beta + testimonial. Ideal: 2-3 such signals before building.

**Related existing artefact.** `/switch-from-rewardful` already says "migration coming soon" with a `mailto:hello@refledger.io`. Every inbound from that link is data. Count them.

### Cap fossilization (historical period plan snapshots)

**What.** Per-period snapshots of tenant's plan state so that historical conversion reports respect the cap that was active at the time, not the current cap. Requires a `subscription_period_snapshots` table and a cron that writes a row at period end.

**Why deferred.** Current behavior: when a tenant upgrades, prior-period hidden data reappears. This is a theoretical exploit ("buy Business for one month, see all history, downgrade") that nobody is actually running, and honest upgraders benefit from the backfill.

**Trigger.** Either (a) real customer complaint that upgrade revealed something unexpected, or (b) observed abuse pattern (repeated Business one-month subscriptions followed by downgrades).

### TTL on hidden conversion events

**What.** Auto-prune stored-but-hidden conversions older than N months (6? 12?) to bound storage cost for Free tenants who never upgrade.

**Why deferred.** Conversion rows are ~200 bytes. A Free tenant hoarding 100k hidden events/year costs <$1/year in Postgres storage. Not a real problem yet.

**Trigger.** Postgres disk pressure or any single tenant hoarding >10M hidden events.

### Per-widget "+N hidden" badges

**What.** Fine-grained indicators on every analytics card ("$5,432 accrued (+$2,100 hidden)"), not just the top-of-page banner.

**Why deferred.** Scope creep. The banner + `/billing` usage section already tell the whole story. Per-widget clutter risks making dashboards harder to read for the 99% of tenants who don't overflow.

**Trigger.** User feedback "I see the banner but I don't know which of my metrics is affected".

### Spec coverage for `PaymentsService.createBatch`

**What.** `apps/backend/src/modules/payments/payments.service.spec.ts` (or equivalent integration test) covering: (a) first call creates one pending per eligible partner, (b) second call with the same state creates zero (pending-is-allocated invariant), (c) a `completed` payment doesn't block, (d) `minAmount` filter works, (e) `partnerIds` filter scopes correctly.

**Why deferred.** The bug that prompted writing this was caught by a human smoke-test in under a minute. Zero tests exist on `payments.service.ts` today — writing just this one feels like arbitrary choice over covering the rest (accrual, balance queries, CSV). Bundle together once there's capacity.

**Trigger.** Next regression found in `payments.service.ts`, or the Paddle migration (#3) which already touches billing surface and should land with specs.

### Internal plan-switch tool for testing

**What.** Either (a) an `apps/backend/scripts/set-plan.ts` invoked as `npm -w @referral-system/backend run set-plan -- --email=x@y.com --plan=business`, or (b) a gated `POST /dev/tenant-plan` endpoint enabled only when `ENABLE_DEV_ENDPOINTS=true` in `.env`. Mutates the `subscriptions` row without going through Stripe/Paddle.

**Why deferred.** Right now raw SQL via Adminer works for the solo-operator case. Writing tooling before a second person needs it is cargo-cult. But worth fixing if plan-juggling during QA/smoke-tests happens more than ~3 times/week.

**Trigger.** Next time plan-switching via raw SQL is needed for a third time in a week — or if a second person joins and can't be trusted with production SQL. Probably falls out naturally as part of the Paddle migration (#3) since that PR already touches the billing surface.

### Normalize `userId` FK column types across modules

**What.** Some tables store `userId` as `varchar` (e.g. `subscriptions`), others as `uuid` (the `users.id` primary key). Ad-hoc joins need `::varchar` / `::uuid` casts. Pick one (uuid everywhere) and migrate the varchar columns with an `ALTER COLUMN ... TYPE uuid USING "userId"::uuid`.

**Why deferred.** Working code depends on the current types via TypeORM's implicit coercion. The cost is cosmetic (manual SQL needs casts) rather than correctness. Migrating now risks breaking subtle repositories during E2E / Paddle work.

**Trigger.** Next time anyone touches the billing entities (e.g. during the Paddle migration — launch-readiness #3), fold the migration into the same PR. Otherwise re-evaluate at the first real query-performance regression caused by implicit casts on joins.

### Partner password-reset self-service

**What.** "Forgot password?" flow on `/partner/login` — partner enters email, receives a one-time reset link, sets a new password. Mirror of the existing invitation flow but triggered by the partner, not the tenant.

**Why deferred.** Depends on outbound email infrastructure (launch-readiness #5 — still `mailto:`-only). Current workaround works: tenant generates a new invitation from `/partners`, sends the URL manually, partner re-sets password via `/accept-invite`. For 0 real partners in prod this is fine.

**Trigger.** Either (a) email infra lands (SMTP + transactional templates) — then it's ~1-2h to bolt this on, or (b) ≥2 partners pinging their tenant saying "I lost my password" before email infra lands, meaning the manual path is already painful.

### Auto-send partner invitation email

**What.** On `POST /partner-auth/invitations`, backend sends the invite URL directly to the partner's email via SMTP. Currently the endpoint returns the token to the tenant UI and the tenant forwards it manually.

**Why deferred.** Same dependency on email infra (#5). Also — solo-founder / small-team tenants often *prefer* forwarding manually (they add a personal note, use their own deliverability/branded sender, etc.). Auto-send should be an opt-in toggle, not replace the manual path.

**Trigger.** Email infra landed. Then add a `sendInvitationEmail` toggle in tenant settings defaulting to `true`, with the current manual flow still available via "copy link" button.

### Email-capture form replacing mailto

**What.** Real form on `/switch-from-rewardful` + `/register` → writes to a `leads` table or forwards to a CRM.

**Why deferred.** On 0-customer stage, `mailto:hello@refledger.io` delivers the lead straight to a human inbox with zero infrastructure. No DB table, no spam protection, no GDPR consent form to write yet.

**Trigger.** >5 `mailto:` leads/week — manual triage gets annoying.

### Schema.org / JSON-LD microdata for SEO

**What.** `<script type="application/ld+json">` on landing + SEO pages with `Organization`, `Product`, `BreadcrumbList`, `FAQPage` entities. Google uses these for rich snippets.

**Why deferred.** No SEO traffic yet. Writing schema before you have indexable content is cargo-culting.

**Trigger.** `/switch-from-rewardful` starts showing up in Google Search Console with impressions >10/day.

### A/B testing framework

**What.** LaunchDarkly / GrowthBook / homegrown split — test different CTAs, headlines, trust-strip phrasings.

**Why deferred.** A/B testing needs statistical power. At <100 visitors/week the variance is too high — you're tuning to noise.

**Trigger.** >1000 unique visitors/week on the landing. Before that, use judgment, not stats.

### Four-tier route group refactor

**What.** Move marketing pages into `src/app/(marketing)/` route group with shared layout (meta template, analytics, footer).

**Why deferred.** Currently one marketing page (`/switch-from-rewardful`). Refactoring a single page is premature.

**Trigger.** 5+ SEO pages exist (probably: Rewardful, FirstPromoter, Tapfiliate, for-saas, for-mobile-apps).

## SEO pages architecture

Target URLs and delivery order when signal arrives. Flat folder structure for now — refactor into `(marketing)` route group when page count ≥ 5.

### Competitor pages (highest ROI per page)

Each ~1h: hero + savings calc + "what we do differently" + "coming soon" migration link + mailto.

- `/switch-from-rewardful` ← **shipped**
- `/switch-from-firstpromoter`
- `/switch-from-tapfiliate`
- `/switch-from-leaddyno`

Build order: whichever competitor's pricing page is currently showing up in prospect conversations / inbound research. Don't build all speculatively.

### Vertical / use-case pages

Each ~1-2h: vertical-tailored hero + how the product maps to that vertical's specific pains + 1-2 testimonials (when we have them) + CTA.

- `/for-saas` — B2B SaaS referral programs. Pitch: MRR-based recurring commissions, Stripe-native billing, no transaction fees eating your unit economics.
- `/for-mobile-apps` — mobile apps with MMPs. Pitch: direct AppsFlyer postback, HMAC-signed events, no proxy server needed.
- `/for-ecommerce` — Shopify/WooCommerce. Pitch: flat fee vs % cut on high-volume e-commerce referrals.
- `/for-infoproducts` — course creators / membership communities. Pitch: self-serve partner portal, simple setup.

### Integration pages

Each ~1h: integration-specific onboarding guide + code samples + CTA. Doubles as product docs.

- `/integrations/appsflyer`
- `/integrations/stripe`
- `/integrations/segment` (later)
- `/integrations/google-tag-manager` (later)

### Guide pages (long-tail SEO)

Each ~2-3h: written content, 1500-2500 words. These pay off over 6-12 months.

- `/guides/hmac-signed-webhooks` — technical deep-dive, target developers
- `/guides/preventing-affiliate-fraud` — security-positioning content
- `/guides/recurring-commission-setup` — product-docs angle
- `/guides/switching-referral-platforms` — meta-guide linking to individual switch-from pages

Only build when a specific guide topic keeps coming up in prospect questions.

## Signals to monitor

Things to check periodically that would reverse a "deferred" decision:

| Signal | Where to look | Threshold | Action |
|---|---|---|---|
| Rewardful migration inbound | `hello@refledger.io` for "coming from Rewardful" mentions | 2-3 | Build migration tool (beta with first sender) |
| Plan-cap exploit / complaint | Support email | 1 | Build cap fossilization |
| Storage pressure | Postgres disk usage on prod | >50% of allocation | Add TTL on hidden events |
| Lead volume via mailto | Inbox count | >5/week | Build form + `leads` table |
| SEO impressions | Google Search Console | >10/day on any SEO page | Add JSON-LD microdata |
| Landing traffic | Analytics | >1000 uniques/week | Set up A/B infra |
| New SEO page count | `src/app/*/page.tsx` in landing group | >=5 | Refactor into `(marketing)` route group |

## Process notes

- **Every deferred item has a trigger.** If it doesn't, it's not deferred — it's forgotten. Before adding to "Deferred", write the trigger.
- **Don't pre-build infrastructure for growth you haven't seen.** Signal > speculation.
- **When triggered, bias toward the smallest viable scope.** Ship. Iterate on signal.
- **This doc is updated by whoever is closest to the change**. Includes both "moved to Shipped" and "removed entirely — turned out to be a bad idea".
