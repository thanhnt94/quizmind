"""add_quiz_play_settings

Revision ID: e8f9a1b2c3d4
Revises: d1e2f3a4b5c6
Create Date: 2026-09-17 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e8f9a1b2c3d4'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' in tables:
        columns = [c['name'] for c in inspector.get_columns('user_global_settings')]
        if 'shuffle_choices' not in columns:
            op.add_column('user_global_settings', sa.Column('shuffle_choices', sa.Boolean(), server_default='1', nullable=True))
        if 'shuffle_questions' not in columns:
            op.add_column('user_global_settings', sa.Column('shuffle_questions', sa.Boolean(), server_default='1', nullable=True))
        if 'auto_expand_explanation' not in columns:
            op.add_column('user_global_settings', sa.Column('auto_expand_explanation', sa.Boolean(), server_default='1', nullable=True))
        if 'exam_batch_size' not in columns:
            op.add_column('user_global_settings', sa.Column('exam_batch_size', sa.Integer(), server_default='10', nullable=True))
        if 'instant_feedback' not in columns:
            op.add_column('user_global_settings', sa.Column('instant_feedback', sa.Boolean(), server_default='1', nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_global_settings' in tables:
        with op.batch_alter_table('user_global_settings') as batch_op:
            batch_op.drop_column('instant_feedback')
            batch_op.drop_column('exam_batch_size')
            batch_op.drop_column('auto_expand_explanation')
            batch_op.drop_column('shuffle_questions')
            batch_op.drop_column('shuffle_choices')
