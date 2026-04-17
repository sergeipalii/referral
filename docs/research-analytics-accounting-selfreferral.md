# Research: Аналитика, учёт конверсий, self-referral

> Статус: **исследование / план** (три направления развития продукта).
> Дата: 2026-04-17.

---

## 1. Аналитический дашборд

### Что есть сейчас

- Таблица конверсий с фильтрами (дата, партнёр, eventName).
- Per-partner summary (`totalConversions`, `totalAccrualAmount`, `totalPaid`, `balance`).
- Billing usage (partners / conversions / apiKeys за текущий период).

Нет графиков, трендов, сравнений периодов.

### Что нужно

#### Метрики (backend endpoints)

| Метрика | Endpoint | SQL-источник |
|---|---|---|
| Conversions per day (time-series) | `GET /analytics/conversions-timeseries?dateFrom&dateTo&partnerId?&eventName?` | `GROUP BY eventDate ORDER BY eventDate` |
| Revenue per day | то же, `SUM(revenueSum)` вместо `SUM(count)` |
| Accrual per day | `SUM(accrualAmount)` |
| Top-N partners by conversions | `GET /analytics/top-partners?limit=10&dateFrom&dateTo` | `GROUP BY partnerId ORDER BY SUM(count) DESC LIMIT N` |
| Event breakdown | `GET /analytics/event-breakdown?dateFrom&dateTo` | `GROUP BY eventName` |
| Period comparison | `GET /analytics/comparison?periodA_from&periodA_to&periodB_from&periodB_to` | Два запроса, дифф на бэкенде |
| Conversion rate (clicks → conversions) | Требует пункт 4 roadmap (click tracking) — пока нельзя |

Все эндпоинты за `JwtAuthGuard`, скоуп по `userId`.

#### Frontend

Библиотека: **Recharts** (React-native, ~45kb gzip, хорошо ложится на Next.js). Альтернатива: Chart.js + react-chartjs-2.

Новая страница `/analytics` (или расширение `/` dashboard):
- **KPI-карточки** вверху: total conversions, total revenue, total accrued, total paid — за выбранный период + % change vs предыдущий.
- **Time-series chart** (AreaChart): конверсии/день, с toggle revenue/accrual.
- **Top partners** (BarChart horizontal): top-5/10 по конверсиям за период.
- **Event breakdown** (PieChart или Donut): доля каждого eventName.
- Date range picker (from/to) — переиспользуем Input type=date.

Скоуп MVP: 1 серверный endpoint (timeseries) + 1 top-partners + 1 event-breakdown = **3 новых GET-эндпоинта**, **1 новая страница**, recharts dependency.

#### Для партнёрского портала

Зеркало: те же метрики, но скоупленные на partnerId из JWT. Повторно используем бэкенд-хелперы, добавляя portal-версии с пинированным partnerId.

---

## 2. Учёт конверсий (Conversion Accounting)

### Что есть сейчас

- **Агрегатные бакеты** `conversion_events(userId, partnerId, eventName, eventDate)` — additive upsert. Нет индивидуальных записей.
- Нет статусов конверсии (approved/rejected/pending).
- Нет refund-обработки.
- Нет hold-period.

Это означает: раз конверсия попала в бакет, accrual сразу начисляется, отменить нельзя, refund не обрабатывается.

### Зачем менять

- **Refunds**: клиент SaaS начисляет партнёру за подписку, юзер отменяет → accrual нужно отозвать.
- **Hold period**: начислять accrual через 30 дней после конверсии (время на return/chargeback).
- **Approval workflow**: модератор проверяет конверсию перед начислением (для ручных программ).
- **Fraud protection**: пометить конверсию как suspicious, не платить.

### Архитектурный выбор

**Вариант A: параллельная таблица `conversion_log`**

Новая таблица для индивидуальных событий (не заменяет бакеты, живёт рядом):

```
conversion_log
├── id uuid
├── userId, partnerId
├── eventName, eventDate
├── externalEventId (idempotency — уникальный id события от клиента)
├── status: 'pending' | 'approved' | 'rejected' | 'reversed'
├── amount (accrual)
├── revenue
├── holdUntil timestamp (null = мгновенное начисление)
├── approvedAt, rejectedAt, reversedAt
├── reverseReason
├── createdAt
```

**При track()**: вместо мгновенного addToBucket — создаём запись в `conversion_log` со статусом `pending`. Cron (или immediate если holdUntil = null) → `approved` → addToBucket.

**При refund**: `POST /conversions/:id/reverse` → status = `reversed` → subtractFromBucket (новый метод в ConversionsService).

**Плюсы**: полный аудит, можно откатить, approval workflow.
**Минусы**: ломает текущий flow (addToBucket теперь не мгновенный), усложняет balance-расчёт.

**Вариант B: reversal events (без full accounting)**

Не меняем track() — бакеты работают как раньше (мгновенный accrual). Добавляем:
- `POST /conversions/reverse` — создаёт отрицательный бакет-инкремент (count -= 1, accrualAmount -= X).
- Сохраняем reversal log для аудита.

**Плюсы**: минимальное вмешательство в текущую архитектуру.
**Минусы**: нет approval workflow, нет hold period, нет pending→approved перехода.

**Рекомендация**: для MVP — **Вариант B** (reversal events). Вариант A — когда клиенты реально попросят approval workflow / hold period. Reversal покрывает 80% case-ов (refunds, chargebacks, ошибочные трэки).

### MVP скоуп (Вариант B)

- `POST /api/conversions/reverse` (HMAC auth): `{ partnerCode, eventName, eventDate, count?, revenue?, reason?, idempotencyKey }` → addToBucket с отрицательными count/revenue/accrual. Idempotent.
- UI: кнопка «Reverse» на строке конверсии в таблице владельца. Модалка с reason + count.
- Партнёрский портал: показывает reversed-записи с пометкой.
- Track endpoint: без изменений.

---

## 3. Self-referral (dogfooding)

### Идея

Платформа использует собственный реферальный движок для привлечения новых пользователей:
- Каждый зарегистрированный owner получает реферальный код.
- Новый owner приходит по ссылке `/?ref=CODE` → регистрируется.
- Когда реферал апгрейдится на платный план → реферер получает бонус.

### Варианты реализации

**A. Использовать собственный продукт (настоящий dogfooding)**

Создать «мета-тенант» (специальный user в системе), который:
- Имеет партнёров = каждый зарегистрированный owner.
- При регистрации нового owner-а через `?ref=CODE` → track конверсию `signup` в мета-тенанте.
- При апгрейде owner-а (webhook `subscription.updated`, plan != free) → track конверсию `upgrade` в мета-тенанте.
- Accrual rules: $X за signup, $Y за upgrade, или percentage от первого платежа.
- Баланс реферера → кредит на его подписку (Stripe credit или ручная скидка).

**Плюс**: настоящий dogfooding, демонстрация продукта, маркетингово сильно.
**Минус**: circular dependency (BillingService → tracks conversions → ConversionsService → AccrualRulesService → which references the same billing stack?). Решаемо: мета-тенант — обычный free-plan тенант с обычными API-ключами, circular dependency фактически не возникает — track() вызывается в отдельном контексте (с userId мета-тенанта, а не текущего юзера).

**B. Встроенный модуль (не через основной движок)**

Отдельная таблица `referral_credits`:
```
referral_credits
├── referrerUserId
├── referredUserId
├── event: 'signup' | 'upgrade'
├── creditAmount
├── applied: boolean
├── createdAt
```

При регистрации → запись. При апгрейде → запись с creditAmount. Периодически → применяем Stripe credit к подписке реферера.

**Плюс**: проще, нет circular deps.
**Минус**: не dogfooding, дублирование логики.

**C. Внешний сервис (Rewardful, FirstPromoter)**

**Плюс**: zero dev effort.
**Минус**: платит конкуренту, не показывает свой продукт.

**Рекомендация**: **Вариант A** — это уникальная маркетинговая возможность. «We use our own platform for our referral program» — сильный trust signal. Circular dependency разрешается тем, что мета-тенант — обычный free-plan тенант с обычными API-ключами.

### MVP скоуп (Вариант A)

1. Seed-скрипт создаёт мета-тенант (`REFERRAL_META_USER_EMAIL` в env) с free-планом, API-ключом и глобальными accrual rules (e.g., $5 за signup, $10 за upgrade).

2. При `AuthService.register`:
   - Если `dto.referralCode` передан → создать партнёра в мета-тенанте для нового user-а (или найти существующего по коду).
   - Track conversion `signup` в мета-тенанте с partnerCode = referralCode.

3. При `BillingService.upsertFromStripe` (subscription changed to paid):
   - Track conversion `upgrade` в мета-тенанте с partnerCode = user's own referral code (если у него есть реферер).

4. `GET /api/auth/referral-code` — возвращает реферальный код текущего user-а (auto-generated partner code в мета-тенанте). Lazy creation: при первом вызове создаёт партнёра.

5. UI: в `/billing` или отдельной `/referral` странице — «Your referral link: https://ref.palii.me/?ref=CODE», «Referred X users, Y upgraded, earned $Z credit».

6. Landing: `/?ref=CODE` → `useSearchParams` → передать `ref` в `/register?ref=CODE` → `AuthService.register` получает `referralCode`.

7. Кредитование: cron или ручное — раз в месяц `POST /meta-tenant/payments/batch`, затем Stripe credit на подписку реферера. Или проще: баланс реферера отображается, а кредитуется вручную через Stripe Dashboard.

---

## Приоритизация

| Фича | Ценность для клиента | Ценность для маркетинга | Объём работы | Рекомендуемый порядок |
|---|---|---|---|---|
| Аналитический дашборд | Высокая (визуализация = retention) | Средняя (скриншоты на лендинг) | 2-3 дня | 1-й |
| Reversal events (accounting MVP) | Средняя (refund-сценарии) | Низкая | 1 день | 2-й |
| Self-referral (dogfooding) | Низкая (пока нет юзеров) | Очень высокая (trust signal + growth loop) | 2 дня | 3-й (когда есть юзеры) |

---

## Что НЕ входит ни в один из пунктов

- Real-time websocket updates на дашборд.
- ML-based fraud detection.
- Multi-touch attribution analytics (сейчас first-touch only).
- Cohort analysis (LTV curves) — требует длинных данных.
- Custom report builder / SQL explorer.
