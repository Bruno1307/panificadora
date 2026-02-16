"""Add order_payments table for split payments

Revision ID: 8a1f3c7f1e2b
Revises: 2320873ccc89
Create Date: 2026-02-15 22:45:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a1f3c7f1e2b'
down_revision: Union[str, Sequence[str], None] = '2320873ccc89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create order_payments table."""
    op.create_table(
        'order_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('method', sa.String(length=30), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_payments_id'), 'order_payments', ['id'], unique=False)
    op.create_index('ix_order_payments_order_id', 'order_payments', ['order_id'], unique=False)
    op.create_index('ix_order_payments_method', 'order_payments', ['method'], unique=False)


def downgrade() -> None:
    """Drop order_payments table."""
    op.drop_index('ix_order_payments_method', table_name='order_payments')
    op.drop_index('ix_order_payments_order_id', table_name='order_payments')
    op.drop_index(op.f('ix_order_payments_id'), table_name='order_payments')
    op.drop_table('order_payments')
