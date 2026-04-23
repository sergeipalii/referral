# Deployment Downtime: анализ и стратегии

> Дата: 2026-04-17.
> Контекст: `docker compose up -d --build` на одном сервере, без оркестратора.

---

## Что происходит при `docker compose up -d --build`

### Фаза 1 — Build (сайт работает)

Docker собирает новые образы backend + frontend. Старые контейнеры продолжают обслуживать трафик. Длительность: 1-3 минуты (npm ci + nest build + next build).

### Фаза 2 — Stop old → Start new (даунтайм)

Для каждого сервиса с изменённым образом Docker Compose выполняет: stop → remove → create → start. Старый контейнер останавливается ДО запуска нового.

```
backend:
  ├── Стоп старого контейнера           ← DOWNTIME STARTS (API)
  ├── Запуск нового контейнера
  ├── npm run migration:run             ~1-2 сек
  └── node dist/main (NestJS boot)      ~3-5 сек
                                        ← DOWNTIME ENDS (API)

frontend:
  ├── Стоп старого контейнера           ← DOWNTIME STARTS (UI)
  ├── Запуск нового контейнера
  └── node server.js (Next.js boot)     ~1-2 сек
                                        ← DOWNTIME ENDS (UI)
```

**Итого: ~5-15 секунд даунтайма на backend, ~2-5 секунд на frontend.** Перезапускаются последовательно → полное окно до 20 секунд.

### Что видит пользователь

- Во время сборки — ничего не меняется, сайт работает.
- Во время перезапуска backend — API отвечает connection refused / 502 (через Caddy/nginx). Фронт может быть ещё жив, но показывает ошибки при API-запросах.
- Во время перезапуска frontend — страница не грузится (502 от прокси).

### Postgres

Не пересобирается (volume `pgdata` persistent). Даунтайм только если меняется версия образа postgres.

---

## Стратегии уменьшения даунтайма

### Уровень 1 — минимизация (текущая инфраструктура)

Разделить build и restart:

```bash
# Собрать образы заранее (сайт работает)
docker compose build

# Перезапустить по одному (минимальное окно)
docker compose up -d --no-deps backend
# Подождать пока backend встанет:
until docker compose exec backend wget -qO- http://localhost:3001/api/health; do sleep 1; done

docker compose up -d --no-deps frontend
```

Сокращает окно до ~5 сек на сервис вместо суммарного.

### Уровень 2 — near-zero downtime (Docker Compose + proxy)

Запуск нового контейнера на другом порту → health check → переключение трафика → остановка старого:

```bash
# Поднять новый backend на порту 3012 (вместо 3011)
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d backend-new
# Дождаться health
# Переключить Caddy/nginx upstream на 3012
# Остановить старый
docker compose stop backend
```

Усложняет деплой, но даёт ~0 downtime. Требует отдельный compose-файл для blue-green.

### Уровень 3 — zero downtime (другой оркестратор)

**Docker Swarm:**
```yaml
# docker-compose.yml (swarm mode)
services:
  backend:
    deploy:
      update_config:
        order: start-first        # новый контейнер стартует ДО остановки старого
        failure_action: rollback
      rollback_config:
        order: stop-first
```
`docker stack deploy` с `start-first` — новый контейнер запускается, проходит health check, затем старый останавливается. Zero downtime из коробки.

**Kubernetes:**
Rolling update — нативная стратегия. `maxSurge: 1, maxUnavailable: 0` гарантирует, что новый pod ready до удаления старого.

---

## Влияние на внешние интеграции

| Интеграция | Переживает ~20 сек downtime? | Почему |
|---|---|---|
| AppsFlyer Push API | ✅ | Retry-ит на non-2xx, наш webhook всегда 200 после восстановления |
| Stripe Webhooks | ✅ | Retry-ит с exponential backoff (до 3 дней), идемпотентность через `processed_webhook_events` |
| Client track API (HMAC) | ⚠️ | Клиент получит connection refused; если у него retry — ОК; если нет — конверсия потеряна (idempotency ключ поможет при повторе) |
| Браузерные сессии | ⚠️ | Текущие страницы покажут network error; после refresh — ОК |

---

## Рекомендация

Для текущего масштаба (единицы-десятки пользователей) 10-20 секунд downtime на деплое **приемлемо**. Стоит озаботиться zero-downtime когда:

- Появляются SLA / uptime commitments.
- Деплоите чаще 1 раза в день.
- Есть mission-critical webhook-потоки, которые не переживут перерыв (для AppsFlyer и Stripe — не проблема, они retry-ят).
- Количество пользователей делает 20-секундный перерыв заметным (десятки одновременных сессий).

**Минимальное улучшение прямо сейчас**: использовать `docker compose build` + `docker compose up -d --no-deps backend && sleep 5 && docker compose up -d --no-deps frontend` вместо `docker compose up -d --build`. Это не zero-downtime, но сокращает окно и делает его более предсказуемым.
