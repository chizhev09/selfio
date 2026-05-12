# Схемы пользователя для ответов API (без секретов).
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    created_at: datetime
    is_active: bool
    is_verified: bool
    balance: int
