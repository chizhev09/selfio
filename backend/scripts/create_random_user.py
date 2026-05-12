# Одноразовый скрипт: создаёт в БД тестового пользователя со случайным паролем и печатает учётные данные.
from __future__ import annotations

import secrets
import sys
from pathlib import Path

# Запуск из корня backend: python scripts/create_random_user.py
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.user import User


def _sync_database_url() -> str:
    """Скрипт использует синхронный psycopg, не async-драйвер приложения."""
    url = get_settings().database_url
    if "+psycopg_async://" in url:
        return url.replace("+psycopg_async://", "+psycopg://", 1)
    return url


def _random_username() -> str:
    """Собирает валидное имя пользователя (латиница, цифры, подчёркивание)."""
    tail = secrets.token_hex(3)
    return f"dev_{tail}"[:30]


def _random_password() -> str:
    """Генерирует произвольный пароль для локального теста (bcrypt)."""
    return f"Dev1{secrets.token_hex(6)}"


def main() -> None:
    """Создаёт пользователя или сообщает об ошибке БД/уникальности."""
    suffix = secrets.token_hex(3)
    email = f"dev_{suffix}@flowsee.local"
    username = _random_username()
    password = _random_password()

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        is_active=True,
        is_verified=True,
        email_verification_token_hash=None,
        email_verification_expires_at=None,
    )

    engine = create_engine(_sync_database_url(), pool_pre_ping=True)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = Session()
    try:
        db.add(user)
        db.commit()
    except OperationalError as e:
        db.rollback()
        print("Не удалось подключиться к PostgreSQL или база не создана.")
        print("Создайте БД: CREATE DATABASE flowsee; затем alembic upgrade head")
        print("Details (English to avoid console encoding issues):", repr(e))
        raise SystemExit(1) from e
    except IntegrityError:
        db.rollback()
        print("Не удалось создать: конфликт email/username. Запустите скрипт ещё раз.")
        raise SystemExit(1) from None
    finally:
        db.close()
        engine.dispose()

    print("Создан пользователь Flowsee (сохраните данные, пароль больше не покажется):")
    print(f"  email:    {email}")
    print(f"  username: {username}")
    print(f"  password: {password}")


if __name__ == "__main__":
    main()
