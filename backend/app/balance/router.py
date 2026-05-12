# HTTP-маршруты раздела баланса: чтение своего счёта (пополнение и списание — через service из других модулей).

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.balance.schemas import BalanceRead
from app.models.user import User

router = APIRouter(prefix="/balance", tags=["balance"])


@router.get("/me", response_model=BalanceRead)
async def read_my_balance(
    current: Annotated[User, Depends(get_current_user)],
) -> BalanceRead:
    """Отдаёт баланс токенов авторизованного пользователя."""
    return BalanceRead(balance=current.balance)
