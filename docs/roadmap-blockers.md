# Blockers Roadmap

Пять пробелов, блокирующих продажу продукта в той или иной сегментной группе. Порядок — от универсальных к сегментным.

Статус: `TODO` / `IN_PROGRESS` / `DONE`.

---

## 1. Партнёрский кабинет с отдельной авторизацией

**Статус:** DONE
**Блокирует:** всех.

Партнёру сейчас некуда заглянуть. Он не видит свои клики, конверсии, начисления и баланс — эту информацию приходится вручную высылать владельцу программы. Без кабинета продукт принципиально неполный.

**Скоуп MVP:**
- Отдельная авторизация партнёра (email + пароль), изолированная от JWT владельца.
- Флоу приглашения: владелец заводит партнёра с `email` → система выдаёт одноразовый invite-токен → партнёр по ссылке задаёт пароль.
- Кабинет партнёра (`/partner/...`):
  - дашборд с его метриками (конверсии, начисления, баланс),
  - список конверсий с фильтром по датам,
  - история выплат,
  - страница профиля с payout details (см. пункт 2).
- Гард `PartnerJwtAuthGuard`, резолвящий `partnerId` + `userId` (tenant).
- Все запросы партнёра изолированы на уровне SQL: `WHERE userId = ? AND partnerId = ?`.

**Зависимости:** нет (это фундамент для пунктов 2 и частично 5).

---

## 2. Payout details у партнёра + CSV-экспорт выплат

**Статус:** DONE
**Блокирует:** всех на стадии выплат.

Автоматические выплатные рельсы (Stripe Connect / Wise / PayPal) — **не нужны** для MVP: клиенты платят из собственных систем (банк-клиент, ERP, бухгалтерия). Нужно только:

**Скоуп MVP:**
- Поле `payoutDetails` (JSONB) у партнёра: IBAN / PayPal email / Wise tag / крипта-адрес / произвольный текст. Схема мягкая, партнёр заполняет в кабинете.
- CSV-экспорт по платежам: `GET /payments/export.csv?period=...&status=pending` → строки «партнёр, email, payoutDetails, сумма к выплате, период, reference». Файл загружают в банк-клиент / отдают финдиру.
- Групповое создание платежей за период: «выплатить всем за Q1» → батч pending-записей, которые потом можно отметить completed после факта.

**Зависимости:** пункт 1 (partner portal — место, где партнёр вводит реквизиты).

---

## 3. Промокоды как метод атрибуции

**Статус:** DONE
**Блокирует:** e-commerce сегмент.

**Реализовано:**
- `PromoCodeEntity` (userId, partnerId, code lowercase, usageLimit, usedCount, metadata, isActive).
- Owner CRUD: `POST/GET/PATCH/DELETE /promo-codes` (JWT).
- Integration resolve: `GET /promo-codes/resolve?code=` (ApiKeyAuthGuard) — возвращает `{ partnerId, partnerCode }`.
- `POST /conversions/track` принимает `promoCode` — резолвит партнёра, атомарно инкрементирует `usedCount`, auto-deactivates на лимите.
- Partner portal: `GET /partner-portal/promo-codes` (read-only список кодов партнёра).
- Case-insensitive (хранится lowercase).
- Priority: `promoCode` > `clickId` > `partnerCode`.

---

## 4. Click tracking + attribution window

**Статус:** DONE
**Блокирует:** web-сегмент (без мобильного MMP).

**Реализовано:**
- `ClickEntity` (userId, partnerId, createdAt, expiresAt, ip, userAgent, referer, landingUrl).
- Per-tenant `attributionWindowDays` на `users` (default 30 дней).
- Redirect: `GET /api/r/:partnerCode?to=<url>` — публичный, пишет click, ставит cookie `rk_click`, 302-редирект. Безопасный fallback при несуществующем коде.
- First-party: `POST /api/clicks` — публичный, возвращает `{ clickId, expiresAt }`, клиент сам ставит cookie на своём домене.
- `POST /conversions/track` принимает `clickId` — ищет click в пределах окна атрибуции, резолвит partnerId. При expired click — fallback на partnerCode если передан.
- Cron cleanup: `04:30 UTC` — удаляет clicks expired > 7 дней.
- Global partner lookup (`findByCodeGlobal`) для public-endpoints без tenant-контекста.

**Зависимости:** нет.

---

## 5. Recurring commissions

**Статус:** DONE
**Блокирует:** SaaS-сегмент.

Подписочные SaaS ожидают, что партнёр получает комиссию с каждого продления подписки, пока юзер платит. Сейчас `accrual-rules` умеют только fixed / percentage по разовому событию.

**Реализовано:**
- Новые `ruleType`: `'recurring_fixed'` и `'recurring_percentage'`. Расширен enum в entity, DTO, UI.
- У правила — `recurrenceDurationMonths int null` (null = пожизненно).
- Новая таблица `user_attributions` с UNIQUE(userId, externalUserId) — first-touch, race-safe INSERT ... ON CONFLICT DO NOTHING.
- `TrackConversionDto` принимает `externalUserId`. На первом событии с partnerCode + externalUserId — создаётся attribution. На последующих — партнёр берётся из attribution, даже если передан другой partnerCode.
- `ConversionsService.track()` для recurring правил проверяет окно (`firstConversionAt + recurrenceDurationMonths > now`); за рамками окна accrual = 0.
- UI: форма правила переключает 4 типа, показывает чекбокс «Limit attribution window» + поле месяцев для recurring.
- Integration page: новый раздел «Recurring commissions» с field-маппингом и кодом-примером.

**Зависимости:** `externalUserId` передаётся явно в track (пункт 4 пока не реализован — ответственность на клиенте).

---

## Порядок работ

1. ✅ Пункт **1** — партнёрский кабинет (фундамент).
2. ✅ Пункт **2** — payout details + CSV + batch.
3. ✅ Пункт **3** — промокоды (открывает e-commerce).
4. ✅ Пункт **4** — click tracking + attribution window (открывает web без MMP).
5. ✅ Пункт **5** — recurring commissions (открывает SaaS).

**Все пять пунктов закрыты.** Дополнительно реализованы: SaaS billing (Stripe), аналитический дашборд, лендинг с pricing.
