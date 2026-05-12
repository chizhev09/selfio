# Загрузка настроек: .env всегда из папки backend (не зависит от cwd процесса).
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from typing import Any

from urllib.parse import urlparse

from dotenv import load_dotenv
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py → parents[2] == backend/
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"

# Сначала вносим пары KEY=value в os.environ — так работают и pydantic-settings, и boto3.
load_dotenv(_ENV_FILE, encoding="utf-8-sig")


class Settings(BaseSettings):
    """Настройки из os.environ (в т.ч. после load_dotenv с абсолютным путём к .env)."""

    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=_ENV_FILE,
        env_file_encoding="utf-8-sig",
    )

    @model_validator(mode="before")
    @classmethod
    def _timeweb_s3_keys_from_env(cls, data: Any) -> Any:
        """Подставляет S3-поля по точным именам из .env Timeweb (BUCKET_NAME, S3_ACCESS_KEY, …)."""
        if not isinstance(data, dict):
            return data
        out = dict(data)
        pairs = (
            ("bucket_name", "BUCKET_NAME"),
            ("s3_access_key", "S3_ACCESS_KEY"),
            ("s3_secret_access_key", "S3_SECRET_ACCESS_KEY"),
            ("s3_endpoint_url", "S3_ENDPOINT_URL"),
            ("s3_region", "S3_REGION"),
        )
        for field, env_key in pairs:
            raw = out.get(field)
            cur = "" if raw is None else str(raw).strip()
            if cur:
                continue
            val = os.getenv(env_key)
            if val is not None and str(val).strip():
                out[field] = str(val).strip()
        return out

    database_url: str = "postgresql+psycopg_async://postgres:postgres@127.0.0.1:5432/selfio"

    @field_validator("database_url", mode="before")
    @classmethod
    def _coerce_postgres_to_async_driver(cls, v: object) -> object:
        """Подменяет синхронный psycopg на async-драйвер для create_async_engine (старый .env всё ещё работает)."""
        if (
            isinstance(v, str)
            and v.startswith("postgresql+psycopg://")
            and not v.startswith("postgresql+psycopg_async://")
        ):
            return v.replace("postgresql+psycopg://", "postgresql+psycopg_async://", 1)
        return v
    jwt_secret: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:5173"
    debug: bool = False
    yandex_oauth_client_id: str = ""
    yandex_oauth_client_secret: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    vk_id_oauth_client_id: str = ""
    public_api_base: str = "http://127.0.0.1:8000"
    frontend_oauth_callback_url: str = "http://localhost:5173/oauth/callback"
    admin_password: str = ""

    # Timeweb: см. https://timeweb.cloud/docs/s3-storage/sdk/python
    # Панель часто: BUCKET_NAME, S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY, S3_ENDPOINT_URL, S3_REGION.
    # В доке boto3 также: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, endpoint https://s3.twcstorage.ru
    s3_endpoint_url: str = "https://s3.twcstorage.ru"
    s3_region: str = "ru-1"
    bucket_name: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_access_key: str = ""
    s3_secret_key: str = ""
    s3_public_base_url: str = ""
    openrouter_api_key: str = ""

    # ЮMoney (физлицо): https://yoomoney.ru/docs/payment-buttons/using-api/forms — quickpay; HTTP-уведомления в кошельке.
    yoomoney_receiver: str = ""
    yoomoney_http_notification_secret: str = ""
    yoomoney_payment_targets: str = "Пополнение баланса токенов Selfio"
    yoomoney_payment_type: str = "AC"
    yoomoney_quickpay_base_url: str = "https://yoomoney.ru/quickpay/confirm.xml"
    # Прод: полный successURL для quickpay (редирект пользователя после оплаты). Пусто — FRONTEND_APP_URL + /app/profile?payment=ok
    yoomoney_success_return_url: str = ""
    # Прод: база URL, на которой доступен POST webhook (если отличается от PUBLIC_API_BASE). Пусто — PUBLIC_API_BASE.
    yoomoney_webhook_base_url: str = ""
    # База фронта для success после оплаты ЮMoney, если YOOMONEY_SUCCESS_RETURN_URL не задан (например http://localhost:5173). Пусто — из FRONTEND_OAUTH_CALLBACK_URL.
    frontend_app_url: str = ""

    def resolve_s3_bucket(self) -> str:
        """Имя бакета: BUCKET_NAME / S3_BUCKET."""
        return (
            (self.bucket_name or self.s3_bucket).strip()
            or os.getenv("BUCKET_NAME", "").strip()
            or os.getenv("S3_BUCKET", "").strip()
        )

    def resolve_s3_access_key(self) -> str:
        """Ключ доступа: S3_ACCESS_KEY или AWS_ACCESS_KEY_ID."""
        return (
            self.s3_access_key.strip()
            or os.getenv("S3_ACCESS_KEY", "").strip()
            or os.getenv("AWS_ACCESS_KEY_ID", "").strip()
        )

    def resolve_s3_secret(self) -> str:
        """Секрет: S3_SECRET_ACCESS_KEY / S3_SECRET_KEY / AWS_SECRET_ACCESS_KEY."""
        return (
            (self.s3_secret_access_key or self.s3_secret_key).strip()
            or os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
            or os.getenv("S3_SECRET_KEY", "").strip()
            or os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
        )

    def resolve_s3_endpoint(self) -> str:
        """Endpoint API S3 (Timeweb: обычно https://s3.twcstorage.ru)."""
        u = self.s3_endpoint_url.strip().rstrip("/")
        if u:
            return u
        return (
            os.getenv("S3_ENDPOINT_URL", "").strip().rstrip("/")
            or os.getenv("AWS_ENDPOINT_URL", "").strip().rstrip("/")
            or "https://s3.twcstorage.ru"
        )

    def resolve_s3_region(self) -> str:
        """Регион для подписи запросов."""
        r = self.s3_region.strip()
        if r:
            return r
        return (
            os.getenv("S3_REGION", "").strip()
            or os.getenv("AWS_DEFAULT_REGION", "").strip()
            or "ru-1"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def yandex_oauth_redirect_uri(self) -> str:
        return f"{self.public_api_base.rstrip('/')}/api/auth/oauth/yandex/callback"

    @property
    def google_oauth_redirect_uri(self) -> str:
        return f"{self.public_api_base.rstrip('/')}/api/auth/oauth/google/callback"

    @property
    def vk_id_oauth_redirect_uri(self) -> str:
        return f"{self.public_api_base.rstrip('/')}/api/auth/oauth/vkid/callback"

    def resolve_frontend_app_url(self) -> str:
        """Возвращает origin фронта для successURL после оплаты ЮMoney (без завершающего слэша)."""
        u = self.frontend_app_url.strip().rstrip("/")
        if u:
            return u
        parsed = urlparse(self.frontend_oauth_callback_url.strip())
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        return "http://localhost:5173"

    def resolve_yoomoney_success_return_url(self) -> str:
        """Возвращает полный successURL для редиректа с ЮMoney после оплаты (отдельно от OAuth-URL фронта)."""
        direct = self.yoomoney_success_return_url.strip()
        if direct:
            return direct
        return f"{self.resolve_frontend_app_url().rstrip('/')}/app/profile?payment=ok"

    @property
    def yoomoney_webhook_absolute_url(self) -> str:
        """Полный URL вебхука для кабинета ЮMoney (скопировать в HTTP-уведомления)."""
        base = (self.yoomoney_webhook_base_url.strip() or self.public_api_base.strip()).rstrip("/")
        return f"{base}/api/payments/yoomoney/webhook"

    def yoomoney_payments_configured(self) -> bool:
        """Проверяет, заданы ли номер кошелька и секрет HTTP-уведомлений для приёма через ЮMoney."""
        return bool(self.yoomoney_receiver.strip() and self.yoomoney_http_notification_secret.strip())

    def resolve_library_browser_base_url(self) -> str:
        """Публичная база для статических URL карточек библиотеки (суффикс …/S3_selfio/library), как на фронте при VITE_S3_*."""
        default_fallback = "https://flowsee-library.s3.eu-central-1.amazonaws.com"
        from_env = (self.s3_public_base_url or "").strip().rstrip("/")
        endpoint = (from_env or self.resolve_s3_endpoint() or default_fallback).rstrip("/")
        bucket = self.resolve_s3_bucket()
        if (
            bucket
            and "s3.twcstorage.ru" in endpoint
            and not endpoint.endswith(f"/{bucket}")
            and f"://{bucket}." not in endpoint
        ):
            endpoint = f"{endpoint}/{bucket}"
        if endpoint.endswith("/S3_selfio/library"):
            return endpoint
        return f"{endpoint}/S3_selfio/library"


@lru_cache
def get_settings() -> Settings:
    return Settings()
