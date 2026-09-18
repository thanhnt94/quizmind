"""add_question_contributions

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-18 23:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'question_contributions' not in tables:
        op.create_table(
            'question_contributions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('question_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('parent_id', sa.Integer(), nullable=True),
            sa.Column('type', sa.String(length=50), server_default='discussion', nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='approved', nullable=False),
            sa.Column('likes_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['parent_id'], ['question_contributions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_question_contributions_id'), 'question_contributions', ['id'], unique=False)
        op.create_index(op.f('ix_question_contributions_question_id'), 'question_contributions', ['question_id'], unique=False)
        op.create_index(op.f('ix_question_contributions_user_id'), 'question_contributions', ['user_id'], unique=False)
        op.create_index(op.f('ix_question_contributions_parent_id'), 'question_contributions', ['parent_id'], unique=False)

    if 'question_contribution_likes' not in tables:
        op.create_table(
            'question_contribution_likes',
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('contribution_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['contribution_id'], ['question_contributions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('user_id', 'contribution_id')
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'question_contribution_likes' in tables:
        op.drop_table('question_contribution_likes')

    if 'question_contributions' in tables:
        op.drop_index(op.f('ix_question_contributions_parent_id'), table_name='question_contributions')
        op.drop_index(op.f('ix_question_contributions_user_id'), table_name='question_contributions')
        op.drop_index(op.f('ix_question_contributions_question_id'), table_name='question_contributions')
        op.drop_index(op.f('ix_question_contributions_id'), table_name='question_contributions')
        op.drop_table('question_contributions')
