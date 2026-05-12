"""user_photos: учёт загрузок в S3 для галереи

Revision ID: 0003_user_photos
Revises: 0002_oauth_yandex
Create Date: 2026-04-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_user_photos"
down_revision: Union[str, Sequence[str], None] = "0002_oauth_yandex"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key", name="uq_user_photos_object_key"),
    )
    op.create_index(op.f("ix_user_photos_user_id"), "user_photos", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_photos_user_id"), table_name="user_photos")
    op.drop_table("user_photos")
