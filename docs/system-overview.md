# System Overview

Полное описание текущих возможностей системы. Документ отражает состояние на 2026-04-17.

---

## 1. Назначение

Система управления реферальными / аффилиатными программами: SaaS-бэкенд + веб-интерфейс. Позволяет владельцу программы завести партнёров, принимать события конверсий от своего приложения / e-commerce / MMP, считать комиссионные начисления по настраиваемым правилам, вести учёт выплат и давать партнёрам личный кабинет для просмотра статистики.

Типичный пользователь — владелец SaaS-продукта, мобильного приложения или интернет-магазина, запускающий собственную партнёрскую программу без привлечения affiliate-сети.

---

## 2. Архитектура

### Стек

- **Backend**: NestJS 11 на Node.js 20, TypeScript, TypeORM, PostgreSQL 16.
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS v4, Recharts.
- **Биллинг**: Stripe Billing + Stripe Tax.
- **Деплой**: Docker Compose (postgres + backend + frontend), миграции применяются автоматически при старте backend-контейнера.
- **Документация API**: Swagger UI на `/api/docs`.

### Монорепозиторий

```
apps/
├── backend/    # NestJS API
└── frontend/   # Next.js UI
```

npm workspaces, общие зависимости в корневом `package.json`.

### Мультитенантность

Каждая таблица сущностей несёт колонку `userId` (идентификатор владельца программы = tenant). Все сервисные методы принимают `userId` из JWT/API-ключа; все запросы к БД скоупятся по нему. Изоляция данных реализуется на уровне SQL, а не в коде приложения.

---

## 3. Роли и авторизация

Три независимых auth-контура:

### Владелец программы (`owner`)

- Регистрация / логин по email + паролю.
- Токены: access (15 минут) + refresh (30 дней), подписаны `JWT_SECRET`, тип `access` / `refresh`.
- Доступ ко всем административным эндпоинтам системы.

### Партнёр (`partner`)

- Получает приглашение от владельца программы, задаёт пароль по одноразовому токену (TTL 7 дней).
- Отдельный JWT-контур: типы `partner-access` / `partner-refresh`, подписаны тем же `JWT_SECRET`, но распознаются собственной Passport-стратегией `partner-jwt`.
- Доступ только к эндпоинтам `/api/partner-portal/*`, scoped по `(partnerId, userId)`.

### API-ключи (programmatic access)

- Создаются владельцем в UI, для server-to-server интеграций.
- Формат: `rk_<64 hex>`, хранится SHA-256 хэш + первые 12 символов как prefix.
- К каждому ключу выпускаются три секрета (plaintext, показываются **один раз**):
  - `signingSecret` — для HMAC-SHA256 подписи тела запроса (валидация `X-Signature`).
  - `webhookToken` — для прямого MMP-webhook-эндпоинта (в URL-path).
- Ключ шлётся в заголовке `X-API-Key`, rate limit 100 req/min per key.

---

## 4. Функциональные домены

### 4.1. Партнёры

- CRUD партнёров у владельца. Каждый партнёр имеет:
  - уникальный код (генерируется сервером, 8 hex-символов — используется как UTM-значение `pid` в tracking-ссылках);
  - имя, описание, JSON `metadata` для произвольных данных;
  - JSON `payoutDetails` — реквизиты выплат, заполняются самим партнёром;
  - флаг `isActive` (soft-delete).
- Поля авторизационного флоу на той же сущности: `email`, `hashedPassword`, `invitationToken`, `invitationExpiresAt`, `lastLoginAt`.

### 4.2. Accrual rules (правила начисления)

Четыре типа:

| Тип | Формула | Применение |
|---|---|---|
| `fixed` | `amount * count` | Фиксированная сумма за событие |
| `percentage` | `(amount / 100) * revenue` | % от выручки события |
| `recurring_fixed` | `amount * count`, внутри окна | Повторяющееся фиксированное начисление |
| `recurring_percentage` | `(amount / 100) * revenue`, внутри окна | Повторяющийся % |

- Правила могут быть глобальными (`partnerId = null`) или персональными для партнёра. Приоритет: персональное > глобальное для одного `eventName`.
- Recurring-правила имеют поле `recurrenceDurationMonths` (null = пожизненно). Начисление применяется только пока `firstConversionAt + recurrenceDurationMonths > now()`.
- Recurring-правила требуют `externalUserId` в событии для работы. Без атрибуции начисление = 0 (но сам bucket конверсии всё равно создаётся).
- Создание recurring-правил гейтится PlanLimitGuard — требуется план Pro или выше.

### 4.3. Конверсии

**Эндпоинт трекинга** `POST /api/conversions/track`:

- Аутентификация: `HmacAuthGuard` (API-ключ + HMAC-подпись тела).
- Rate limit: `ApiKeyThrottleGuard`, 100 req/min per key.
- Идемпотентность: опциональный `idempotencyKey` → 24-часовое кэширование результата через `IdempotencyService`.
- Параметры тела: `partnerCode?`, `promoCode?`, `clickId?`, `externalUserId?`, `eventName`, `eventDate?`, `count?`, `revenue?`, `idempotencyKey?`.
- Логика резолва партнёра (в порядке приоритета):
  1. `externalUserId` с существующей attribution → partner из неё (first-touch wins).
  2. `promoCode` → resolve + atomic usedCount increment.
  3. `clickId` → find click в пределах attribution window, при expired → fallback.
  4. `partnerCode` → lookup + валидация `isActive`.
  5. Если ничего не резолвится — 400 / 404.
- Агрегация: additive upsert `INSERT ... ON CONFLICT DO UPDATE` по ключу `(userId, partnerId, eventName, eventDate)`. Count, revenueSum, accrualAmount суммируются.

**Листинг и агрегаты** (JWT-защищённые):
- `GET /api/conversions` — пагинированный список с фильтрами.
- `GET /api/conversions/summary` — сводка по каждому партнёру.
- `GET /api/conversions/partners/:partnerId` — конверсии конкретного партнёра.

### 4.4. Промокоды

- CRUD промокодов у владельца: `POST/GET/PATCH/DELETE /api/promo-codes` (JWT).
- Коды хранятся в lowercase (case-insensitive lookup).
- `usageLimit` (null = unlimited) + `usedCount` — атомарный инкремент при track, auto-deactivation на лимите.
- `GET /api/promo-codes/resolve?code=` (ApiKeyAuthGuard) — для checkout-интеграций.
- Партнёрский портал: `GET /partner-portal/promo-codes` — read-only список кодов партнёра.

### 4.5. Click tracking + attribution window

- `GET /api/r/:partnerCode?to=<url>` — **публичный** redirect-эндпоинт: записывает click, ставит cookie `rk_click=<clickId>`, 302-редирект на landing. Безопасный fallback при неизвестном коде.
- `POST /api/clicks` — **публичный** first-party flow: возвращает `{ clickId, expiresAt }`, клиент сам ставит cookie.
- Per-tenant `attributionWindowDays` (default 30 дней) — конфигурируется на уровне tenant-а.
- При track: `clickId` → find click → если `expiresAt > now` → partner = click.partnerId; иначе fallback на partnerCode.
- Last-click policy: каждый новый клик перезаписывает cookie.
- Cron cleanup: `04:30 UTC` — удаляет clicks, expired > 7 дней назад.

### 4.6. User attributions (для recurring)

Таблица `user_attributions` — first-touch атрибуция:

- `UNIQUE(userId, externalUserId)` — один внешний юзер → один партнёр.
- Создаётся при первой конверсии, несущей `externalUserId` + любой из способов резолва партнёра (partnerCode / promoCode / clickId).
- Race-safe через `INSERT ... ON CONFLICT DO NOTHING`.
- Последующие события используют сохранённого партнёра (first-touch wins).

### 4.7. Платежи и выплаты

**Ручной учёт:**
- `POST /api/payments` — записать единичный платёж.
- `PATCH /api/payments/:id` — редактировать (pending → completed).
- `GET /api/payments/balance/:partnerId` — баланс (accrued − paid).

**Групповая генерация:**
- `POST /api/payments/batch` — pending-платёж на каждого активного партнёра с положительным балансом. Фильтры: `partnerIds[]`, `minAmount`, `reference`. Гейтится PlanLimitGuard (Business plan).

**CSV-экспорт:**
- `GET /api/payments/export` — CSV с колонками: partner_name, code, email, payout_details, amount, status, period, reference. RFC 4180 escaping. Гейтится PlanLimitGuard (Pro+).

### 4.8. Интеграции с MMP (AppsFlyer)

Два способа приёма постбэков:

**A. Прямой webhook** (без своего сервера клиента):
- `POST /api/webhooks/mmp/appsflyer/:webhookToken`.
- Аутентификация — token в URL. Гейтится BillingService (мягкий reject: log + 200 если capability отсутствует).
- Маппинг: `media_source → partnerCode`, `event_name → eventName`, `event_revenue → revenue`, `event_time → eventDate`, `event_id || appsflyer_id → idempotencyKey`.
- Стаб под Adjust уже в контроллере.

**B. Forwarding через сервер клиента:**
- Клиент маппит поля сам, отправляет в `/api/conversions/track` с HMAC.

### 4.9. Партнёрский портал

Отдельный UI и API-scope для партнёра.

**Auth:**
- `POST /api/partner-auth/invitations` — владелец создаёт приглашение.
- `POST /api/partner-auth/accept-invite` — партнёр задаёт пароль.
- `POST /api/partner-auth/login` / `refresh`.

**Portal endpoints** (`PartnerJwtAuthGuard`):
- `GET/PATCH /api/partner-portal/self` — профиль + payout details.
- `GET /api/partner-portal/dashboard` — агрегированные метрики.
- `GET /api/partner-portal/conversions` — список конверсий.
- `GET /api/partner-portal/payments` — список выплат.
- `GET /api/partner-portal/analytics/timeseries` — конверсии по дням.
- `GET /api/partner-portal/analytics/event-breakdown` — разбивка по событиям.
- `GET /api/partner-portal/promo-codes` — промокоды партнёра (read-only).

### 4.10. Аналитический дашборд

- `GET /api/analytics/kpis` — totalConversions, totalRevenue, totalAccrual, totalPaid за период + `prev` (предыдущий период равной длины для % change).
- `GET /api/analytics/timeseries` — {date, conversions, revenue, accrual} по дням. Фильтры: dateFrom, dateTo, partnerId, eventName.
- `GET /api/analytics/top-partners` — top-N партнёров по конверсиям.
- `GET /api/analytics/event-breakdown` — разбивка по eventName.
- Зеркало для партнёрского портала (timeseries + event-breakdown, scoped на partnerId из JWT).

### 4.11. Подписка (SaaS billing через Stripe)

**Тарифная сетка** (из `plans.ts`):

| | Free | Pro ($49/мес) | Business ($199/мес) |
|---|---|---|---|
| Партнёров | 5 | 50 | ∞ |
| Конверсий/мес | 1 000 | 50 000 | 500 000 |
| API-ключей | 1 | 5 | ∞ |
| Recurring-правила | ❌ | ✅ | ✅ |
| CSV-экспорт | ❌ | ✅ | ✅ |
| MMP webhook | ❌ | ✅ | ✅ |
| Batch payouts | ❌ | ❌ | ✅ |
| Trial | — | 14 дней | 14 дней |

**Endpoints:**
- `GET /api/billing/subscription` — план, статус, фичи, usage.
- `POST /api/billing/checkout` → Stripe Checkout Session URL.
- `POST /api/billing/portal` → Stripe Customer Portal URL.
- `GET /api/billing/invoices` — зеркалированные инвойсы.
- `POST /api/webhooks/stripe` — webhook с signature verification + idempotency.

**Enforcement (PlanLimitGuard):**
- `@RequireWithinLimit('maxPartners' | 'maxApiKeys')` — count-based gates.
- `@RequireCapability('csvExport' | 'batchPayouts' | 'recurringRules' | 'mmpWebhook')` — feature gates.
- 402 + `{error:'plan_limit', requiredPlan}` → frontend UpgradeModal.

**Cron:**
- `04:00 UTC` — reconcile subscriptions с Stripe.
- `04:15 UTC` — cleanup `processed_webhook_events` > 30 дней.

---

## 5. Веб-интерфейс

### Публичные страницы

- `/` — **лендинг**: hero, features (8 карточек), how it works, **pricing с subscription-aware CTAs** (гость → register, free user → Stripe Checkout, pro/business → manage), integration preview (curl + AppsFlyer), final CTA, footer.
- `/login`, `/register` (с `?plan=pro|business` → auto-upgrade после регистрации).
- `/partner/login`, `/partner/accept-invite?token=...`.
- `/system-overview` — публичная страница с рендером `docs/system-overview.md` (этот документ).
- `/api/r/:partnerCode` — redirect endpoint (click tracking).

### Раздел владельца

Боковая навигация: Analytics / Partners / Accrual Rules / Conversions / Payments / Integration / API Keys / Billing. Внизу — PlanBadge.

- **Analytics** — KPI-карточки с % change vs prev period, AreaChart конверсий по дням, BarChart top-партнёров, PieChart event breakdown. Date range picker.
- **Partners** — таблица с инвайт-статусом, детали, create/edit/deactivate, invite-ссылки, payout details.
- **Accrual Rules** — CRUD, 4 типа, recurring — с attribution window и чекбоксом лимита.
- **Conversions** — таблица событий, summary-карточки по партнёрам, фильтры.
- **Payments** — таблица, ручная запись, Export CSV, Generate pending payouts (модалка).
- **Integration** — документация: S2S HMAC, AppsFlyer (оба варианта), recurring commissions, field mapping.
- **API Keys** — создание; показ key + signingSecret + MMP webhook URL.
- **Billing** — план/статус/usage, Upgrade buttons → Stripe Checkout, Manage → Stripe Portal, Billing history, Past-due banner.

Глобально: `UpgradeModalHost` (перехватывает 402 от API), `PastDueBanner` (при past_due/unpaid).

### Раздел партнёра

Боковая навигация: Dashboard / Analytics / Conversions / Payments / Settings.

- **Dashboard** — 4 метрик-карточки + детализация.
- **Analytics** — AreaChart + PieChart (scoped на этого партнёра).
- **Conversions** — таблица с фильтрами.
- **Payments** — таблица со статус-бейджами.
- **Settings** — описание + structured payout details (method/details/notes), read-only промокоды.

---

## 6. Модель данных

### Таблицы (13)

| Таблица | Назначение |
|---|---|
| `users` | Владельцы программ + `attributionWindowDays` |
| `api_keys` | Программные ключи + signingSecret + webhookToken |
| `partners` | Партнёры + creds + payoutDetails |
| `accrual_rules` | Правила начисления (4 типа + recurrenceDurationMonths) |
| `conversion_events` | Агрегаты по (userId, partnerId, eventName, eventDate) |
| `idempotency_keys` | TTL-записи для идемпотентности track (24 ч) |
| `user_attributions` | First-touch мэппинг externalUserId → partnerId |
| `payments` | Учёт фактических выплат партнёрам |
| `promo_codes` | Промокоды (case-insensitive, usageLimit, auto-deactivation) |
| `clicks` | Клики по tracking-ссылкам (attribution window) |
| `subscriptions` | SaaS-подписка владельца (plan / status / Stripe ids) |
| `invoices` | Зеркало инвойсов из Stripe |
| `processed_webhook_events` | Idempotency для Stripe webhook |

### Миграции (9)

1. `Init` — initial schema.
2. `RemoveAnalyticsAddTracking` — signing secret, idempotency, unique constraint.
3. `AddApiKeyWebhookToken` — webhook token для MMP.
4. `AddPartnerCredentials` — portal login fields.
5. `AddPartnerPayoutDetails` — payoutDetails jsonb.
6. `AddRecurringAttribution` — recurrenceDurationMonths + user_attributions.
7. `AddBilling` — subscriptions + invoices + processed_webhook_events + free backfill.
8. `AddPromoCodes` — promo_codes table.
9. `AddClickTracking` — clicks table + attributionWindowDays.

---

## 7. Background jobs

| Cron | Время (UTC) | Что делает |
|---|---|---|
| `IdempotencyService.cleanup` | 03:00 | Удаляет idempotency keys > 24 часов |
| `BillingCronService.reconcile` | 04:00 | Синхронизирует subscriptions со Stripe |
| `BillingCronService.cleanup` | 04:15 | Удаляет processed_webhook_events > 30 дней |
| `ClicksService.cleanup` | 04:30 | Удаляет clicks expired > 7 дней |

---

## 8. Тестирование

End-to-end тестами на Jest + supertest, работающие против реального Postgres с `synchronize: true`.

Текущий прогон: **11 сьютов, 125 тестов, все проходят.**

| Сьют | Тестов | Покрытие |
|---|---|---|
| `auth.e2e-spec.ts` | 12 | Регистрация, логин, refresh, API keys CRUD |
| `conversions-track.e2e-spec.ts` | 18 | HMAC-guard, валидация, additive upsert, idempotency |
| `partner-auth.e2e-spec.ts` | 22 | Invite/accept/login/refresh, self, updateSelf, revoke, cross-tenant |
| `recurring-commissions.e2e-spec.ts` | 11 | First-touch, window enforcement, race safety |
| `payments-batch-export.e2e-spec.ts` | 10 | Batch eligibility, CSV escaping |
| `billing-subscription.e2e-spec.ts` | 6 | Auto-create free, usage counters, cross-tenant |
| `billing-gates.e2e-spec.ts` | 9 | Count-based + capability 402 gates |
| `billing-stripe-webhook.e2e-spec.ts` | 5 | Webhook idempotency, upsert, canceled → free |
| `analytics.e2e-spec.ts` | 8 | KPIs, timeseries, top-partners, event-breakdown, cross-tenant |
| `promo-codes.e2e-spec.ts` | 14 | CRUD, resolve, track with promoCode, usage limit auto-deactivation |
| `click-tracking.e2e-spec.ts` | 10 | Redirect, first-party, track with clickId, expiry fallback, priority, cross-tenant |

Запуск: `npm -w @referral-system/backend run test:e2e` (`--runInBand`).

---

## 9. Границы системы

**Что реализовано:**
- Трекинг + атрибуция по `partnerCode`, `promoCode`, `clickId` и `externalUserId` (first-touch).
- Четыре типа правил с recurring-логикой.
- Промокоды с usage limits и auto-deactivation.
- Click tracking с configurable attribution window (default 30 дней).
- Ручная запись платежей + batch pending + CSV-экспорт.
- Партнёрский кабинет с отдельной auth и self-service.
- Две схемы MMP-интеграции (прямой webhook + HMAC forwarding).
- Аналитический дашборд с KPI, time-series, top-partners, event breakdown.
- SaaS-подписка через Stripe Billing (Free / Pro / Business) с PlanLimitGuard.
- Публичный лендинг с subscription-aware pricing.
- Multi-tenant на уровне БД.

**Что не реализовано (спроектировано, см. research-документы):**
- Self-referral / dogfooding (`docs/research-analytics-accounting-selfreferral.md`).
- Reversal events / conversion accounting.

**Что сознательно не входит в scope:**
- Автоматические выплатные рельсы партнёрам (Stripe Connect / Wise / PayPal Payouts).
- Скидочная логика промокодов / checkout.
- Cross-device attribution, view-through attribution, fraud-детект.
- Собственный MMP.
- Партнёрский onboarding-поток (публичная форма заявки).
- Multi-currency / team seats / usage-based billing.

---

## 10. Документация в репозитории

- `docs/system-overview.md` — этот документ.
- `docs/roadmap-blockers.md` — дорожная карта (все 5 пунктов закрыты).
- `docs/research-promo-codes.md` — research промокодов.
- `docs/research-click-tracking.md` — research click tracking.
- `docs/research-analytics-accounting-selfreferral.md` — research аналитики, учёта конверсий, self-referral.
- `docs/qna-onelink-appsflyer-strategy.docx` — Q&A OneLink/AppsFlyer/стратегия.

---

## 11. Развёртывание

```bash
git pull
docker compose up -d --build
```

- Postgres persistent через volume `pgdata`.
- Backend: `npm run migration:run && node dist/main` — миграции автоматически.
- Frontend: `NEXT_PUBLIC_API_URL` из Docker build args.
- HTTP-порты: backend 3001 → host 3011, frontend 3000 → host 3010.

**Stripe (для биллинга):**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
BILLING_FRONTEND_BASE_URL=https://ref.palii.me
```

Без этих переменных free-план работает полностью; кнопки Upgrade/Manage/webhook отвечают 503.
