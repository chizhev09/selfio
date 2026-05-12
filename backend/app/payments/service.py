# Создание ссылки quickpay ЮMoney и обработка HTTP-уведомления с идемпотентным зачислением токенов.
from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.balance.service import add_tokens
from app.core.config import Settings
from app.models.payment_order import PaymentOrder, PaymentOrderStatus
from app.models.user import User
from app.payments.constants import get_plan_by_key
from app.payments.signature import verify_yoomoney_notification_sign
from app.payments.yoomoney_quickpay import build_yoomoney_quickpay_url

logger = logging.getLogger(__name__)


def _parse_rubles(amount_val: Any) -> Decimal | None:
    """Преобразует строку суммы из уведомления в Decimal для сравнения с целыми рублями заказа."""
    if amount_val is None:
        return None
    try:
        return Decimal(str(amount_val))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _withdraw_matches_order(order: PaymentOrder, withdraw_raw: Any) -> bool:
    """Проверяет, что сумма списания с плательщика совпадает с суммой заказа в рублях."""
    parsed = _parse_rubles(withdraw_raw)
    if parsed is None:
        return False
    return parsed == Decimal(order.amount_rubles)


async def create_yoomoney_checkout(session: AsyncSession, user: User, plan_key: str, settings: Settings) -> str:
    """Создаёт запись заказа в БД и возвращает готовый URL перехода на оплату в ЮMoney."""
    if not settings.yoomoney_payments_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Платежи временно недоступны.",
        )
    plan = get_plan_by_key(plan_key)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный тариф.")

    order_uuid = uuid.uuid4()
    order_id_str = str(order_uuid)
    row = PaymentOrder(
        id=order_uuid,
        user_id=user.id,
        order_id=order_id_str,
        plan_key=plan.key,
        amount_rubles=plan.amount_rubles,
        tokens_to_credit=plan.tokens,
        status=PaymentOrderStatus.pending.value,
    )
    session.add(row)
    await session.flush()

    success_url = settings.resolve_yoomoney_success_return_url()
    pay_url = build_yoomoney_quickpay_url(
        settings=settings,
        order_label=order_id_str,
        amount_rubles=plan.amount_rubles,
        success_frontend_url=success_url,
    )
    await session.commit()
    return pay_url


async def process_yoomoney_webhook(session: AsyncSession, params: dict[str, str], settings: Settings) -> None:
    """Проверяет подпись уведомления, находит заказ по label и зачисляет токены один раз."""
    if not settings.yoomoney_payments_configured():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # В доке ЮMoney: «тестовые уведомления приходят пустыми» — подписи нет, только проверка доступности URL (ответ 200).
    if not params:
        logger.info("YooMoney webhook: пустые параметры (тест связи из кабинета)")
        await session.commit()
        return

    secret = settings.yoomoney_http_notification_secret.strip()
    if not verify_yoomoney_notification_sign(params, secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if (params.get("test_notification") or "").strip().lower() == "true":
        await session.commit()
        return

    label = (params.get("label") or "").strip()
    if not label:
        logger.info("YooMoney webhook: пустой label")
        await session.commit()
        return

    ntype = (params.get("notification_type") or "").strip()
    if ntype not in {"p2p-incoming", "card-incoming"}:
        logger.info("YooMoney webhook: неизвестный notification_type=%s", ntype)
        await session.commit()
        return

    result = await session.execute(select(PaymentOrder).where(PaymentOrder.order_id == label).with_for_update())
    order = result.scalar_one_or_none()
    if order is None:
        logger.warning("YooMoney webhook: заказ не найден label=%s", label)
        await session.commit()
        return

    if order.status == PaymentOrderStatus.paid.value:
        await session.commit()
        return

    if not _withdraw_matches_order(order, params.get("withdraw_amount")):
        logger.warning(
            "YooMoney webhook: сумма withdraw_amount не совпала с заказом label=%s",
            label,
        )
        await session.commit()
        return

    amt_recv = params.get("amount")
    credited = _parse_rubles(amt_recv)
    if credited is not None and credited <= 0:
        logger.warning("YooMoney webhook: некорректная сумма зачисления label=%s", label)
        await session.commit()
        return

    op_id = (params.get("operation_id") or "").strip()
    await add_tokens(session, order.user_id, order.tokens_to_credit)
    order.status = PaymentOrderStatus.paid.value
    order.paid_at = datetime.now(UTC)
    if op_id:
        order.yoomoney_operation_id = op_id
    await session.commit()
