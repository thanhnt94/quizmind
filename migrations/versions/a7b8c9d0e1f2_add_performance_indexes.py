"""add_performance_indexes

Revision ID: a7b8c9d0e1f2
Revises: f2a3b4c5d6e7
Create Date: 2026-09-18 22:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Add index on user_answers.created_at for rapid daily summary queries
    if 'user_answers' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('user_answers')]
        if 'ix_user_answers_created_at' not in indexes:
            op.create_index('ix_user_answers_created_at', 'user_answers', ['created_at'], unique=False)

    # 2. Add composite index on user_question_mastery(user_id, question_id)
    if 'user_question_mastery' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('user_question_mastery')]
        if 'ix_user_question_mastery_user_question' not in indexes:
            op.create_index('ix_user_question_mastery_user_question', 'user_question_mastery', ['user_id', 'question_id'], unique=False)

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_question_mastery' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('user_question_mastery')]
        if 'ix_user_question_mastery_user_question' in indexes:
            op.drop_index('ix_user_question_mastery_user_question', table_name='user_question_mastery')

    if 'user_answers' in tables:
        indexes = [idx['name'] for idx in inspector.get_indexes('user_answers')]
        if 'ix_user_answers_created_at' in indexes:
            op.drop_index('ix_user_answers_created_at', table_name='user_answers')
