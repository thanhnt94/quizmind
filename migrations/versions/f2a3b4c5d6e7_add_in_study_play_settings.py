"""add_in_study_play_settings

Revision ID: f2a3b4c5d6e7
Revises: e8f9a1b2c3d4
Create Date: 2026-09-18 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e8f9a1b2c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' in tables:
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'font_size' not in columns:
            op.add_column('user_global_settings', sa.Column('font_size', sa.String(20), server_default='100%', nullable=True))
        if 'auto_advance' not in columns:
            op.add_column('user_global_settings', sa.Column('auto_advance', sa.Boolean(), server_default='0', nullable=True))
        if 'show_mastery' not in columns:
            op.add_column('user_global_settings', sa.Column('show_mastery', sa.Boolean(), server_default='1', nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' in tables:
        with op.batch_alter_table('user_global_settings') as batch_op:
            batch_op.drop_column('show_mastery')
            batch_op.drop_column('auto_advance')
            batch_op.drop_column('font_size')
