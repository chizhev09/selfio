"""generation_requests: aspect_ratio for image format selection

Revision ID: 0005_generation_aspect_ratio
Revises: 0004_generation_requests
Create Date: 2026-04-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_generation_aspect_ratio"
down_revision: Union[str, Sequence[str], None] = "0004_generation_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "generation_requests",
        sa.Column("aspect_ratio", sa.String(length=16), server_default="9:16", nullable=False),
    )
    op.alter_column("generation_requests", "aspect_ratio", server_default=None)


def downgrade() -> None:
    op.drop_column("generation_requests", "aspect_ratio")
