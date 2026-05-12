# Роуты ЮMoney: checkout с JWT; webhook POST application/x-www-form-urlencoded (UTF-8), см.
# https://yoomoney.ru/docs/payment-buttons/using-api/notifications
from typing import Annotated
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.payments.schemas import YooMoneyCheckoutRequest, YooMoneyCheckoutResponse
from app.payments.service import create_yoomoney_checkout, process_yoomoney_webhook

router = APIRouter(prefix="/payments/yoomoney", tags=["payments"])


async def _parse_yoomoney_form_flat(request: Request) -> dict[str, str]:
    """Разбирает тело webhook как application/x-www-form-urlencoded без request.form() — так не нужен пакет python-multipart и не падает парсер на типичном POST ЮMoney."""
    body = await request.body()
    if not body:
        return {}
    try:
        text = body.decode("utf-8", errors="replace")
        return dict(parse_qsl(text, keep_blank_values=True))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid form body",
        ) from exc


@router.post("/checkout", response_model=YooMoneyCheckoutResponse)
async def yoomoney_checkout(
    payload: YooMoneyCheckoutRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> YooMoneyCheckoutResponse:
    """Создаёт заказ и возвращает ссылку quickpay ЮMoney для выбранного тарифа."""
    settings = get_settings()
    pay_url = await create_yoomoney_checkout(db, current, payload.plan_key, settings)
    return YooMoneyCheckoutResponse(pay_url=pay_url)


@router.post("/webhook")
async def yoomoney_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, bool]:
    """Принимает HTTP-уведомление ЮMoney и зачисляет токены при успешной оплате."""
    settings = get_settings()
    flat = await _parse_yoomoney_form_flat(request)
    await process_yoomoney_webhook(db, flat, settings)
    return {"ok": True}
