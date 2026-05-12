# Схемы пользователя для ответов API (без секретов). Поле email — строка: OAuth может вернуть технический адрес (.local), EmailStr бы падал при сериализации.
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    created_at: datetime
    is_active: bool
    is_verified: bool
    balance: int
