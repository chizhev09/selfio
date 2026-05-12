# Сервис баланса: чтение и атомарные UPDATE по полю users.balance (без гонок при списании).

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_balance(db: AsyncSession, user_id: UUID) -> int:
    """Возвращает текущий баланс токенов пользователя по id."""
    balance = await db.scalar(select(User.balance).where(User.id == user_id))
    if balance is None:
        msg = "Пользователь не найден."
        raise ValueError(msg)
    return int(balance)


async def add_tokens(db: AsyncSession, user_id: UUID, delta: int) -> int:
    """Атомарно увеличивает баланс на delta токенов; возвращает новое значение."""
    if delta <= 0:
        msg = "delta должен быть положительным."
        raise ValueError(msg)
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(balance=User.balance + delta)
        .returning(User.balance)
    )
    result = await db.execute(stmt)
    new_balance = result.scalar_one_or_none()
    if new_balance is None:
        msg = "Пользователь не найден."
        raise ValueError(msg)
    return int(new_balance)


async def try_spend_tokens(db: AsyncSession, user_id: UUID, cost: int) -> int | None:
    """Списывает cost токенов, если хватает средств; иначе возвращает None без изменения баланса."""
    if cost <= 0:
        msg = "cost должен быть положительным."
        raise ValueError(msg)
    stmt = (
        update(User)
        .where(User.id == user_id, User.balance >= cost)
        .values(balance=User.balance - cost)
        .returning(User.balance)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    return int(row) if row is not None else None
