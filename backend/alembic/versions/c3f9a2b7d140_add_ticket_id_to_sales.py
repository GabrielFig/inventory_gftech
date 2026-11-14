"""add ticket_id to sales (carrito de varios productos)

Revision ID: c3f9a2b7d140
Revises: a7c1e5d90b21
Create Date: 2026-11-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3f9a2b7d140"
down_revision: Union[str, None] = "a7c1e5d90b21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("ticket_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_sales_ticket_id"), "sales", ["ticket_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sales_ticket_id"), table_name="sales")
    op.drop_column("sales", "ticket_id")
