"""Add index on orders.created_at for faster listing

Revision ID: c3f9b2d41a7e
Revises: 8a1f3c7f1e2b
Create Date: 2026-04-23 22:05:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3f9b2d41a7e'
down_revision: Union[str, Sequence[str], None] = '8a1f3c7f1e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_orders_created_at', 'orders', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_orders_created_at', table_name='orders')
