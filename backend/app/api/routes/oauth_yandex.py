# OAuth 2.0 Яндекс: старт, callback и обмен одноразового кода на JWT (асинхронно).
import asyncio
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.balance.constants import REGISTRATION_BONUS_TOKENS
from app.core.config import get_settings
from app.core.security import create_yandex_oauth_state_token, verify_yandex_oauth_state_token
from app.db.session import get_db
from app.models.oauth_account import OAuthAccount
from app.models.oauth_exchange_code import OAuthExchangeCode
from app.models.user import User
from app.schemas.auth import OAuthExchangeRequest, TokenPairResponse
from app.S3_storage.user_folders import ensure_user_s3_folders
from app.services.tokens import issue_token_pair

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

YANDEX_AUTHORIZE = "https://oauth.yandex.ru/authorize"
YANDEX_TOKEN = "https://oauth.yandex.ru/token"
YANDEX_INFO = "https://login.yandex.ru/info"
PROVIDER = "yandex"


def _redirect_frontend(params: dict[str, str]) -> RedirectResponse:
    """Редирект на страницу фронта с query-параметрами."""
    s = get_settings()
    base = s.frontend_oauth_callback_url.strip().rstrip("/")
    q = urlencode(params)
    return RedirectResponse(f"{base}?{q}", status_code=302)


def _normalize_username_base(login: str | None, yandex_id: str) -> str:
    """Готовит базовое имя пользователя из логина Яндекса или id."""
    raw = re.sub(r"[^a-zA-Z0-9_]", "_", (login or "").strip())
    raw = raw.strip("_")
    if len(raw) < 3:
        digits = re.sub(r"\D", "", yandex_id) or yandex_id.replace("-", "")[:12] or "user"
        raw = f"ya_{digits}"
    return raw[:30]


async def _allocate_username(db: AsyncSession, base: str) -> str:
    """Подбирает уникальное имя в пределах 30 символов."""
    candidate = base[:30]
    if len(candidate) < 3:
        candidate = (candidate + "___")[:30]
    n = 2
    while True:
        exists = (await db.execute(select(User.id).where(User.username == candidate))).first()
        if not exists:
            return candidate
        suffix = f"_{n}"
        candidate = (base[: 30 - len(suffix)] + suffix)[:30]
        n += 1


def _resolve_yandex_email(login: str | None, default_email: str | None) -> str:
    """Определяет email для учётной записи Flowsee."""
    email = (default_email or "").strip().lower()
    if email:
        return email
    if login:
        lg = login.strip()
        if "@" in lg:
            return lg.lower()
        return f"{lg}@yandex.ru".lower()
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Яндекс не вернул адрес почты. Укажите почту в аккаунте Яндекса.",
    )


async def _find_or_create_yandex_user(
    db: AsyncSession,
    yandex_id: str,
    login: str | None,
    default_email: str | None,
) -> User:
    """Находит или создаёт пользователя по связке Яндекс и при необходимости по email."""
    stmt_oauth = select(OAuthAccount).where(
        OAuthAccount.provider == PROVIDER,
        OAuthAccount.provider_user_id == yandex_id,
    )
    oauth_row = (await db.execute(stmt_oauth)).scalar_one_or_none()
    if oauth_row is not None:
        user = await db.get(User, oauth_row.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт недоступен.")
        return user

    email = _resolve_yandex_email(login, default_email)
    stmt_user = select(User).where(User.email == email)
    existing = (await db.execute(stmt_user)).scalar_one_or_none()
    if existing is not None:
        if not existing.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт отключён.")
        link = OAuthAccount(
            user_id=existing.id,
            provider=PROVIDER,
            provider_user_id=yandex_id,
        )
        db.add(link)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Не удалось привязать Яндекс к аккаунту.",
            ) from None
        await db.refresh(existing)
        return existing

    base_user = _normalize_username_base(login, yandex_id)
    username = await _allocate_username(db, base_user)
    user = User(
        email=email,
        username=username,
        hashed_password=None,
        is_active=True,
        is_verified=True,
        email_verification_token_hash=None,
        email_verification_expires_at=None,
        balance=REGISTRATION_BONUS_TOKENS,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Конфликт при создании пользователя.",
        ) from None

    link = OAuthAccount(user_id=user.id, provider=PROVIDER, provider_user_id=yandex_id)
    db.add(link)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось сохранить привязку Яндекса.",
        ) from None
    await db.refresh(user)

    await asyncio.to_thread(ensure_user_s3_folders, user.id)

    return user


@router.get("/yandex/start")
def yandex_oauth_start() -> RedirectResponse:
    """Редирект на страницу авторизации Яндекса."""
    s = get_settings()
    if not s.yandex_oauth_client_id or not s.yandex_oauth_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth Яндекса не настроен (YANDEX_OAUTH_CLIENT_ID / SECRET).",
        )
    state = create_yandex_oauth_state_token()
    params = {
        "response_type": "code",
        "client_id": s.yandex_oauth_client_id,
        "redirect_uri": s.yandex_oauth_redirect_uri,
        "state": state,
    }
    url = f"{YANDEX_AUTHORIZE}?{urlencode(params)}"
    return RedirectResponse(url, status_code=302)


@router.get("/yandex/callback")
async def yandex_oauth_callback(
    db: Annotated[AsyncSession, Depends(get_db)],
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    """Приём code от Яндекса, обмен на токен, создание сессии и редирект на фронт с одноразовым code."""
    if error:
        return _redirect_frontend({"error": "yandex", "message": error})
    if not code or not state:
        return _redirect_frontend({"error": "missing_params"})
    try:
        verify_yandex_oauth_state_token(state)
    except JWTError:
        return _redirect_frontend({"error": "invalid_state"})

    s = get_settings()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            token_res = await client.post(
                YANDEX_TOKEN,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": s.yandex_oauth_client_id,
                    "client_secret": s.yandex_oauth_client_secret,
                },
            )
            if token_res.status_code != 200:
                return _redirect_frontend({"error": "token_exchange"})
            token_json = token_res.json()
            access = token_json.get("access_token")
            if not access:
                return _redirect_frontend({"error": "no_access_token"})

            info_res = await client.get(
                YANDEX_INFO,
                headers={"Authorization": f"OAuth {access}"},
            )
            if info_res.status_code != 200:
                return _redirect_frontend({"error": "profile"})
            profile = info_res.json()
    except httpx.HTTPError:
        return _redirect_frontend({"error": "network"})

    yandex_id = str(profile.get("id", "")).strip()
    if not yandex_id:
        return _redirect_frontend({"error": "no_user_id"})

    login = profile.get("login")
    if isinstance(login, str):
        login = login.strip() or None
    else:
        login = None
    default_email = profile.get("default_email")
    if isinstance(default_email, str):
        default_email = default_email.strip() or None
    else:
        default_email = None

    try:
        user = await _find_or_create_yandex_user(db, yandex_id, login, default_email)
    except HTTPException as e:
        return _redirect_frontend({"error": "user", "message": str(e.detail)})

    opaque = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=5)
    row = OAuthExchangeCode(code=opaque, user_id=user.id, expires_at=expires_at)
    db.add(row)
    await db.commit()

    return _redirect_frontend({"code": opaque})


@router.post("/exchange", response_model=TokenPairResponse)
async def oauth_exchange_code(
    body: OAuthExchangeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPairResponse:
    """Обменивает одноразовый code из URL на пару JWT (фронт после Яндекса / Google / VK ID)."""
    row = (
        await db.execute(select(OAuthExchangeCode).where(OAuthExchangeCode.code == body.code))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или уже использованный код.",
        )
    if row.expires_at < datetime.now(UTC):
        await db.execute(delete(OAuthExchangeCode).where(OAuthExchangeCode.id == row.id))
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Срок действия кода истёк. Войдите снова.",
        )
    user = await db.get(User, row.user_id)
    await db.execute(delete(OAuthExchangeCode).where(OAuthExchangeCode.id == row.id))
    await db.commit()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь недоступен.")
    return await issue_token_pair(db, user)
