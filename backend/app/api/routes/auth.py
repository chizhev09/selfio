# Маршруты регистрации, входа, refresh, logout и подтверждения email (асинхронные).
import asyncio
import hashlib
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.balance.constants import REGISTRATION_BONUS_TOKENS
from app.core.security import decode_token, hash_password, verify_password
from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenPairResponse,
    UserPublicNested,
    VerifyEmailRequest,
)
from app.S3_storage.user_folders import ensure_user_s3_folders
from app.services.tokens import issue_token_pair

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_verification_token(token: str) -> str:
    """Хеширует одноразовый токен верификации для хранения в БД."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    """Создаёт пользователя с почтой и паролем сразу как подтверждённого, без писем и токенов верификации."""
    user = User(
        email=body.email.lower().strip(),
        username=body.username.strip(),
        hashed_password=hash_password(body.password),
        is_verified=True,
        email_verification_token_hash=None,
        email_verification_expires_at=None,
        balance=REGISTRATION_BONUS_TOKENS,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email или именем уже существует.",
        ) from None
    await db.refresh(user)

    await asyncio.to_thread(ensure_user_s3_folders, user.id)

    return RegisterResponse(
        user=UserPublicNested.model_validate(user),
        message="Аккаунт создан. Можно войти.",
    )


@router.post("/login", response_model=TokenPairResponse)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPairResponse:
    """Вход по email или username и паролю."""
    login_raw = body.login.strip()
    if "@" in login_raw:
        stmt = select(User).where(User.email == login_raw.lower())
    else:
        stmt = select(User).where(User.username == login_raw)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль.",
        )
    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Для этого аккаунта не задан пароль — вход через Яндекс, Google или VK ID.",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт отключён.")
    return await issue_token_pair(db, user)


async def _get_refresh_session(db: AsyncSession, refresh_token: str) -> tuple[User, RefreshToken]:
    """Проверяет refresh JWT и возвращает пользователя и строку сессии."""
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный refresh-токен.",
        ) from None
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ожидался refresh-токен.")
    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен.")
    row = (await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))).scalar_one_or_none()
    if row is None or row.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сессия отозвана или не найдена.")
    if row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сессия истекла.")
    user = await db.get(User, UUID(sub))
    if user is None or user.id != row.user_id or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь недоступен.")
    return user, row


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_tokens(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenPairResponse:
    """Выдаёт новую пару токенов и отзывает предыдущий refresh (ротация)."""
    user, row = await _get_refresh_session(db, body.refresh_token)
    row.revoked_at = datetime.now(UTC)
    db.add(row)
    await db.commit()
    return await issue_token_pair(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: LogoutRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Отзывает refresh-сессию по переданному токену."""
    try:
        _, row = await _get_refresh_session(db, body.refresh_token)
    except HTTPException:
        return None
    row.revoked_at = datetime.now(UTC)
    db.add(row)
    await db.commit()
    return None


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(
    body: VerifyEmailRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Подтверждает email по одноразовому токену."""
    digest = _hash_verification_token(body.token.strip())
    stmt = select(User).where(User.email_verification_token_hash == digest)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный или уже использованный токен.",
        )
    if user.email_verification_expires_at and user.email_verification_expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия ссылки истёк.",
        )
    user.is_verified = True
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.add(user)
    await db.commit()
    return {"message": "Email подтверждён."}
