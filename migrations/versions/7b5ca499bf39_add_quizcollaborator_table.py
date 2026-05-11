"""Add QuizCollaborator table

Revision ID: 7b5ca499bf39
Revises: 62e698941b97
Create Date: 2026-05-12 00:07:47.946174

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b5ca499bf39'
down_revision: Union[str, Sequence[str], None] = '62e698941b97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlalchemy.engine.reflection import Inspector
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "quiz_collaborators" not in tables:
        op.create_table(
            'quiz_collaborators',
            sa.Column('quiz_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('added_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('quiz_id', 'user_id')
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('quiz_collaborators')
