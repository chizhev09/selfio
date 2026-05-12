# Хеширование паролей и выпуск/проверка JWT (access и refresh).
import base64
import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Хеширует пароль для хранения в БД."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет пароль против сохранённого хеша."""
    return pwd_context.verify(plain, hashed)


def _now_utc() -> datetime:
    return datetime.now(UTC)


def create_access_token(subject: UUID) -> str:
    """Собирает короткоживущий access JWT с типом access."""
    s = get_settings()
    expire = _now_utc() + timedelta(minutes=s.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def create_refresh_token(subject: UUID, jti: UUID) -> str:
    """Собирает refresh JWT; jti должен совпадать с записью в БД."""
    s = get_settings()
    expire = _now_utc() + timedelta(days=s.refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "jti": str(jti),
        "exp": expire,
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Декодирует JWT; бросает jose.JWTError при неверной подписи или сроке."""
    s = get_settings()
    return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])


def new_jti() -> UUID:
    """Генерирует идентификатор сессии refresh для записи в БД."""
    return uuid4()


def create_yandex_oauth_state_token() -> str:
    """Короткоживущий state для редиректа на Яндекс OAuth (защита от CSRF)."""
    s = get_settings()
    expire = _now_utc() + timedelta(minutes=10)
    payload: dict[str, Any] = {"type": "oauth_yandex", "exp": expire}
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def verify_yandex_oauth_state_token(state: str) -> None:
    """Проверяет state из callback Яндекса; бросает JWTError при ошибке."""
    payload = decode_token(state)
    if payload.get("type") != "oauth_yandex":
        raise JWTError()


def create_google_oauth_state_token() -> str:
    """Короткоживущий state для редиректа на Google OAuth (защита от CSRF)."""
    s = get_settings()
    expire = _now_utc() + timedelta(minutes=10)
    payload: dict[str, Any] = {"type": "oauth_google", "exp": expire}
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def verify_google_oauth_state_token(state: str) -> None:
    """Проверяет state из callback Google; бросает JWTError при ошибке."""
    payload = decode_token(state)
    if payload.get("type") != "oauth_google":
        raise JWTError()


_VKID_STATE_EXP_DIGITS = 12
_VKID_STATE_VERIFIER_LEN = 64
_VKID_STATE_SIG_LEN = 43  # base64url(SHA256), без padding


def _vkid_state_hmac_sig(exp_digits: str, verifier: str) -> str:
    """Считает подпись для state VK ID (сырой секрет — jwt_secret)."""
    s = get_settings()
    msg = f"{exp_digits}{verifier}".encode("utf-8")
    key = s.jwt_secret.encode("utf-8")
    digest = hmac.new(key, msg, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def create_vk_id_oauth_state_token(code_verifier: str) -> str:
    """Формирует state для VK ID: только символы a-z A-Z 0-9 _ - и длина ≥32 (требование id.vk.ru); внутри — PKCE verifier и срок, без JWT с точками."""
    if len(code_verifier) != _VKID_STATE_VERIFIER_LEN:
        raise ValueError("VK ID state: code_verifier must be 64 characters")
    expire = _now_utc() + timedelta(minutes=10)
    exp_digits = f"{int(expire.timestamp()):012d}"
    sig = _vkid_state_hmac_sig(exp_digits, code_verifier)
    if len(sig) != _VKID_STATE_SIG_LEN:
        raise RuntimeError("VK ID state: unexpected HMAC base64 length")
    return f"{exp_digits}{code_verifier}{sig}"


def verify_vk_id_oauth_state_token(state: str) -> str:
    """Проверяет state из callback VK ID и возвращает code_verifier для POST oauth2/auth."""
    st = state.strip()
    need = _VKID_STATE_EXP_DIGITS + _VKID_STATE_VERIFIER_LEN + _VKID_STATE_SIG_LEN
    if len(st) != need:
        raise JWTError()
    exp_digits = st[:_VKID_STATE_EXP_DIGITS]
    verifier = st[_VKID_STATE_EXP_DIGITS : _VKID_STATE_EXP_DIGITS + _VKID_STATE_VERIFIER_LEN]
    sig = st[_VKID_STATE_EXP_DIGITS + _VKID_STATE_VERIFIER_LEN :]
    try:
        exp_unix = int(exp_digits, 10)
    except ValueError as e:
        raise JWTError() from e
    now_ts = int(_now_utc().timestamp())
    if exp_unix < now_ts - 120 or exp_unix > now_ts + 720:
        raise JWTError()
    expect = _vkid_state_hmac_sig(exp_digits, verifier)
    if len(expect) != _VKID_STATE_SIG_LEN or not hmac.compare_digest(expect, sig):
        raise JWTError()
    return verifier
