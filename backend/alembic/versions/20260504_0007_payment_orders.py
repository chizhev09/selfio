"""payment_orders: ENOT top-up orders

Revision ID: 0007_payment_orders
Revises: 0006_users_balance
Create Date: 2026-05-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0007_payment_orders"
down_revision: Union[str, Sequence[str], None] = "0006_users_balance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_orders",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=False),
        sa.Column("plan_key", sa.String(length=32), nullable=False),
        sa.Column("amount_rubles", sa.Integer(), nullable=False),
        sa.Column("tokens_to_credit", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("enot_invoice_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id"),
    )
    op.create_index(op.f("ix_payment_orders_enot_invoice_id"), "payment_orders", ["enot_invoice_id"], unique=False)
    op.create_index(op.f("ix_payment_orders_user_id"), "payment_orders", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_orders_user_id"), table_name="payment_orders")
    op.drop_index(op.f("ix_payment_orders_enot_invoice_id"), table_name="payment_orders")
    op.drop_table("payment_orders")
