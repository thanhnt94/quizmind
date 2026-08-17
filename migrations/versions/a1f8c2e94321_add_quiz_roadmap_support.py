"""add_quiz_roadmap_support

Revision ID: a1f8c2e94321
Revises: e999ef3f63bb
Create Date: 2026-08-17 21:16:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'a1f8c2e94321'
down_revision: Union[str, Sequence[str], None] = 'e999ef3f63bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add practice_settings to quizzes table if not exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    quiz_cols = [c['name'] for c in inspector.get_columns('quizzes')]
    if 'practice_settings' not in quiz_cols:
        op.add_column('quizzes', sa.Column('practice_settings', sa.JSON(), nullable=True))

    # 2. Create user_quiz_settings table if not exists
    tables = inspector.get_table_names()
    if 'user_quiz_settings' not in tables:
        op.create_table(
            'user_quiz_settings',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), index=True),
            sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quizzes.id'), index=True),
            sa.Column('settings', sa.JSON(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        )
        op.create_index('ix_user_quiz_settings_user_quiz', 'user_quiz_settings', ['user_id', 'quiz_id'], unique=False)

    # 3. Add daily_time_target & daily_card_target to user_quiz_goals if not exists
    if 'user_quiz_goals' in tables:
        goal_cols = [c['name'] for c in inspector.get_columns('user_quiz_goals')]
        if 'daily_time_target' not in goal_cols:
            op.add_column('user_quiz_goals', sa.Column('daily_time_target', sa.Integer(), server_default='10', nullable=True))
        if 'daily_card_target' not in goal_cols:
            op.add_column('user_quiz_goals', sa.Column('daily_card_target', sa.Integer(), server_default='20', nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'user_quiz_settings' in tables:
        op.drop_table('user_quiz_settings')
    if 'quizzes' in tables:
        quiz_cols = [c['name'] for c in inspector.get_columns('quizzes')]
        if 'practice_settings' in quiz_cols:
            op.drop_column('quizzes', 'practice_settings')
