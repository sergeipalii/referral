# Research & Plan: Промокоды как метод атрибуции

> Статус: **исследование / план** (пункт 3 из `roadmap-blockers.md`).
> Дата: 2026-04-16.

Документ описывает, как работают промокоды в индустрии и как их предполагается реализовать в нашей реферальной системе. Это research-спецификация перед началом реализации — структура entity, endpoints, UI, trade-offs, edge cases.

---

## 1. Что такое промокод в контексте реферальной системы

Промокод — **строковый идентификатор**, который вводится на чек-ауте и выполняет две разные функции (часто одновременно):

1. **Скидку** — «ALICE10 даст 10% off».
2. **Атрибуцию** — «кто-то ввёл ALICE10 → эта покупка за Alice».

Эти функции принципиально независимы: код может давать скидку без атрибуции (просто промо), может атрибутировать без скидки (tracking-only code), может то и другое.

---

## 2. Как это обычно устроено в индустрии

Три типичных модели:

### 2.1. Shopify / WooCommerce коды (merchant-managed)

Торговая платформа хранит коды как часть checkout-движка. Скидка применяется там же. Affiliate-систему (Tapfiliate, Refersion) интегрируют через webhook: когда заказ оплачен, платформа шлёт событие с использованным кодом → affiliate-сервис находит партнёра. **Атрибуция после факта.**

### 2.2. Инфлюенсерские коды (branded shared codes)

Один код на партнёра, брендированный — `HONEY20`, `LINUS15`, `NORDVPN`. Используется тысячами юзеров. Скидка одинаковая. Код живёт долго, не одноразовый.

### 2.3. User-to-user реферальные коды (per-user unique codes)

Каждый существующий юзер получает уникальный короткий код типа `ALICE-K4X2` для шеринга. Короче/красивее, чем длинный `pid=abc123`. По сути эквивалент `partnerCode`, но в UX-обёртке «поделиться кодом».

---

## 3. Где в flow они появляются

```
Клиент вводит ALICE10 в поле «Promo code» на чек-ауте
       ↓
E-com платформа:
  1. Проверяет скидку локально (если настроена у них)
  2. ↓ Присылает событие в наш бэкенд при оплате:
      POST /api/conversions/track { promoCode: "ALICE10", ... }
       ↓
Наш бэкенд:
  3. Резолвит ALICE10 → partner = Alice
  4. Применяет accrual rule
  5. Начисляет Alice
```

Наша ответственность — шаг 3–5. Скидку мы **не считаем** — это задача e-commerce платформы. Мы можем опционально хранить hints о скидке (метаданные), чтобы checkout мог прочитать у нас, но сам расчёт цены — не наш слой.

---

## 4. Архитектурные решения (с трейдоффами)

### 4.1. Cardinality `code ↔ partner`: 1 партнёр → N кодов

Причина: партнёру часто нужно несколько кодов — spring campaign, instagram exclusive, holiday sale. Одного мало. N:1 — стандарт индустрии.

Обратное (N партнёров → 1 код) для атрибуции бессмысленно, кому считать.

### 4.2. Case-insensitive

Юзер на чек-ауте пишет как попало — `ALICE10` / `alice10` / `Alice10`. Храним в lowercase, lookup по lowercase. Стандарт.

### 4.3. Uniqueness per tenant

В рамках одного владельца (`userId`) код уникален. Между tenant-ами — могут пересекаться (ALICE10 у программы A и ALICE10 у программы Б — разные вещи). Это естественно для multi-tenant.

### 4.4. Скидку не считаем (lean mode)

Два варианта:

- **Lean** (рекомендую для MVP): Мы знаем только `partnerId`. Вся discount-логика у клиента в его e-com. Наш `resolve` возвращает `{ partnerCode, partnerId }` — всё.
- **Rich**: Храним опциональные поля `discountType`, `discountValue`, `minPurchase` — клиентский checkout может их запросить и применить. Тогда мы становимся «source of truth» для кодов. Сложнее, больше ответственности, но удобнее для клиентов без собственного discount-движка.

MVP — lean. Можно расширить до rich метаданных позже, не ломая API (через `metadata` jsonb).

### 4.5. Usage limits

Полезный антифрод, особенно для кампаний типа «первые 100 покупателей». Храним:

- `usageLimit int null` (null = без лимита)
- `usedCount int default 0` (инкрементируется при каждом успешном track)

Превышен → код автоматически становится inactive.

Per-user лимит (каждый юзер не больше N раз) — имеет смысл, но требует знания `externalUserId` на каждом track-е. Для MVP пропустим, добавим позже.

### 4.6. Auth у resolve-эндпоинта

Три варианта:

- **Public** (`GET /api/promo-codes/resolve?code=ALICE10`): checkout вызывает напрямую из браузера. Но тогда можно enumerate коды брутфорсом → плохо.
- **API key** (`GET /api/promo-codes/resolve?code=ALICE10` + `X-API-Key`): checkout-backend клиента проверяет код через наш API. Чисто, без leak, без rate-limit на юзера. **Это правильный путь.**
- **HMAC**: overkill для GET-запроса.

Используем API-key (как у существующих integration-эндпоинтов). Rate limit per API-key наследуем из `ApiKeyThrottleGuard`.

### 4.7. Публичный флаг для embeddable widgets

Иногда нужен public resolve — когда checkout чисто фронтовый (SPA + Stripe Checkout без собственного backend). Для таких случаев можно ввести отдельный per-API-key флаг `publicResolveAllowed`. Без авторизации, но с rate-limit. **В MVP — не делаем**, в будущем.

### 4.8. Что если и `partnerCode`, и `promoCode` переданы в track

- Если `promoCode` валиден → partner = из него (более явное намерение клиента).
- Если нет → fallback на `partnerCode`.
- Если оба невалидны → 404.

Логируем, если значения расходятся — это indicator плохой интеграции.

### 4.9. Self-referral protection

Если `externalUserId` совпадает с owner-ом промокода (партнёр сам вводит свой код при покупке) → пропустить атрибуцию? Это требует связывать партнёра с `externalUserId`, а сейчас мы такого не делаем. **В MVP — скипаем**, это сложная тема. Владелец может вручную отклонить такие конверсии или мы добавим отдельный модуль self-referral protection позже.

---

## 5. Сущность

```sql
CREATE TABLE promo_codes (
  id                uuid PRIMARY KEY,
  userId            varchar NOT NULL,         -- tenant
  partnerId         uuid NOT NULL REFERENCES partners(id),
  code              varchar(64) NOT NULL,     -- stored lowercase
  usageLimit        int,                      -- null = unlimited
  usedCount         int NOT NULL DEFAULT 0,
  metadata          jsonb,                    -- reserved for rich-mode (discountType/Value/minPurchase)
  isActive          boolean NOT NULL DEFAULT true,
  createdAt         timestamp NOT NULL DEFAULT now(),
  updatedAt         timestamp NOT NULL DEFAULT now(),
  UNIQUE (userId, code)
);
CREATE INDEX IDX_promo_codes_partner ON promo_codes (userId, partnerId);
```

---

## 6. Endpoints

### Owner-side (`JwtAuthGuard`):

- `POST /api/promo-codes` — создать код. Body: `{ partnerId, code, usageLimit? }`.
- `GET /api/promo-codes?partnerId=&page=&limit=` — список.
- `PATCH /api/promo-codes/:id` — редактировать `usageLimit`, `isActive`.
- `DELETE /api/promo-codes/:id` — удалить.

### Integration-side (`ApiKeyAuthGuard`, rate-limited):

- `GET /api/promo-codes/resolve?code=ALICE10` — Response: `{ partnerCode, partnerId, discountMetadata? }` или 404.

### Track endpoint (изменение):

`POST /api/conversions/track` принимает `promoCode` в Body (optional). Сервис резолвит → partnerId. Инкрементирует `usedCount`. Если `usageLimit` достигнут → код становится inactive (дальнейшие резолвы вернут 404).

### Partner-side (`PartnerJwtAuthGuard`):

- `GET /api/partner-portal/promo-codes` — мои коды со счётчиками использований.
- Опционально: `POST /api/partner-portal/promo-codes` — партнёр сам генерирует себе код (если владелец разрешил). **В MVP — не делаем**, коды выдаёт владелец.

---

## 7. Изменение в TrackConversionDto

```typescript
@IsOptional()
@IsString()
@MaxLength(64)
promoCode?: string;
```

### Логика в `ConversionsService.track()`:

```
if (promoCode) {
  code = findPromoCode(userId, promoCode.toLowerCase())
  if (!code || !code.isActive) → throw 404
  partner = findPartnerById(code.partnerId)
  // После успешного track — inc usedCount. Если >= limit → isActive = false.
}
else if (partnerCode) { ... текущая логика ... }
else if (externalUserId with attribution) { ... текущая логика ... }
```

---

## 8. UI

### Owner:

- На странице деталей партнёра (`/partners` → модалка) — секция **«Promo codes»** со списком и кнопкой «Add code». Inline-form: code string + optional usage limit.
- Таблица кодов с колонками code / used / limit / status / actions (deactivate, delete).
- Глобальная страница `/promo-codes` — **не обязательно** для MVP, можно обойтись секцией в деталях партнёра.

### Partner:

- В `/partner/settings` — read-only секция «Your promo codes». Список кодов со счётчиками + кнопка Copy. Партнёр видит свои коды, но не может редактировать.
- Опционально позже: отдельная страница `/partner/codes` если кодов много.

### Integration page:

- Добавить секцию «Promo codes» с примером:
  - `GET /promo-codes/resolve?code=ALICE10`
  - Пример интеграции в Shopify webhook / Stripe Checkout.

---

## 9. Edge cases, которые нужно закрыть

1. **Регистр**: lowercase storage + lookup.
2. **Гонки на лимите**: атомарный UPDATE:
   ```sql
   UPDATE promo_codes
     SET usedCount = usedCount + 1,
         isActive  = CASE WHEN usedCount + 1 >= usageLimit THEN false ELSE isActive END
     WHERE id = ? AND isActive = true
     RETURNING *
   ```
   Если RETURNING пустой → code исчерпан, откатываем конверсию.
3. **Пустой код**: trim + валидация.
4. **Клиент передаёт одновременно `partnerCode` и `promoCode`**: promoCode wins, log warning если partnerId расходятся.
5. **Код деактивирован в процессе**: resolve вернёт 404, track тоже.
6. **Удалён партнёр**: все его коды деактивируются (ON DELETE CASCADE не подходит — soft-delete через `isActive`). Логика: при `deactivate` партнёра — mark all его коды `isActive=false` тоже.

---

## 10. Чего сознательно НЕ делаем в MVP

- **Per-user usage limit** — нужно связывать `externalUserId` с промокодом; отдельная сложность.
- **Expiry date** — пока не критично, владелец может сам деактивировать. Легко добавить в будущем.
- **Stacking rules** (несколько кодов на один заказ) — merchant-side задача, не наша.
- **Auto-generated unique codes per partner** — можно добавить позже как кнопку «generate» в UI.
- **Discount расчёт** — остаётся на стороне e-com клиента.
- **Self-referral protection** — отдельная фича.
- **Partner-generated codes** — только владелец в MVP.

---

## 11. Объём работы

Примерно сопоставим с пунктом 2 (payout details + CSV):

- 1 миграция + entity
- 1 CRUD модуль (`promo-codes`)
- Изменение в `TrackConversionDto` + `ConversionsService.track`
- Resolve-эндпоинт
- UI: секция на partner details + на partner settings + integration docs

---

## 12. Зависимости и порядок

Независимо от других пунктов roadmap. Не требует пункта 4 (click tracking). Можно делать в любой момент.

После реализации открывает **e-commerce сегмент** (Shopify-магазины, DTC-бренды, инфо-продукты с чек-аутом) — клиенты, у которых основной способ атрибуции — код на кассе, а не UTM-параметр на входе.
