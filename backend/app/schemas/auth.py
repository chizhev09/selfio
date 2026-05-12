# Схемы регистрации, входа, токенов и верификации почты.
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Регистрация по почте и паролю без дополнительных правил сложности (только непустые поля и длины)."""

    email: EmailStr
    username: str = Field(..., min_length=1, max_length=30)
    password: str = Field(..., min_length=1)

    @field_validator("username")
    @classmethod
    def strip_username(cls, v: str) -> str:
        """Убирает пробелы по краям; пустая строка после trim недопустима."""
        s = v.strip()
        if not s:
            raise ValueError("Логин не может быть пустым.")
        return s


class LoginRequest(BaseModel):
    """Вход по email или username (поле login) и паролю."""

    login: str = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=1)


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=1)


class UserPublicNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    is_verified: bool
    balance: int


class RegisterResponse(BaseModel):
    user: UserPublicNested
    message: str


class OAuthExchangeRequest(BaseModel):
    """Одноразовый код из URL после редиректа с бэкенда."""

    code: str = Field(..., min_length=8, max_length=128)
