# Выпуск пары access/refresh JWT и запись refresh в БД (асинхронная сессия).
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, new_jti
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import TokenPairResponse


async def issue_token_pair(db: AsyncSession, user: User) -> TokenPairResponse:
    """Создаёт access и refresh JWT и сохраняет сессию refresh в таблице."""
    jti = new_jti()
    s = get_settings()
    expires_at = datetime.now(UTC) + timedelta(days=s.refresh_token_expire_days)
    row = RefreshToken(user_id=user.id, jti=str(jti), expires_at=expires_at)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id, jti)
    return TokenPairResponse(access_token=access, refresh_token=refresh)
