"""generation_requests: очередь и статусы async-генерации

Revision ID: 0004_generation_requests
Revises: 0003_user_photos
Create Date: 2026-04-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_generation_requests"
down_revision: Union[str, Sequence[str], None] = "0003_user_photos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "generation_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("generation_type", sa.String(length=24), nullable=False),
        sa.Column("quality", sa.String(length=24), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("template_id", sa.String(length=120), nullable=False),
        sa.Column("manifest_path", sa.String(length=512), nullable=False),
        sa.Column("selected_prompt", sa.Text(), nullable=False),
        sa.Column("user_photo_object_key", sa.String(length=512), nullable=False),
        sa.Column("template_photo_object_key", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("result_object_key", sa.String(length=512), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_generation_requests_user_id"), "generation_requests", ["user_id"], unique=False)
    op.create_index(op.f("ix_generation_requests_status"), "generation_requests", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_generation_requests_status"), table_name="generation_requests")
    op.drop_index(op.f("ix_generation_requests_user_id"), table_name="generation_requests")
    op.drop_table("generation_requests")
