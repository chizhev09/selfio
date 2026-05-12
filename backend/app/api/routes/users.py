# Маршрут профиля текущего пользователя (асинхронный).
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
async def read_me(
    current: Annotated[User, Depends(get_current_user)],
) -> User:
    """Возвращает данные авторизованного пользователя."""
    return current
