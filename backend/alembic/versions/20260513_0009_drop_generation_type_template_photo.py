# Удаляет колонки режима one_to_one из generation_requests: тип и ключ второго фото.

import sqlalchemy as sa
from alembic import op

revision = "0009_drop_gen_type_template"
down_revision = "0008_yoomoney_op"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Убирает template_photo_object_key и generation_type — остаётся один входной снимок пользователя."""
    op.drop_column("generation_requests", "template_photo_object_key")
    op.drop_column("generation_requests", "generation_type")


def downgrade() -> None:
    """Восстанавливает колонки для отката миграции (значение по умолчанию для старых строк)."""
    op.add_column(
        "generation_requests",
        sa.Column("generation_type", sa.String(length=24), server_default="similar", nullable=False),
    )
    op.add_column(
        "generation_requests",
        sa.Column("template_photo_object_key", sa.String(length=512), nullable=True),
    )
    op.alter_column("generation_requests", "generation_type", server_default=None)
