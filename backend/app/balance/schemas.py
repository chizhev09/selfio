# Pydantic-схемы ответов API раздела баланса.

from pydantic import BaseModel, ConfigDict, Field


class BalanceRead(BaseModel):
    """Текущий баланс токенов пользователя."""

    model_config = ConfigDict(from_attributes=False)

    balance: int = Field(ge=0, description="Количество токенов на счёте")
