# Таблица заказов пополнения (ЮMoney quickpay + HTTP-уведомления): сумма и токены фиксируются при создании заказа.
import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class PaymentOrderStatus(str, enum.Enum):
    """Жизненный цикл заказа: ожидание оплаты, успех, истечение, ошибка, возврат."""

    pending = "pending"
    paid = "paid"
    expired = "expired"
    failed = "failed"
    refunded = "refunded"


class PaymentOrder(Base):
    """Одна попытка оплаты: order_id совпадает с label в форме ЮMoney и в HTTP-уведомлении."""

    __tablename__ = "payment_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    plan_key: Mapped[str] = mapped_column(String(32), nullable=False)
    amount_rubles: Mapped[int] = mapped_column(Integer, nullable=False)
    tokens_to_credit: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PaymentOrderStatus.pending.value
    )
    yoomoney_operation_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="payment_orders")
