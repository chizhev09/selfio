# Роуты ЮMoney: checkout с JWT; webhook публичный, защищён подписью sign в теле form-urlencoded.
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.payments.schemas import YooMoneyCheckoutRequest, YooMoneyCheckoutResponse
from app.payments.service import create_yoomoney_checkout, process_yoomoney_webhook

router = APIRouter(prefix="/payments/yoomoney", tags=["payments"])


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
    try:
        form = await request.form()
    except Exception as exc:  # noqa: BLE001 — ошибка парсинга тела multipart/urlencoded
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid form body",
        ) from exc
    flat: dict[str, str] = {}
    for key, val in form.multi_items():
        if isinstance(val, str):
            flat[key] = val
    await process_yoomoney_webhook(db, flat, settings)
    return {"ok": True}
