# Переименование колонки внешнего id операции: ENOT заменён на ЮMoney HTTP-уведомления.

from alembic import op


revision = "0008_yoomoney_op"
down_revision = "0007_payment_orders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Переименовывает колонку и индекс под operation_id из уведомлений ЮMoney."""
    op.execute("ALTER TABLE payment_orders RENAME COLUMN enot_invoice_id TO yoomoney_operation_id")
    op.execute(
        "ALTER INDEX ix_payment_orders_enot_invoice_id RENAME TO ix_payment_orders_yoomoney_operation_id"
    )


def downgrade() -> None:
    """Возвращает старое имя колонки ENOT для отката миграций."""
    op.execute(
        "ALTER INDEX ix_payment_orders_yoomoney_operation_id RENAME TO ix_payment_orders_enot_invoice_id"
    )
    op.execute("ALTER TABLE payment_orders RENAME COLUMN yoomoney_operation_id TO enot_invoice_id")
