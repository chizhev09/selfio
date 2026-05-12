# //==== ТОЧКА ВХОДА FASTAPI: ПОДКЛЮЧАЕТ РОУТЫ, CORS И БАЗОВЫЕ СЕРВИСНЫЕ МАРШРУТЫ. ====
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import get_current_user
from app.api.routes import auth, oauth_google, oauth_vk_id, oauth_yandex, users
from app.admin.router import router as admin_router
from app.balance.router import router as balance_router
from app.payments.router import router as payments_yoomoney_router
from app.S3_storage.router import router as storage_router
from app.core.config import get_settings
from app.models.user import User
from app.S3_storage.client import make_s3_client

settings = get_settings()
app = FastAPI(title="Selfio API", debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(oauth_yandex.router, prefix="/api")
app.include_router(oauth_google.router, prefix="/api")
app.include_router(oauth_vk_id.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(balance_router, prefix="/api")
app.include_router(payments_yoomoney_router, prefix="/api")
app.include_router(storage_router, prefix="/api")
# Админка под /api/admin — один Nginx location /api на весь бэкенд (selfio.ru на Timeweb).
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    """//==== ПРОСТОЙ HEALTHCHECK ДЛЯ ПРОВЕРКИ, ЧТО API ЖИВ И ОТВЕЧАЕТ. ===="""
    return {"status": "ok"}


@app.get("/api/health/deployment-check")
async def deployment_check(
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, bool]:
    """Показывает, заполнены ли ключи для генерации и S3 на сервере (без передачи секретов). Нужна авторизация."""
    s = get_settings()
    return {
        "openrouter_api_key_configured": bool(s.openrouter_api_key.strip()),
        "s3_client_configured": make_s3_client() is not None,
        "bucket_configured": bool(s.resolve_s3_bucket()),
    }
