"""add_user_global_settings

Revision ID: c7d8e9f1a234
Revises: b2e9c1f45678
Create Date: 2026-09-16 23:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f1a234'
down_revision: Union[str, Sequence[str], None] = 'b2e9c1f45678'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' not in tables:
        op.create_table(
            'user_global_settings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('theme', sa.String(length=20), server_default='light', nullable=True),
            sa.Column('focus_timer_active', sa.Boolean(), server_default='1', nullable=True),
            sa.Column('sfx_enabled', sa.Boolean(), server_default='1', nullable=True),
            sa.Column('haptic_enabled', sa.Boolean(), server_default='1', nullable=True),
            sa.Column('autoplay_audio', sa.String(length=20), server_default='never', nullable=True),
            sa.Column('quiz_learning_mode', sa.String(length=50), server_default='mcq', nullable=True),
            sa.Column('practice_range', sa.String(length=20), server_default='all', nullable=True),
            sa.Column('score_mode', sa.String(length=20), server_default='all', nullable=True),
            sa.Column('time_mode', sa.String(length=20), server_default='question', nullable=True),
            sa.Column('last_quiz_id', sa.Integer(), nullable=True),
            sa.Column('home_active_tab', sa.String(length=20), server_default='roadmap', nullable=True),
            sa.Column('roadmap_quiz_order', sa.JSON(), nullable=True),
            sa.Column('quizzes_quiz_order', sa.JSON(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id')
        )
        op.create_index(op.f('ix_user_global_settings_id'), 'user_global_settings', ['id'], unique=False)
        op.create_index(op.f('ix_user_global_settings_user_id'), 'user_global_settings', ['user_id'], unique=True)

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' in tables:
        op.drop_index(op.f('ix_user_global_settings_user_id'), table_name='user_global_settings')
        op.drop_index(op.f('ix_user_global_settings_id'), table_name='user_global_settings')
        op.drop_table('user_global_settings')
