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
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS.
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

Две независимые роли с разными JWT-контурами:

### Владелец программы (`owner`)

- Регистрация / логин по email + паролю.
- Токены: access (15 минут) + refresh (30 дней), подписаны `JWT_SECRET`, тип `access` / `refresh`.
- Доступ ко всем административным эндпоинтам системы.

### Партнёр (`partner`)

- Получает приглашение от владельца программы, задаёт пароль по одноразовому токену.
- Отдельный JWT-контур: типы `partner-access` / `partner-refresh`, тем же `JWT_SECRET`, но распознаются собственной Passport-стратегией `partner-jwt`.
- Доступ только к эндпоинтам `/api/partner-portal/*`, scoped по `(partnerId, userId)`.

### API-ключи (programmatic access)

- Создаются владельцем в UI, для server-to-server интеграций.
- Формат: `rk_<64 hex>`, хранится SHA-256 хэш + первые 12 символов как prefix.
- К каждому ключу выпускаются два секрета (plaintext, показываются **один раз**):
  - `signingSecret` — для HMAC-SHA256 подписи тела запроса (валидация `X-Signature`).
  - `webhookToken` — для прямого MMP-webhook-эндпоинта.
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

### 4.3. Конверсии

**Эндпоинт трекинга** `POST /api/conversions/track`:

- Аутентификация: `HmacAuthGuard` (API-ключ + HMAC-подпись тела).
- Rate limit: `ApiKeyThrottleGuard`, 100 req/min per key.
- Идемпотентность: опциональный `idempotencyKey` → 24-часовое кэширование результата через `IdempotencyService`.
- Параметры тела:
  - `partnerCode` или `externalUserId` (при наличии attribution);
  - `eventName`, `eventDate` (default = today, UTC), `count` (default 1), `revenue` (default 0);
  - `idempotencyKey`.
- Логика резолва партнёра (в порядке приоритета):
  1. `externalUserId` с существующей attribution → partner из неё (first-touch wins).
  2. `partnerCode` → lookup + валидация `isActive`.
  3. Если ничего не резолвится — 400 / 404.
- Агрегация: additive upsert `INSERT ... ON CONFLICT DO UPDATE` по ключу `(userId, partnerId, eventName, eventDate)`. Count, revenueSum, accrualAmount суммируются; accrualRuleId перезаписывается.

**Листинг и агрегаты** (JWT-защищённые):
- `GET /api/conversions` — пагинированный список с фильтрами по партнёру, событию, датам.
- `GET /api/conversions/summary` — сводка «сколько начислено / выплачено / баланс» по каждому партнёру за период.
- `GET /api/conversions/partners/:partnerId` — конверсии конкретного партнёра.

### 4.4. User attributions (для recurring)

Таблица `user_attributions` — first-touch атрибуция:

- `UNIQUE(userId, externalUserId)` — один внешний юзер отображается на одного партнёра в пределах тенанта.
- Создаётся при первой конверсии, несущей `externalUserId` + `partnerCode`.
- Race-safe через `INSERT ... ON CONFLICT DO NOTHING` + обязательный re-read (параллельные первые события на одного юзера получают одну и ту же attribution).
- Последующие события используют сохранённого партнёра независимо от переданного `partnerCode` (first-touch).

### 4.5. Платежи и выплаты

**Ручной учёт:**
- `POST /api/payments` — записать единичный платёж: `partnerId`, `amount`, `status ∈ {pending, completed, cancelled}`, `reference`, `notes`, `periodStart/End`, `paidAt`, `metadata`.
- `PATCH /api/payments/:id` — редактировать (обычно для перевода pending → completed).
- `GET /api/payments/balance/:partnerId` — накопленный баланс (`totalAccrued`, `totalPaid`, `pendingPayments`, `balance = accrued − paid`).

**Групповая генерация pending-платежей:**
- `POST /api/payments/batch` — за указанный период создаёт pending-платёж на каждого активного партнёра, чей текущий баланс > `minAmount`.
- Опциональные параметры: `partnerIds[]` (ограничить подмножеством), `minAmount` (порог, default 0), `reference` (тэг батча).
- Все балансы считаются одним SQL-запросом (LEFT JOIN на conversion_events + payments), без N+1.

**CSV-экспорт:**
- `GET /api/payments/export?status=&partnerId=&dateFrom=&dateTo=` — CSV с колонками: `payment_id, partner_name, partner_code, partner_email, amount, status, period_start, period_end, reference, notes, payout_details, paid_at, created_at`.
- RFC 4180 escaping, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.csv"`.
- Не пагинирован — весь набор результатов в одном файле.

### 4.6. Интеграции с MMP (AppsFlyer)

Два способа приёма постбэков от AppsFlyer:

**A. Прямой webhook** (без своего сервера клиента):
- `POST /api/webhooks/mmp/appsflyer/:webhookToken`.
- Аутентификация — токен в URL (из выданного при создании API-ключа).
- Всегда отвечает 200, чтобы AppsFlyer не ретраил на ошибки у нас.
- Маппинг: `media_source → partnerCode`, `event_name → eventName`, `event_revenue → revenue`, `event_time → eventDate`, `event_id || appsflyer_id → idempotencyKey`.
- Органические установки (пустой `media_source`) — тихо пропускаются.
- Стаб под Adjust уже в контроллере — паттерн готов к добавлению других MMP.

**B. Forwarding через сервер клиента:**
- Клиент принимает постбэк AppsFlyer на своём сервере, мапит поля сам, отправляет в наш `/api/conversions/track` с HMAC-подписью.
- Больше гибкости (кастомное поле в `media_source`, фильтрация событий, enrichment), требует своей инфраструктуры.

### 4.7. Партнёрский портал

Отдельный UI и API-scope для партнёра.

**Auth:**
- `POST /api/partner-auth/invitations` — владелец создаёт приглашение (партнёру + email → одноразовый токен + expiresAt, TTL 7 дней).
- `DELETE /api/partner-auth/invitations/:partnerId` — отозвать приглашение (пароль не сбрасывается).
- `POST /api/partner-auth/accept-invite` — партнёр задаёт пароль по токену, получает tokens.
- `POST /api/partner-auth/login` / `refresh`.

**Portal endpoints** (`PartnerJwtAuthGuard`):
- `GET /api/partner-portal/self` — профиль партнёра.
- `PATCH /api/partner-portal/self` — обновить `description` и `payoutDetails` (остальные поля остаются owner-managed).
- `GET /api/partner-portal/dashboard` — агрегированные метрики (totalConversions, totalAccrued, totalPaid, pendingPayments, balance, lastConversionDate).
- `GET /api/partner-portal/conversions` — пагинированный список конверсий с фильтрами. `partnerId` пинится из JWT, не принимается из query.
- `GET /api/partner-portal/payments` — пагинированный список платежей с фильтрами.

### 4.8. Подписка (SaaS billing через Stripe)

Owner платит нам за использование платформы. Три тарифа с разными лимитами и фичами; бесплатный — по умолчанию, с жёсткими caps; платные (Pro, Business) — через Stripe Checkout с триалом 14 дней.

**Тарифная сетка** (плейсхолдерные числа, меняются в `plans.ts`):

| | Free | Pro ($49/мес) | Business ($199/мес) |
|---|---|---|---|
| Партнёров | 5 | 50 | ∞ |
| Конверсий/мес | 1 000 | 50 000 | 500 000 |
| API-ключей | 1 | 5 | ∞ |
| Recurring-правила | ❌ | ✅ | ✅ |
| CSV-экспорт платежей | ❌ | ✅ | ✅ |
| Прямой MMP webhook | ❌ | ✅ | ✅ |
| Batch pending-payouts | ❌ | ❌ | ✅ |
| Trial | — | 14 дней | 14 дней |

**Auto-bootstrap:** каждая регистрация создаёт строку `subscriptions` с `planKey='free', status='active'`. Stripe customer создаётся лениво при первом апгрейде — free-юзеры в Stripe не попадают.

**Эндпоинты:**
- `GET /api/billing/subscription` — текущий план, статус, фичи, usage против лимитов, `currentPeriodEnd`, `trialEndsAt`, `cancelAtPeriodEnd`.
- `POST /api/billing/checkout` — создаёт Stripe Checkout Session для апгрейда на Pro/Business, возвращает hosted URL (с `automatic_tax: enabled`, `billing_address_collection: required`, trial через `subscription_data.trial_period_days`).
- `POST /api/billing/portal` — создаёт Stripe Customer Portal сессию для смены карты / просмотра инвойсов / отмены.
- `GET /api/billing/invoices` — список инвойсов, зеркалированных из Stripe webhook (`hostedInvoiceUrl`, `invoicePdfUrl`, period, amount).
- `POST /api/webhooks/stripe` — публичный webhook, валидация подписи `Stripe-Signature` через raw body, дедупликация через `processed_webhook_events`. Обрабатываемые события: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid|payment_failed|finalized|voided`. Всегда отвечает 200 на процессинговых ошибках (чтобы Stripe не ретраил), 400 только при неверной подписи.

**Enforcement (PlanLimitGuard):**
- `@RequireWithinLimit('maxPartners' | 'maxApiKeys')` — count-based гейты на `POST /partners`, `POST /auth/api-keys`.
- `@RequireCapability('csvExport' | 'batchPayouts' | 'recurringRules' | 'mmpWebhook')` — на `GET /payments/export`, `POST /payments/batch`.
- Recurring-правила проверяются inline в `AccrualRulesService.create/update` (зависят от body `ruleType`).
- MMP webhook (`/api/webhooks/mmp/appsflyer/:token`) soft-reject: логирует и возвращает 200 при отсутствии capability, чтобы AppsFlyer не ретраил.
- Ответ 402: `{error:'plan_limit', reason:'count'|'capability', requiredPlan, currentPlan, ...}`.

**Cron (`BillingCronService`):**
- `04:00 UTC` — `reconcileAllSubscriptions`: для каждой подписки с `stripeSubscriptionId` подтягивает актуальное состояние через `stripe.subscriptions.retrieve`, лечит пропущенные webhook-и.
- `04:15 UTC` — удаляет `processed_webhook_events` старше 30 дней.

**Конфиг (env):**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — обязательны для продакшена, optional в Joi (CI/dev бегут без них).
- `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` — Stripe Price id для каждого тарифа.
- `BILLING_FRONTEND_BASE_URL` — для success/cancel URL-ов.

---

## 5. Веб-интерфейс

### Раздел владельца (`/`, `/partners`, `/rules`, `/conversions`, `/payments`, `/api-keys`, `/integration`, `/billing`)

- Боковая навигация + JWT-контекст. Внизу сайдбара — `PlanBadge` с текущим тарифом и ссылкой на `/billing`.
- Поверх всего раздела — глобальный `UpgradeModalHost`: перехватывает любые 402 от API и показывает plan-aware модалку с CTA «Upgrade to <plan>», ведущим на Stripe Checkout.
- `PastDueBanner` (красная полоса) в `DashboardShell` при `subscription.status IN ('past_due', 'unpaid')`.
- Страница **Partners** — список с инвайт-статусом, детали, создание/редактирование/деактивация, выдача инвайт-ссылок с кнопкой копирования.
- Страница **Accrual Rules** — CRUD правил, форма переключает 4 типа, для recurring — чекбокс «Limit attribution window» и поле месяцев.
- Страница **Conversions** — список событий с карточками сводки по партнёрам, фильтры по партнёру и датам.
- Страница **Payments** — список платежей, ручная запись, кнопки `Export CSV` (с текущими фильтрами) и `Generate pending payouts` (модалка с periodStart/End, minAmount, reference).
- Страница **API Keys** — создание ключей; после создания показываются `key`, `signingSecret`, готовый **MMP webhook URL** — всё единоразово, с кнопкой Copy All.
- Страница **Integration** — документация: сценарии (прямой S2S, Shopify-подобный, MMP), пример кода на Node/Python/curl для HMAC, инструкции для AppsFlyer Push API (оба варианта: прямой webhook и forwarding), секция про recurring commissions.
- Страница **Billing** — карточки plan+status+priceCents, прогресс-бары usage (partners / api-keys / conversions за период), список фич плана, кнопки Upgrade to Pro / Upgrade to Business / Manage payment method (редиректят через Stripe Checkout / Customer Portal). При возврате с `?checkout=success|cancelled` показывает ин-апп баннер. Таблица Billing history со ссылками на `hostedInvoiceUrl` и `invoicePdfUrl`.

### Раздел партнёра (`/partner/*`)

- Отдельный layout + PartnerAuthProvider.
- Токены хранятся под ключами `partnerAccessToken`/`partnerRefreshToken` — можно быть залогиненным владельцем и партнёром в разных вкладках без коллизий.
- Страницы:
  - `/partner/login`, `/partner/accept-invite?token=...` — публичные.
  - `/partner` — dashboard с 4 метрик-карточками + детализация.
  - `/partner/conversions` — таблица событий с фильтрами.
  - `/partner/payments` — таблица выплат со статус-бейджами.
  - `/partner/settings` — редактирование описания + структурированных payout details (method / details / notes).

---

## 6. Модель данных

Основные таблицы:

| Таблица | Назначение |
|---|---|
| `users` | Владельцы программ (tenant-и системы) |
| `api_keys` | Программные ключи + signingSecret + webhookToken |
| `partners` | Партнёры + creds для портала + payoutDetails |
| `accrual_rules` | Правила начисления (4 типа + recurrenceDurationMonths) |
| `conversion_events` | Агрегаты по (userId, partnerId, eventName, eventDate) |
| `idempotency_keys` | TTL-записи для идемпотентности track-ивентов (24 ч) |
| `user_attributions` | First-touch мэппинг externalUserId → partnerId |
| `payments` | Учёт фактических выплат партнёрам |
| `subscriptions` | SaaS-подписка владельца (plan / status / Stripe ids / period) — 1:1 с `users` |
| `invoices` | Зеркало инвойсов из Stripe (для UI Billing history) |
| `processed_webhook_events` | Idempotency-ledger для webhook-ов Stripe (UNIQUE(stripeEventId), cleanup >30 дней) |

Миграции хранятся в `apps/backend/src/migrations/`, применяются в порядке timestamps. Последние:
- `AddApiKeyWebhookToken` — токен для прямого MMP-webhook.
- `AddPartnerCredentials` — поля кабинета партнёра.
- `AddPartnerPayoutDetails` — payoutDetails jsonb.
- `AddRecurringAttribution` — `recurrenceDurationMonths` + таблица `user_attributions`.
- `AddBilling` — `subscriptions`, `invoices`, `processed_webhook_events` + idempotent backfill: каждому существующему пользователю создаётся free-подписка.

---

## 7. Тестирование

End-to-end тестами на Jest + supertest, работающие против реального Postgres с `synchronize: true`.

Текущий прогон: **8 сьютов, 93 теста, все проходят.**

| Сьют | Тестов | Покрытие |
|---|---|---|
| `auth.e2e-spec.ts` | 12 | Регистрация, логин, refresh, API keys CRUD |
| `conversions-track.e2e-spec.ts` | 18 | HMAC-guard, валидация, additive upsert, idempotency |
| `partner-auth.e2e-spec.ts` | 22 | Invite/accept/login/refresh, self, updateSelf, revoke, cross-tenant isolation |
| `recurring-commissions.e2e-spec.ts` | 11 | First-touch, window enforcement, race safety, non-recurring coexistence |
| `payments-batch-export.e2e-spec.ts` | 10 | Batch eligibility, minAmount, partnerIds, CSV header/escaping |
| `billing-subscription.e2e-spec.ts` | 6 | Auto-create free sub on register, usage счётчики, cross-tenant isolation |
| `billing-gates.e2e-spec.ts` | 9 | 402 на cap-достижении (partners, api keys), feature-gate 402 (CSV, batch, recurring), апгрейд снимает gate |
| `billing-stripe-webhook.e2e-spec.ts` | 5 | Webhook idempotency (дубль event.id игнорируется), upsert subscription статус/period/cancel, canceled → free, unknown customer безопасно игнорируется |

Запуск: `npm -w @referral-system/backend run test:e2e` (использует `--runInBand` так как сьюты делят одну БД).

Тестовый helper `setTenantPlan(app, userId, planKey)` позволяет сьютам, проверяющим фичи поверх гейтов, обходить лимиты через прямое UPDATE в таблицу `subscriptions` — без Stripe-моков.

---

## 8. Границы системы

**Что реализовано:**
- Трекинг + атрибуция по `partnerCode` и `externalUserId` (first-touch).
- Четыре типа правил с recurring-логикой.
- Ручная запись платежей + batch pending + CSV-экспорт.
- Партнёрский кабинет с отдельной auth и self-service для payoutDetails.
- Две схемы MMP-интеграции (прямой webhook + HMAC forwarding).
- Multi-tenant на уровне БД.
- Rate limiting + идемпотентность на трекинг-эндпоинте.
- **SaaS-подписка через Stripe Billing** (Free / Pro / Business), Checkout + Customer Portal, PlanLimitGuard с 402-ответами, reconcile + cleanup cron, webhook-идемпотентность, зеркалированные инвойсы и past-due баннер.

**Что не реализовано** (спроектировано, см. отдельные research-документы):
- Промокоды как метод атрибуции (`docs/research-promo-codes.md`).
- Click tracking + attribution window для web (`docs/research-click-tracking.md`).

**Что сознательно не входит в scope:**
- Автоматические выплатные рельсы **партнёрам** (Stripe Connect / Wise / PayPal Payouts). Выплаты партнёрам исполняются финотделом клиента вне системы; CSV-экспорт — интерфейс передачи. Stripe Billing у нас — это подписка **владельца на нашу платформу**, не маршрутизация выплат.
- Скидочная логика промокодов / корзины / checkout. Это задача e-commerce платформы клиента.
- Cross-device attribution, view-through attribution, fraud-детект. На мобайле эти задачи решает подключённый MMP (AppsFlyer и т.п.).
- Собственный MMP — не замещаем AppsFlyer/Adjust/Branch, а принимаем от них постбэки.
- Партнёрский onboarding-поток (публичная форма заявки, модерация) — партнёров заводит владелец вручную.
- Multi-currency / team seats / usage-based billing — текущая подписка в USD, single-seat, flat-tier. Расширять при появлении рыночного сигнала.

---

## 9. Файлы документации в репозитории

- `docs/system-overview.md` — этот документ.
- `docs/roadmap-blockers.md` — дорожная карта критических пробелов с текущими статусами.
- `docs/research-promo-codes.md` — research-план фичи «Промокоды».
- `docs/research-click-tracking.md` — research-план фичи «Click tracking + attribution window».
- `docs/qna-onelink-appsflyer-strategy.docx` — сводка обсуждения OneLink/AppsFlyer/стратегии продукта.

---

## 10. Развёртывание

```bash
git pull
docker compose up -d --build
```

- Postgres persistent через volume `pgdata`.
- Backend контейнер запускает `npm run migration:run && node dist/main` — миграции применяются автоматически.
- Frontend собирается с `NEXT_PUBLIC_API_URL` из build args (прописан в `docker-compose.yml`). Флаг `--build` обязателен при изменениях на фронте.
- HTTP-порты (внутри): backend 3001, frontend 3000; проброшены на host как `127.0.0.1:3011` и `127.0.0.1:3010` (внешние прокси типа Caddy/nginx должны проксировать на эти адреса).

**Stripe (для боевого включения биллинга):**

Добавить в `apps/backend/.env`:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
BILLING_FRONTEND_BASE_URL=https://ref.palii.me
```

В Stripe Dashboard:
1. Создать два `Price` для Pro и Business (monthly recurring, USD).
2. Integrations → Webhooks → `https://api.ref.palii.me/api/webhooks/stripe`, события: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid|payment_failed|finalized|voided`. Взять `STRIPE_WEBHOOK_SECRET` со страницы webhook-а.
3. Tax → включить Stripe Tax (для `automatic_tax: enabled` в Checkout).

Без этих переменных free-план-путь продолжает работать (read-only /billing + гейты 402), но кнопки Upgrade / Manage, приём webhook-ов и reconcile-cron возвращают 503.
