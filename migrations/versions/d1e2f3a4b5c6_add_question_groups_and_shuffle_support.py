"""add_question_groups_and_shuffle_support

Revision ID: d1e2f3a4b5c6
Revises: c7d8e9f1a234
Create Date: 2026-09-17 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c7d8e9f1a234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Create question_groups table if not exists
    if 'question_groups' not in tables:
        op.create_table(
            'question_groups',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('group_code', sa.String(length=50), nullable=True),
            sa.Column('title', sa.String(length=255), nullable=True),
            sa.Column('passage_text', sa.Text(), nullable=True),
            sa.Column('audio_url', sa.String(length=512), nullable=True),
            sa.Column('image_url', sa.String(length=512), nullable=True),
            sa.Column('allow_shuffle', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True)
        )

    # 2. Add columns to questions table if not exists
    question_cols = [c['name'] for c in inspector.get_columns('questions')]
    
    if 'group_id' not in question_cols:
        op.add_column('questions', sa.Column('group_id', sa.Integer(), nullable=True))
        try:
            op.create_index('ix_questions_group_id', 'questions', ['group_id'])
        except Exception:
            pass

    if 'order_in_group' not in question_cols:
        op.add_column('questions', sa.Column('order_in_group', sa.Integer(), server_default='0', nullable=True))

    if 'allow_shuffle' not in question_cols:
        op.add_column('questions', sa.Column('allow_shuffle', sa.Boolean(), server_default='1', nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'question_groups' in tables:
        op.drop_table('question_groups')
    
    question_cols = [c['name'] for c in inspector.get_columns('questions')]
    if 'allow_shuffle' in question_cols:
        op.drop_column('questions', 'allow_shuffle')
    if 'order_in_group' in question_cols:
        op.drop_column('questions', 'order_in_group')
    if 'group_id' in question_cols:
        op.drop_column('questions', 'group_id')
