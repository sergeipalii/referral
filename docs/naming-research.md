# Naming Research — Referral Platform

Дата: 2026-04-18
Метод:
- Доменная доступность: RDAP (Verisign для `.com`, Identity Digital для `.io`) + DNS NS-чек через Google DoH для `.app`/`.co`/`.dev`.
- Товарные знаки и существующие продукты: web-поиск с фильтрацией по сильным брендам (прямой доступ к USPTO TESS/EUIPO eSearch ограничен — требуют ручной проверки по ссылкам внизу).

## TL;DR

| Статус | Имена |
|---|---|
| ✅ **Рекомендуется** | **Refgrid**, **Referbit** |
| ⚠️ **Можно с оговорками** | TrackPipe, Refera, Tracta, Refstack |
| ❌ **Исключить** | Refly, Referio, Refkit, Growlink, Convertly |

Перед финальным решением обязательно проверить вручную:
- USPTO: <https://tmsearch.uspto.gov/>
- EUIPO eSearch plus: <https://euipo.europa.eu/eSearch/>

---

## Матрица доступности доменов

Зона `.com` — авторитетный Verisign RDAP. Зона `.io` — Identity Digital RDAP. Зоны `.app`/`.co`/`.dev` — DNS NS-запрос (наличие NS-записей = зарегистрирован).

| # | Имя | .com | .io | .app | .co | .dev |
|---|---|:--:|:--:|:--:|:--:|:--:|
| 1 | Refly | ❌ | ❌ | ❌ | ❌ | ❌ |
| 2 | Referio | ❌ | ❌ | ❌ | ❌ | ✅ |
| 3 | Refera | ❌ | ❌ | ✅ | ❌ | ❌ |
| 4 | **Refgrid** | ❌ | ✅ | ✅ | ✅ | ✅ |
| 5 | **Referbit** | ❌ | ✅ | ✅ | ✅ | ✅ |
| 6 | Tracta | ❌ | ❌ | ❌ | ❌ | ✅ |
| 7 | Growlink | ❌ | ❌ | ✅ | ❌ | ✅ |
| 8 | Convertly | ❌ | ❌ | ❌ | ❌ | ❌ |
| 9 | RefKit | ❌ | ❌ | ✅ | ✅ | ✅ |
| 10 | Refstack | ❌ | ❌ | ❌ | ❌ | ❌ |
| 11 | TrackPipe | ❌ | ❌ | ✅ | ✅ | ❌ |

> Оговорка: DNS-чек видит домен «занятым», если у него выставлены NS-записи. Если домен зарегистрирован, но полностью без делегирования — он может не попасть в этот фильтр. Для критичного решения сверяйся с регистратором (Namecheap/Porkbun/Cloudflare) — там же увидишь и premium-цену на `.io`.

---

## Детальная оценка по каждому имени

### 1. Refly ❌

**Формулировка преимуществ:** короткое, легко произносимое; ассоциация с *referral* + *fly* (рост, скорость).

**Конфликты:**
- **refly.ai** — активная, профинансированная AI-платформа для agentic-workflow, open-source (GitHub `refly-ai/refly`), есть Shopify-приложение, профиль на Crunchbase. Прямой сильный бренд.
- Все целевые зоны заняты.

**Вердикт:** снять с рассмотрения. Бренд-коллизия с быстрорастущим AI-продуктом — проиграешь по SEO и узнаваемости.

---

### 2. Referio ❌

**Формулировка преимуществ:** звучит как сервис/бренд; SaaS-энергия окончания «-io».

**Конфликты:**
- **referio.io** — действующая video referral платформа («earn rewards for successful placements»). Это **точный тезка в соседней нише** (реферальный рекрутинг вместо маркетинговых рефералов).
- **referio.global** — creator commerce / affiliate платформа.
- **refer.io** (разное написание) — рекрутинговая платформа с интеграцией в Lever.

**Вердикт:** исключить. Три реферальных продукта с почти идентичными именами — рецепт судебного иска или минимум юридического письма.

---

### 3. Refera ⚠️

**Формулировка преимуществ:** латинское звучание, мягкое и запоминающееся.

**Конфликты:**
- **refera.com.br** — бразильский стартап (Флорианополис, 2020) — маркетплейс для property maintenance в недвижимости. Работает с риелторами, не с аффилиатами — разные ниши, но имя идентичное.

**Вердикт:** возможно при нацеливании не на LATAM. Но только `.app` свободен, остальные заняты — домен-опции слабые. Имя хорошее, но экосистема ограничена.

---

### 4. Refgrid ✅ **ТОП-КАНДИДАТ**

**Формулировка преимуществ:** *referral + grid* (сетка партнёров), технологичный оттенок.

**Конфликты:**
- Прямых сильных брендов с именем «Refgrid» не найдено.
- Есть адъюнкты: **Regrid** (GIS/parcel mapping), **Resgrid** (dispatch для first responders), **R.grid** (clinical trials CTMS) — разные индустрии, разные написания.

**Домены:** `.io`, `.app`, `.co`, `.dev` — всё свободно.

**Вердикт:** брать. Чистое пространство в реферальной нише, сильный набор доменов, техно-звучание хорошо подходит для API-first продукта с HMAC / API keys.

---

### 5. Referbit ✅ **ТОП-КАНДИДАТ**

**Формулировка преимуществ:** компактно, намёк на digital/atomic единицы конверсий.

**Конфликты:**
- Прямых сильных брендов не найдено.
- Возможны мелкие некоммерческие упоминания (open-source/indie утилиты) — требуется финальная ручная проверка в TESS/EUIPO.

**Домены:** `.io`, `.app`, `.co`, `.dev` — всё свободно.

**Вердикт:** брать. Самое чистое из всей подборки. Хорошо ложится на продукт с фокусом на точечное отслеживание конверсий.

---

### 6. Tracta ⚠️

**Формулировка преимуществ:** от *track + acta* (действия), коротко и брендоспособно.

**Конфликты:**
- **tracta.co.nz** — агро-маркетинговое агентство в Новой Зеландии.
- **tractaenergy.com** — консалтинг для возобновляемой энергетики.
- **tractconsulting.com** — ландшафтно-планировочное бюро.

**Вердикт:** слово-омоним, занято в нескольких нишах. Прямого конкурента в аффилиат-маркетинге нет, но SEO будет тяжёлым. `.dev` свободен; `.com/.io/.co/.app` все заняты.

---

### 7. Growlink ❌

**Формулировка преимуществ:** *growth + link*, прямо говорит о цели системы.

**Конфликты:**
- **growlink.ag** — профинансированный IoT-продукт для cannabis cultivation, Casa Verde $2M seed, 2,200+ клиентов в 35 странах, 10+ лет на рынке. Сильный устоявшийся бренд.

**Вердикт:** исключить. Бренд-коллизия с известным игроком.

---

### 8. Convertly ❌

**Формулировка преимуществ:** фокус на конверсиях, SaaS-энергия.

**Конфликты:**
- **withconvertly.com** — growth optimization for eCommerce (CRO, email-flow, Shopify/Klaviyo). **В той же маркетинговой нише**, что и реферальная система.
- Ещё один Convertly — image conversion service на Upwork (фрилансерский мусор, но шум).

**Вердикт:** исключить. Прямой конкурент в той же воронке «больше продаж через маркетинговые каналы». Клиенты будут путать.

---

### 9. RefKit ❌

**Формулировка преимуществ:** подчёркивает API-first / integration-friendly природу (как раз то, что уже есть в коде).

**Конфликты:**
- **refkit.io** — **аффилиат- и реферальное ПО для Paddle sellers**. Это **прямой конкурент в ровно этой нише**. Нанесение урона бренду гарантировано.
- Intel IoT Reference OS Kit (`meta-refkit`) — open-source, низкий приоритет как конфликт.
- REFKIT Limited (LinkedIn) — британская компания.

**Вердикт:** исключить. Даже при свободных `.app/.co/.dev` имя провалится на первой же Google-выдаче — там уже сидит конкурент.

---

### 10. Refstack ⚠️

**Формулировка преимуществ:** стек инструментов для работы с рефералами, dev-friendly.

**Конфликты:**
- **RefStack** от OpenStack Foundation — инструмент interoperability-тестирования. Проект `openstack-archive/refstack` — архивирован, но имя узнаваемо в cloud/DevOps-сообществе.

**Вердикт:** возможно, если целевая аудитория — не DevOps. В маркетологической/аффилиатной нише пересечение незначительное. Но все ключевые домены заняты — экосистема слабая.

---

### 11. TrackPipe ⚠️

**Формулировка преимуществ:** pipeline трекинга конверсий, говорит на языке инженеров.

**Конфликты:**
- **trackpipe.com** — промышленный софт для отслеживания труб (EQUAL Systems, LayFab/PipeFab/SpoolFab). Совершенно другая индустрия, но владеет `.com`.

**Вердикт:** кросс-индустриальная коллизия малозначительна, но SEO за `.com` проиграно заранее. `.app/.co` свободны.

---

## Рекомендация

**Refgrid** и **Referbit** — единственные из финалистов, где:
1. Нет сильных одноимённых брендов в реферальной/аффилиатной/маркетинговой нише.
2. Все ключевые альтернативные зоны (`.io`, `.app`, `.co`, `.dev`) свободны.
3. Имена семантически привязаны к домену задачи (referral + grid / bit).

**Следующие шаги перед покупкой:**
1. Ручная проверка в USPTO TESS — <https://tmsearch.uspto.gov/search/search-information?searchType=wordmarkSearch>
2. Ручная проверка в EUIPO eSearch plus — <https://euipo.europa.eu/eSearch/#advanced/trademarks>
3. Проверка premium-ценников на `.io` у регистратора (Porkbun / Cloudflare / Namecheap) — короткие `.io` часто стоят от $1–10k даже при «свободном» статусе.
4. Для выбранного имени проверить доступность хэндлов на GitHub, X/Twitter, LinkedIn, Producthunt.

## Источники

### Доменные проверки
- [rdap.org — универсальный RDAP-роутер](https://rdap.org/)
- [Identity Digital RDAP (`.io`)](https://rdap.identitydigital.services/rdap/)
- [Google Public DNS-over-HTTPS](https://dns.google/resolve)

### Товарные знаки
- [USPTO Trademark Search](https://tmsearch.uspto.gov/)
- [USPTO TSDR](https://tsdr.uspto.gov/)
- [EUIPO eSearch plus](https://euipo.europa.eu/eSearch/)

### Конкурирующие продукты (обнаруженные)
- [Refly.ai — AI workflow platform](https://refly.ai/)
- [Refly — Shopify App](https://apps.shopify.com/refly)
- [Referio.io — video referral platform](https://referio.io/)
- [Referio Global — creator commerce](https://referio.global/)
- [Refer.io — recruitment / Lever integration](https://refer.io/app/)
- [Refera — Brazilian real estate marketplace (Crunchbase)](https://www.crunchbase.com/organization/refera)
- [Regrid — GIS/parcel mapping](https://regrid.com/)
- [Resgrid — dispatch platform](https://resgrid.com/about)
- [Tracta — NZ agrimarketing agency](https://tracta.co.nz/)
- [Tracta Energy — renewable consulting](https://tractaenergy.com/en/)
- [Growlink — IoT for cannabis cultivation](https://www.growlink.ag/)
- [Convertly — eCommerce growth](https://www.withconvertly.com/)
- [REFKIT — affiliate/referral for Paddle](https://www.refkit.io/product/)
- [Intel IoT Reference OS Kit (`meta-refkit`)](https://layers.openembedded.org/layerindex/branch/master/layer/meta-refkit/)
- [OpenStack RefStack — interop testing](https://wiki.openstack.org/wiki/RefStack)
- [TrackPipe — pipeline tracking](http://www.trackpipe.com/)

---

## Дополнение: кандидаты под ledger-позиционирование

После переосмысления продукта как **системы учёта партнёрских начислений и выплат** (а не growth-инструмента) добавлены кандидаты с акцентом на bookkeeping-семантику.

### Матрица доступности доменов

| # | Имя | .com | .io | .app | .co | .dev |
|---|---|:--:|:--:|:--:|:--:|:--:|
| 12 | Refnote | ❌ | ✅ | ❌ | ✅ | ✅ |
| 13 | **Refledger** | ❌ | ✅ | ✅ | ✅ | ✅ |
| 14 | Refbook | ❌ | ❌ | ❌ | ✅ | ❌ |

### 12. Refnote ⚠️

**Формулировка преимуществ:** «запись/нота» — журнал учёта референсов; короткое, мягкое звучание.

**Конфликты:**
- **refnote.app** — студенческое приложение для коллаборативных заметок (*ref:note*). Прямой владелец имени, но соседняя ниша (EdTech vs affiliate).
- **RefNote Chrome Extension** — мелкое веб-расширение.
- **Land F/X RefNotes** — плагин AutoCAD для hardscape/landscape дизайна.
- **TiddlyWiki Refnotes** — плагин для сносок.

**Вердикт:** возможно, но namespace-шум средний. Все эти «RefNotes» в области «заметки/ссылки», и бренд продукта для аффилиатского учёта будет теряться в выдаче по запросам вроде «refnote app». `.io` свободен — можно брать, но стоит быть готовым к SEO-конкуренции.

### 13. Refledger ✅ **ТОП-КАНДИДАТ**

**Формулировка преимуществ:** прямолинейно — «ledger для рефералов». Мгновенно считывается бухгалтером/финдиром, однозначно указывает на суть продукта (журнал начислений и выплат). Не маскируется под growth-инструмент.

**Конфликты:**
- Прямых продуктов с именем «Refledger» не найдено.
- Есть **Refrens** — AI-accounting платформа (не совпадает, но другая `Ref`-компания в финтехе — стоит различать в маркетинге).
- Есть **SoftLedger** — ERP/accounting продукт (другое имя, просто смежная ниша).
- **Ledger** (hardware crypto wallet) — совсем другая индустрия.

**Домены:** все ключевые альтернативные зоны свободны (`.io`, `.app`, `.co`, `.dev`).

**Вердикт:** **лучший кандидат из ledger-ветки**. Чистое поле, прямое попадание в позиционирование, сильный семейный паттерн `Ref-` с предыдущими фаворитами (Refgrid/Referbit). Серьёзное, не детское звучание — то, что нужно для B2B-продукта, где партнёры доверяют системе свои выплаты.

### 14. Refbook ❌

**Формулировка преимуществ:** классическое «книга учёта» (bookkeeping).

**Конфликты:**
- **refbook.online** — активный профинансированный австралийский SaaS (Melbourne, 2019) для управления sports referees и umpires. Имеет iOS/Android-приложения, в App Store и Google Play. Владеет доменом `.com`, `.io`, `.app`, `.dev` — фактически всей экосистемой.

**Вердикт:** исключить. Прямой действующий SaaS с тем же именем, пусть и в другой индустрии. Коллизия гарантирована и в SEO, и в App Store-выдаче.

---

## Финальная таблица лидеров

| Имя | Тема | Конфликт брендов | Доменная экосистема | Рекомендация |
|---|---|---|---|---|
| **Refledger** | учёт / ledger | нет прямых | `.io/.app/.co/.dev` — всё свободно | ★★★ топ под ledger-позиционирование |
| **Refgrid** | network / mesh | нет прямых | `.io/.app/.co/.dev` — всё свободно | ★★★ топ под platform-позиционирование |
| **Referbit** | tracking units | нет прямых | `.io/.app/.co/.dev` — всё свободно | ★★★ топ универсальный |
| Refnote | notes / journal | средний шум (EdTech) | `.io/.co/.dev` — свободно | ★★ возможно с оговорками |

### Как выбирать из топ-3

- **Refledger** — если продукт позиционируется в первую очередь как **инструмент учёта** для финансовой стороны (CFO, бухгалтерия партнёрского менеджмента). Консервативно, солидно, B2B-безопасно.
- **Refgrid** — если акцент на **мультипартнёрскую сеть** и API-first интеграции (dev-facing, техничное).
- **Referbit** — наиболее универсальное, подойдёт под любое позиционирование; нейтрально и современно.

### Дополнительные конкурирующие продукты (новые)
- [ref:note — студенческое приложение для заметок](https://refnote.app/)
- [Land F/X RefNotes — AutoCAD плагин](https://www.landfx.com/docs/site-hardscape-design/reference-notes/1343-started.html)
- [refbook.online — sports referee management SaaS](https://www.refbook.online/)
- [Refrens — AI accounting/ERP platform](https://www.refrens.com)
- [SoftLedger — cloud accounting/ERP](https://softledger.com/)