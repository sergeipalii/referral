# Research & Plan: Click tracking + Attribution window

> Статус: **исследование / план** (пункт 4 из `roadmap-blockers.md`).
> Дата: 2026-04-16.

Документ описывает концепцию attribution window, как это работает в индустрии и как предполагается реализовать click tracking в нашей системе. Research-спецификация перед началом реализации — entity, endpoints, UI, trade-offs, edge cases.

---

## 1. Что такое attribution window

**Attribution window** — время от клика по партнёрской ссылке до конверсии, в течение которого партнёру ещё засчитывается результат. Если юзер купил позже, чем закончилось окно — партнёр ничего не получает.

Это фундаментальное понятие в веб-атрибуции. Без него любая конверсия через неделю, месяц, год после клика технически могла бы быть приписана партнёру — что несправедливо (человек мог сто раз забыть про ссылку и купить по другому каналу), дорого и ломает экономику программы.

Концептуально окно атрибуции отвечает на вопрос: **«через сколько времени после клика мы перестаём считать, что этот визит причина покупки?»**

---

## 2. Индустриальные стандарты

| Платформа | Типичный window |
|---|---|
| Google Ads | 30 дней (post-click), 1 день (post-view) |
| Facebook Ads | 7 дней (post-click), 1 день (post-view) — после iOS 14.5 |
| Amazon Associates | 24 часа (!) |
| Affiliate-сети (Impact, Awin) | обычно 30 дней, иногда 60–90 |
| AppsFlyer | настраивается, default 7–30 дней |
| Shopify / Tapfiliate | обычно 30 дней |

Чем короче окно — тем меньше платите партнёрам, но тем честнее атрибуция (юзер действительно «горячий» от того клика). Чем длиннее — тем щедрее к партнёрам, но выше риск начислить за покупку, которая и так случилась бы.

Amazon с его 24 часа — экстремум, потому что они могут себе позволить: у них брендированный трафик и так конвертирует.

---

## 3. Как это работает технически (веб-сценарий)

Классический flow с cookie:

```
1. Юзер кликает по ссылке https://site.com/?ref=alice
       ↓
2. Сервер:
   - записывает click-событие (partnerId=alice, user-agent, ip, timestamp)
   - ставит cookie rk_click=<clickId>
     с TTL = attribution window (например, 30 дней)
   - делает 302-редирект на landing page
       ↓
3. Юзер ходит по сайту, уходит, возвращается
       ↓
4. Юзер регистрируется / покупает
       ↓
5. Сервер e-com читает cookie rk_click:
   - если есть → ищет click → засчитывает конверсию за alice
   - если нет или expired → organic-конверсия, никому не платим
```

Две ключевые точки:

- **Старт окна** — timestamp клика.
- **Проверка окна** — в момент конверсии: если `now − clickTime > window` → attribution не применяется.

Cookie — лишь механизм доставки `clickId` между этими двумя точками. Само окно — свойство click-записи в БД.

---

## 4. First-touch vs last-touch

Когда у юзера несколько кликов в окне:

```
Day 0:  Alice clicks (partnerId=a)
Day 3:  Bob clicks (partnerId=b)
Day 5:  Purchase
```

Два принципа:

- **First-touch** — платим Alice. Последующие клики не меняют атрибуцию. Логика: «Alice привлекла юзера, Bob просто ремаркетил».
- **Last-touch** — платим Bob. Логика: «Юзер был горячий благодаря Bob, он ближе к решению о покупке».

Индустрия смешанная: Google Ads — last-click, Facebook — last-click, Amazon — last-click, большинство affiliate-сетей — **last-click**. Для рефералов типа «друг пригласил» обычно **first-touch**.

В нашей системе для recurring уже first-touch (первый partnerCode закрепляется за `externalUserId`). Для согласованности логично и click-tracking сделать first-click. Но индустриальный стандарт — last-click.

**Решение для MVP: last-click** — соответствует ожиданиям большинства клиентов, приходящих с affiliate-сетей. Каждый клик перезаписывает cookie и (в случае того же партнёра) продлевает `expiresAt`.

---

## 5. Attribution window ≠ recurring duration

У нас уже реализована фича, внешне похожая — `recurrenceDurationMonths` для recurring-правил (пункт 5). Разница:

| | Attribution window | Recurrence duration |
|---|---|---|
| Зачем | Решить, **закреплять ли** партнёра за юзером вообще | Решить, **как долго платить** после закрепления |
| Старт | Клик (или введение промокода) | Первая конверсия (подтверждённая регистрация/покупка) |
| Конец | Окно закрывается — attribution не устанавливается | Окно закрывается — платим 0, но attribution остаётся |
| Единица времени | Часто дни (7–30–90) | Часто месяцы (6–12–24) |
| Кто ставит | Владелец программы глобально | Владелец для recurring-правила |

Правило: **attribution window — «до»**, **recurring duration — «после»**. Одно не заменяет другое. В зрелой системе работают оба.

---

## 6. Архитектурные решения (с трейдоффами)

### 6.1. Default attribution window

30 дней — сильный default индустрии. Конфигурируется per-tenant через новое поле в настройках аккаунта (`attributionWindowDays`). Override per-partner — в MVP **не делаем** (добавим если будет запрос).

### 6.2. Attribution policy: last-click

Каждый клик перезаписывает cookie и привязывает юзера к новому партнёру. Старые click-записи сохраняются (для аналитики), но для attribution используется последний в пределах окна.

Компромисс: это расходится с first-touch-логикой recurring rules. На практике:

- Click tracking определяет партнёра на момент первой конверсии (first-touch → recurring attribution устанавливается).
- Дальше recurring rules работают как раньше — против зафиксированной attribution.

То есть last-click влияет только на то, **кому** приписать первую конверсию, но не на последующие renewals — там уже всё зафиксировано.

### 6.3. Где хранится clickId у юзера

Два варианта:

- **Cookie** (`rk_click=<clickId>`, HttpOnly, SameSite=Lax, TTL = attribution window): браузер сам доставит cookie на все запросы к нашему домену. Но track зовётся **с бэкенда клиента**, cookie будет у браузера юзера, не у нас.
- **Клиент сам пробрасывает clickId**: фронт читает cookie, отдаёт бэкенду, бэкенд передаёт в track.

Используем **второй вариант**: cookie ставится нашим redirect-эндпоинтом, клиент читает её на своей стороне и явно передаёт `clickId` в `POST /conversions/track`.

Это проще для клиента (кука живёт на их домене), чище разделение ответственности и не требует cross-domain трюков.

### 6.4. Redirect endpoint

`GET /api/r/:partnerCode?to=<landingUrl>` — публичный, без auth.

- Пишет click-запись.
- Ставит cookie `rk_click=<clickId>` на **свой** домен. Клиент при необходимости читает её на своей стороне через fetch-proxy (раскрывается в документации).
- Делает 302-редирект на `to` (или default landing page из настроек партнёра).

**Проблема cross-domain cookies**: если клиент хостит фронт на своём домене, то cookie на нашем домене не пересекается с их JS. Для чистого UX клиент может сам сделать прокси `/go/:partnerCode` → наш `/api/r/:partnerCode` с `redirect: 'manual'`, получить Set-Cookie, переставить на свой домен. Или — альтернативный **первый-party** flow:

- Клиент делает **серверный редирект** на свою страницу `?ref=<partnerCode>`.
- Фронт клиента на first-party домене POST-ит в наш `/api/clicks` с `partnerCode`, получает `clickId`, ставит cookie сам.
- Последующие события берут clickId из его cookie.

Это более гибко. Для MVP оставим оба варианта доступными и задокументируем.

### 6.5. Фронтовый SDK

Позже будет удобно вынести в npm-пакет `@referral-system/web-sdk`:

```js
refSDK.trackClick(partnerCode)   // POST /api/clicks → cookie
refSDK.trackConversion(event)    // прочитает cookie, дополнит body
```

**В MVP — не делаем**, клиент интегрирует сам. SDK — future work.

### 6.6. Self-referral / fraud

Минимум:

- Записывать `ip`, `userAgent` клика.
- При конверсии можно сравнить с partner.metadata (если партнёр указал свой IP) — если совпадает, warn или skip.

В MVP **не реализуем** активный фрод-фильтр. Только пишем поля, используем позже.

### 6.7. Policy при коллизии с promoCode / partnerCode

Приоритеты (сверху вниз):

1. `promoCode` — самый явный сигнал.
2. `clickId` — next-best.
3. `partnerCode` — fallback (прямая передача без клика).
4. `externalUserId` с существующей attribution — для recurring-событий, применяется ВМЕСТО разрешения партнёра, если attribution уже стоит.

---

## 7. Сущность

```sql
CREATE TABLE clicks (
  id                uuid PRIMARY KEY,
  userId            varchar NOT NULL,         -- tenant
  partnerId         uuid NOT NULL REFERENCES partners(id),
  createdAt         timestamp NOT NULL DEFAULT now(),
  expiresAt         timestamp NOT NULL,       -- createdAt + attributionWindowDays
  ip                varchar(45),              -- IPv4/IPv6
  userAgent         varchar(1024),
  referer           varchar(2048),
  landingUrl        varchar(2048)
);
CREATE INDEX IDX_clicks_tenant_partner ON clicks (userId, partnerId);
CREATE INDEX IDX_clicks_expiresAt      ON clicks (expiresAt);  -- для cleanup cron
```

### Настройки per-tenant

Таблица `users` или отдельный `tenant_settings`:

```sql
ALTER TABLE users ADD COLUMN attributionWindowDays int NOT NULL DEFAULT 30;
```

(Или новая таблица `tenant_settings` jsonb, если настроек наберётся много.)

---

## 8. Endpoints

### Публичный (без auth):

- `GET /api/r/:partnerCode?to=<url>` — пишет click, ставит cookie, 302 на `to` (или landing-default).
- `POST /api/clicks` — альтернатива для first-party интеграций. Body: `{ partnerCode, landingUrl?, referer? }`. Возвращает `{ clickId, expiresAt }`. Клиент сам ставит cookie на своём домене.

### Integration-side (`ApiKeyAuthGuard`):

Не обязательны — можно оставить только публичные. Но может быть полезен:

- `GET /api/clicks/:clickId` — вернуть инфу по click-у (partnerId, expiresAt) — если клиентскому бэкенду нужно проверить валидность до track.

### Track endpoint (изменение):

`POST /api/conversions/track` принимает `clickId` в Body (optional). Сервис:

1. Если `clickId` → находит click, проверяет `expiresAt > now` и `userId` совпадает с tenant-ом API-ключа. Если валиден → partner = click.partnerId.
2. Если нет → fallback на текущую логику (`promoCode` / `partnerCode` / `externalUserId`).

### Owner-side (`JwtAuthGuard`):

- `GET /api/clicks?partnerId=&page=&limit=` — список кликов партнёра (для диагностики).
- `PATCH /api/users/self/settings` — редактировать `attributionWindowDays` (или отдельный settings-эндпоинт).

---

## 9. Изменение в TrackConversionDto

```typescript
@IsOptional()
@IsUUID()
clickId?: string;
```

### Логика в `ConversionsService.track()`:

```
if (clickId) {
  click = findClick(userId, clickId)
  if (click && click.expiresAt > now) {
    partnerId = click.partnerId
  }
  // Если click истёк/не найден — считаем, что clickId нет, идём в fallback
}
else if (promoCode) { ... }
else if (partnerCode) { ... }
else if (externalUserId with attribution) { ... }
```

### Взаимодействие с `externalUserId` + recurring

На первой конверсии: `clickId` → partnerId → `getOrCreateAttribution(externalUserId, partnerId)` → attribution зафиксирована.

На последующих (renewals): `externalUserId` имеет attribution, она wins — неважно, передаётся ли click. Ожидаемое поведение: свежий клик на того же юзера не «пересбрасывает» recurring attribution.

---

## 10. UI

### Owner:

- Settings страница (или секция на `/` или `/partners` — TBD): поле «Attribution window (days)», default 30.
- На детальной странице партнёра — секция «Recent clicks» (топ 20, с датой, IP, UA). Полезно для дебага.
- На detail-modal партнёра — поле «Landing URL default» (куда редиректить `/api/r/:code` если не передан `to`).

### Partner:

- На `/partner/settings` или отдельной `/partner/links` — read-only показ его tracking-ссылок: `https://app.palii.me/api/r/<code>` + инструкция «подставь свой landing через `?to=`».
- Метрики кликов (count за период, можно пропустить в MVP).

### Integration page:

Новая секция «Click tracking»:
- Как работает `/api/r/:code`
- Как настроить first-party вариант через `/api/clicks`
- Как прокинуть `clickId` из cookie в `POST /conversions/track`
- Пример на JS для браузерного чтения cookie

---

## 11. Edge cases

1. **Кука блокируется браузером (Safari ITP, Firefox strict)**: first-party flow решает это частично. Совсем без cookie — нельзя.
2. **Несколько кликов того же партнёра**: каждый создаёт новую запись, cookie перезаписывается, `expiresAt` продлевается (последний клик wins).
3. **Клик истёк между визитом и конверсией**: attribution не применяется → fallback на partnerCode, если есть; иначе — organic.
4. **Неактивный партнёр**: click-endpoint возвращает 404 на `/api/r/:code`, не редиректит. Или редиректит на default-landing без click-записи — TBD.
5. **Collision clickId ↔ partnerCode**: если оба переданы и отличаются, clickId wins, partnerCode logged как warning.
6. **Cleanup**: expired clicks можно удалять cron-ом раз в день (`DELETE FROM clicks WHERE expiresAt < now() - INTERVAL '7 days'` — с grace period для аналитики).
7. **User меняет window**: увеличение — ок, влияет на новые клики. Уменьшение — существующие клики с `expiresAt` больше нового window продолжают жить до своего expiresAt. Не пересчитываем задним числом.

---

## 12. Чего сознательно НЕ делаем в MVP

- **Per-partner override attribution window** — глобально per-tenant достаточно.
- **View-through attribution** (post-view, как у Meta/Google) — отдельный класс проблем, трекинг impressions, не для MVP.
- **Cross-device attribution** — требует user-id mapping, большая тема.
- **Фрод-детект** (IP matching, device fingerprint) — только пишем поля, фильтры позже.
- **JS SDK** — клиент интегрирует сам, документируем curl-примеры.
- **Автоматическая очистка expired clicks** — необязательно для MVP, таблица не критично растёт.
- **Click dedup по IP+UA+partner в окне минуты** — можно добавить позже.
- **Analytics кликов** (графики, конверсия клик→покупка) — отдельная фича.

---

## 13. Объём работы

Крупнее пункта 3 (промокоды) за счёт публичного redirect-эндпоинта и cookie-логики:

- 1 миграция: таблица `clicks` + индексы + `attributionWindowDays` на `users`.
- `ClicksModule` с entity, сервисом, контроллером (redirect + POST /api/clicks + GET /api/clicks).
- Изменение в `TrackConversionDto` + `ConversionsService.track` (priority-chain).
- Cron для cleanup (optional).
- UI: settings поле, секция на partner detail, partner-portal links, integration docs.
- Документация — важный пункт, без неё клиент не интегрирует.

---

## 14. Зависимости и порядок

Независимо от других пунктов. Не требует пункта 3 (промокоды). Хорошо сочетается с пунктом 5 (recurring) — вместе закрывают полный SaaS + web flow.

После реализации открывает **web-сегмент без MMP** — SaaS-сервисы с web-onboarding-ом, маркетплейсы, инфо-продукты. Для мобайла всё так же AppsFlyer решает это через OneLink; click tracking — для тех, у кого мобайла нет или web — основной канал.

---

## 15. Открытые вопросы (решить в момент реализации)

1. **Default attribution window**: 30 дней — ок или другое?
2. **Где хранится настройка окна**: новое поле на `users` или отдельная таблица `tenant_settings`?
3. **Landing URL default**: свойство партнёра (`partner.landingUrl`) или тенанта (общий для всех партнёров)?
4. **Inactive partner clicks**: 404 на редиректе или молча редиректим без click-записи?
5. **First-click vs last-click**: подтвердить last-click (индустриальный стандарт).
