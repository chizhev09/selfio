"""users: add balance column

Revision ID: 0006_users_balance
Revises: 0005_generation_aspect_ratio
Create Date: 2026-04-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_users_balance"
down_revision: Union[str, Sequence[str], None] = "0005_generation_aspect_ratio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("balance", sa.Integer(), server_default="0", nullable=False))
    op.alter_column("users", "balance", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "balance")
