# OAuth VK ID (id.vk.ru): единый вход ВКонтакте и Mail — PKCE, callback с payload, обмен кода и общий /exchange.
# Документация: https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/auth-without-sdk/auth-without-sdk-web
import asyncio
import base64
import binascii
import hashlib
import json
import re
import secrets
import string
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Mapping
from urllib.parse import unquote, urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.balance.constants import REGISTRATION_BONUS_TOKENS
from app.core.config import get_settings
from app.core.security import create_vk_id_oauth_state_token, verify_vk_id_oauth_state_token
from app.db.session import get_db
from app.models.oauth_account import OAuthAccount
from app.models.oauth_exchange_code import OAuthExchangeCode
from app.models.user import User
from app.S3_storage.user_folders import ensure_user_s3_folders

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

VK_ID_AUTHORIZE = "https://id.vk.ru/authorize"
VK_ID_TOKEN = "https://id.vk.ru/oauth2/auth"
VK_ID_USER_INFO = "https://id.vk.ru/oauth2/user_info"
PROVIDER = "vk_id"
VK_ID_SCOPES = "vkid.personal_info email"

_PKCE_CHARS = string.ascii_letters + string.digits + "_-"


def _new_pkce_verifier() -> str:
    """RFC 7636: длина 43–128, символы a-z A-Z 0-9 _ - (требования VK ID)."""
    return "".join(secrets.choice(_PKCE_CHARS) for _ in range(64))


def _pkce_s256_challenge(verifier: str) -> str:
    """S256 code_challenge для PKCE (VK ID)."""
    dig = hashlib.sha256(verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(dig).decode("ascii").rstrip("=")


def _redirect_frontend(params: dict[str, str]) -> RedirectResponse:
    """Редирект на фронт с query-параметрами (opaque code или ошибка)."""
    s = get_settings()
    base = s.frontend_oauth_callback_url.strip().rstrip("/")
    q = urlencode(params)
    return RedirectResponse(f"{base}?{q}", status_code=302)


def _parse_callback_payload(q: Mapping[str, str]) -> dict[str, Any] | None:
    """Достаёт JSON из query: параметр payload (VK ID) или плоские code/state/device_id."""
    raw_payload = q.get("payload")
    if raw_payload:
        for candidate in (raw_payload, unquote(raw_payload)):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
        try:
            pad = "=" * (-len(raw_payload) % 4)
            decoded = base64.urlsafe_b64decode(raw_payload + pad).decode("utf-8")
            return json.loads(decoded)
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError, binascii.Error):
            return None
    code = q.get("code")
    st = q.get("state")
    if code and st:
        return {
            "code": code,
            "state": st,
            "device_id": q.get("device_id") or "",
            "type": "code_v2",
        }
    return None


def _normalize_username_from_email(email: str, sub: str) -> str:
    """Готовит базовое имя пользователя из email или id VK ID."""
    local = (email.split("@", maxsplit=1)[0] if "@" in email else email).strip()
    raw = re.sub(r"[^a-zA-Z0-9_]", "_", local)
    raw = raw.strip("_")
    if len(raw) < 3:
        digits = re.sub(r"\D", "", sub) or sub.replace("-", "")[:12] or "user"
        raw = f"vkid_{digits}"[:30]
    return raw[:30]


async def _allocate_username(db: AsyncSession, base: str) -> str:
    """Подбирает уникальное имя пользователя (до 30 символов)."""
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


def _vk_id_placeholder_email(user_id: str) -> str:
    """Технический email, если VK ID не выдал почту в user_info."""
    return f"vkid_user_{user_id}@oauth.vkid.selfio.local"


async def _find_or_create_vk_id_user(
    db: AsyncSession,
    vk_id_sub: str,
    email: str | None,
    full_name: str | None,
) -> User:
    """Ищет пользователя по привязке vk_id или по email; иначе создаёт учётную запись."""
    stmt_oauth = select(OAuthAccount).where(
        OAuthAccount.provider == PROVIDER,
        OAuthAccount.provider_user_id == vk_id_sub,
    )
    oauth_row = (await db.execute(stmt_oauth)).scalar_one_or_none()
    if oauth_row is not None:
        user = await db.get(User, oauth_row.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт недоступен.")
        return user

    em = (email or "").strip().lower() or _vk_id_placeholder_email(vk_id_sub)

    stmt_user = select(User).where(User.email == em)
    existing = (await db.execute(stmt_user)).scalar_one_or_none()
    if existing is not None:
        if not existing.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт отключён.")
        link = OAuthAccount(
            user_id=existing.id,
            provider=PROVIDER,
            provider_user_id=vk_id_sub,
        )
        db.add(link)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Не удалось привязать VK ID к аккаунту.",
            ) from None
        await db.refresh(existing)
        return existing

    hint = full_name.strip() if isinstance(full_name, str) and full_name.strip() else None
    base_user = _normalize_username_from_email(em, vk_id_sub)
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

    link = OAuthAccount(user_id=user.id, provider=PROVIDER, provider_user_id=vk_id_sub)
    db.add(link)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось сохранить привязку VK ID.",
        ) from None
    await db.refresh(user)

    await asyncio.to_thread(ensure_user_s3_folders, user.id)

    return user


@router.get("/vkid/start")
def vk_id_oauth_start() -> RedirectResponse:
    """Редирект на страницу авторизации VK ID (PKCE + state в JWT)."""
    s = get_settings()
    if not s.vk_id_oauth_client_id.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="VK ID не настроен (VK_ID_OAUTH_CLIENT_ID).",
        )
    verifier = _new_pkce_verifier()
    state_token = create_vk_id_oauth_state_token(verifier)
    challenge = _pkce_s256_challenge(verifier)
    params = {
        "response_type": "code",
        "client_id": s.vk_id_oauth_client_id.strip(),
        "redirect_uri": s.vk_id_oauth_redirect_uri,
        "scope": VK_ID_SCOPES,
        "state": state_token,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "lang_id": "0",
    }
    url = f"{VK_ID_AUTHORIZE}?{urlencode(params)}"
    return RedirectResponse(url, status_code=302)


@router.get("/vkid/callback")
async def vk_id_oauth_callback(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    error: Annotated[str | None, Query()] = None,
    error_description: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    """Приём ответа VK ID (payload или ошибка), обмен code на токены и выдача opaque code фронту."""
    if error:
        msg = (error_description or error).strip()
        return _redirect_frontend({"error": "vkid", "message": msg or error})

    q = dict(request.query_params)
    inner = _parse_callback_payload(q)
    if inner is None:
        return _redirect_frontend({"error": "missing_params"})

    code = inner.get("code")
    state_raw = inner.get("state")
    device_id = inner.get("device_id")
    if not isinstance(code, str) or not code.strip():
        return _redirect_frontend({"error": "missing_params"})
    if not isinstance(state_raw, str) or not state_raw.strip():
        return _redirect_frontend({"error": "missing_params"})
    if not isinstance(device_id, str) or not device_id.strip():
        return _redirect_frontend({"error": "missing_device_id"})

    try:
        code_verifier = verify_vk_id_oauth_state_token(state_raw.strip())
    except JWTError:
        return _redirect_frontend({"error": "invalid_state"})

    s = get_settings()
    cid = s.vk_id_oauth_client_id.strip()
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            token_res = await client.post(
                VK_ID_TOKEN,
                data={
                    "grant_type": "authorization_code",
                    "code": code.strip(),
                    "code_verifier": code_verifier,
                    "redirect_uri": s.vk_id_oauth_redirect_uri,
                    "client_id": cid,
                    "device_id": device_id.strip(),
                    "state": state_raw.strip(),
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if token_res.status_code != 200:
                return _redirect_frontend({"error": "token_exchange"})
            token_json: dict[str, Any] = token_res.json()
            if token_json.get("error"):
                ed = token_json.get("error_description")
                return _redirect_frontend(
                    {"error": "token_exchange", "message": str(ed) if ed else str(token_json.get("error"))}
                )
            access = token_json.get("access_token")
            if not access or not isinstance(access, str):
                return _redirect_frontend({"error": "no_access_token"})

            info_res = await client.post(
                VK_ID_USER_INFO,
                data={"access_token": access, "client_id": cid},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if info_res.status_code != 200:
                return _redirect_frontend({"error": "profile"})
            info_json: dict[str, Any] = info_res.json()
            if info_json.get("error"):
                return _redirect_frontend({"error": "profile"})
            user_obj = info_json.get("user")
            if not isinstance(user_obj, dict):
                return _redirect_frontend({"error": "profile"})
    except httpx.HTTPError:
        return _redirect_frontend({"error": "network"})

    uid = str(user_obj.get("user_id", "")).strip()
    if not uid:
        return _redirect_frontend({"error": "no_user_id"})

    em_raw = user_obj.get("email")
    email = em_raw.strip().lower() if isinstance(em_raw, str) and em_raw.strip() else None

    fn = user_obj.get("first_name")
    ln = user_obj.get("last_name")
    parts = [p for p in (fn, ln) if isinstance(p, str) and p.strip()]
    full_name = " ".join(parts) if parts else None

    try:
        user = await _find_or_create_vk_id_user(db, uid, email, full_name)
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
