# OAuth 2.0 Google: старт, callback и одноразовый code → JWT через общий /exchange.
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
from app.core.security import create_google_oauth_state_token, verify_google_oauth_state_token
from app.db.session import get_db
from app.models.oauth_account import OAuthAccount
from app.models.oauth_exchange_code import OAuthExchangeCode
from app.models.user import User
from app.S3_storage.user_folders import ensure_user_s3_folders

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo"
PROVIDER = "google"
GOOGLE_SCOPES = "openid email profile"


def _redirect_frontend(params: dict[str, str]) -> RedirectResponse:
    s = get_settings()
    base = s.frontend_oauth_callback_url.strip().rstrip("/")
    q = urlencode(params)
    return RedirectResponse(f"{base}?{q}", status_code=302)


def _normalize_username_from_email(email: str, google_sub: str) -> str:
    local = (email.split("@", maxsplit=1)[0] if "@" in email else email).strip()
    raw = re.sub(r"[^a-zA-Z0-9_]", "_", local)
    raw = raw.strip("_")
    if len(raw) < 3:
        digits = re.sub(r"\D", "", google_sub) or google_sub.replace("-", "")[:12] or "user"
        raw = f"gg_{digits}"[:30]
    return raw[:30]


async def _allocate_username(db: AsyncSession, base: str) -> str:
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


async def _find_or_create_google_user(
    db: AsyncSession,
    google_sub: str,
    email: str | None,
    full_name: str | None,
) -> User:
    stmt_oauth = select(OAuthAccount).where(
        OAuthAccount.provider == PROVIDER,
        OAuthAccount.provider_user_id == google_sub,
    )
    oauth_row = (await db.execute(stmt_oauth)).scalar_one_or_none()
    if oauth_row is not None:
        user = await db.get(User, oauth_row.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт недоступен.")
        return user

    em = (email or "").strip().lower()
    if not em:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google не вернул адрес почты. Разрешите доступ к email в настройках приложения Google.",
        )

    stmt_user = select(User).where(User.email == em)
    existing = (await db.execute(stmt_user)).scalar_one_or_none()
    if existing is not None:
        if not existing.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт отключён.")
        link = OAuthAccount(
            user_id=existing.id,
            provider=PROVIDER,
            provider_user_id=google_sub,
        )
        db.add(link)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Не удалось привязать Google к аккаунту.",
            ) from None
        await db.refresh(existing)
        return existing

    hint = full_name.strip() if isinstance(full_name, str) and full_name.strip() else None
    base_user = _normalize_username_from_email(em, google_sub)
    if hint:
        base_from_name = re.sub(r"[^a-zA-Z0-9_]", "_", hint.strip())[:30]
        if len(base_from_name) >= 3:
            base_user = base_from_name[:30]

    username = await _allocate_username(db, base_user)
    user = User(
        email=em,
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

    link = OAuthAccount(user_id=user.id, provider=PROVIDER, provider_user_id=google_sub)
    db.add(link)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось сохранить привязку Google.",
        ) from None
    await db.refresh(user)

    await asyncio.to_thread(ensure_user_s3_folders, user.id)

    return user


@router.get("/google/start")
def google_oauth_start() -> RedirectResponse:
    """Редирект на страницу входа Google."""
    s = get_settings()
    if not s.google_oauth_client_id or not s.google_oauth_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth Google не настроен (GOOGLE_OAUTH_CLIENT_ID / SECRET).",
        )
    state = create_google_oauth_state_token()
    params = {
        "client_id": s.google_oauth_client_id,
        "redirect_uri": s.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "state": state,
        "access_type": "online",
        "include_granted_scopes": "true",
    }
    url = f"{GOOGLE_AUTHORIZE}?{urlencode(params)}"
    return RedirectResponse(url, status_code=302)


@router.get("/google/callback")
async def google_oauth_callback(
    db: Annotated[AsyncSession, Depends(get_db)],
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    """Приём code от Google, обмен на JWT-сессию через одноразовый opaque code для фронта."""
    if error:
        return _redirect_frontend({"error": "google", "message": error})
    if not code or not state:
        return _redirect_frontend({"error": "missing_params"})
    try:
        verify_google_oauth_state_token(state)
    except JWTError:
        return _redirect_frontend({"error": "invalid_state"})

    s = get_settings()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            token_res = await client.post(
                GOOGLE_TOKEN,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": s.google_oauth_redirect_uri,
                    "client_id": s.google_oauth_client_id,
                    "client_secret": s.google_oauth_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_res.status_code != 200:
                return _redirect_frontend({"error": "token_exchange"})
            token_json = token_res.json()
            access = token_json.get("access_token")
            if not access:
                return _redirect_frontend({"error": "no_access_token"})

            info_res = await client.get(
                GOOGLE_USERINFO,
                headers={"Authorization": f"Bearer {access}"},
            )
            if info_res.status_code != 200:
                return _redirect_frontend({"error": "profile"})
            profile = info_res.json()
    except httpx.HTTPError:
        return _redirect_frontend({"error": "network"})

    google_sub = str(profile.get("sub", "")).strip()
    if not google_sub:
        return _redirect_frontend({"error": "no_user_id"})

    email = profile.get("email")
    if isinstance(email, str):
        email = email.strip() or None
    else:
        email = None

    name = profile.get("name")
    if isinstance(name, str):
        name = name.strip() or None
    else:
        name = None

    try:
        user = await _find_or_create_google_user(db, google_sub, email, name)
    except HTTPException as e:
        d = e.detail
        msg = d if isinstance(d, str) else str(d)
        return _redirect_frontend({"error": "user", "message": msg})

    opaque = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(minutes=5)
    row = OAuthExchangeCode(code=opaque, user_id=user.id, expires_at=expires_at)
    db.add(row)
    await db.commit()

    return _redirect_frontend({"code": opaque})
