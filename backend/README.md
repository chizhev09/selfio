# Selfio API (FastAPI)

Бэкенд: регистрация, JWT access/refresh, профиль `/api/users/me`, админка `/api/admin/…`.

## Требования

- Python 3.11+
- **PostgreSQL** (локально или на Timeweb; строка подключения в `DATABASE_URL`)

## Быстрый старт (локально)

Создайте базу при необходимости:

```sql
CREATE DATABASE selfio;
```

Скопируйте `backend/.env.example` в `backend/.env`, задайте `DATABASE_URL` и сильный `JWT_SECRET`.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI: http://127.0.0.1:8000/docs

Фронт в dev: `npm run dev` в `frontend/` — Vite проксирует `/api` на порт 8000.

## Деплой: один сервер Timeweb, домен selfio.ru

1. Соберите фронт: `cd frontend && npm ci && npm run build` (при необходимости задайте `VITE_S3_*` из `frontend/.env.example`).
2. На VPS: PostgreSQL, `.env` из `backend/.env.example` с **прод**-блоком (`PUBLIC_API_BASE=https://selfio.ru`, `CORS_ORIGINS`, OAuth-URL и т.д.).
3. `alembic upgrade head`, затем `uvicorn app.main:app --host 127.0.0.1 --port 8000` (или через systemd/gunicorn).
4. Nginx: пример в `deploy/timeweb/nginx-selfio.conf` — статика из `dist`, `location /api/` → прокси на uvicorn. ЮMoney webhook: `https://selfio.ru/api/payments/yoomoney/webhook`.

## Переменные окружения

Полный список и комментарии — в `backend/.env.example`. Кратко:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | `postgresql+psycopg_async://…`; Alembic подменяет на синхронный `psycopg` |
| `JWT_SECRET` | Секрет подписи JWT |
| `PUBLIC_API_BASE` | Публичный HTTPS-URL API (для OAuth redirect и внешних ссылок) |
| `CORS_ORIGINS` | Origins фронта через запятую |
| `DEBUG` | `false` на проде |
