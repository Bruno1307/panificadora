"""Add payment override audit fields to orders

Revision ID: d6a9f3b2a4c1
Revises: c3f9b2d41a7e
Create Date: 2026-07-14 12:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6a9f3b2a4c1'
down_revision: Union[str, Sequence[str], None] = 'c3f9b2d41a7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('payment_override_reason', sa.String(length=255), nullable=True))
    op.add_column('orders', sa.Column('payment_override_by', sa.String(length=50), nullable=True))
    op.add_column('orders', sa.Column('payment_override_diff', sa.Numeric(10, 2), nullable=True))
    op.add_column('orders', sa.Column('payment_override_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'payment_override_at')
    op.drop_column('orders', 'payment_override_diff')
    op.drop_column('orders', 'payment_override_by')
    op.drop_column('orders', 'payment_override_reason')
