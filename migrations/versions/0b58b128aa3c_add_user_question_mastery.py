"""add_user_question_mastery

Revision ID: 0b58b128aa3c
Revises: e344433e1d33
Create Date: 2026-05-22 23:55:42.215175

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_user_question_mastery

Revision ID: 0b58b128aa3c
Revises: e344433e1d33
Create Date: 2026-05-22 23:55:42.215175

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b58b128aa3c'
down_revision: Union[str, Sequence[str], None] = 'e344433e1d33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_question_mastery' not in tables:
        op.create_table(
            'user_question_mastery',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('question_id', sa.Integer(), nullable=False),
            sa.Column('box_level', sa.Integer(), server_default='1', nullable=True),
            sa.Column('consecutive_correct', sa.Integer(), server_default='0', nullable=True),
            sa.Column('is_ignored', sa.Boolean(), server_default='0', nullable=True),
            sa.Column('last_answered', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_user_question_mastery_id'), 'user_question_mastery', ['id'], unique=False)
        op.create_index(op.f('ix_user_question_mastery_question_id'), 'user_question_mastery', ['question_id'], unique=False)
        op.create_index(op.f('ix_user_question_mastery_user_id'), 'user_question_mastery', ['user_id'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_question_mastery' in tables:
        op.drop_index(op.f('ix_user_question_mastery_user_id'), table_name='user_question_mastery')
        op.drop_index(op.f('ix_user_question_mastery_question_id'), table_name='user_question_mastery')
        op.drop_index(op.f('ix_user_question_mastery_id'), table_name='user_question_mastery')
        op.drop_table('user_question_mastery')
