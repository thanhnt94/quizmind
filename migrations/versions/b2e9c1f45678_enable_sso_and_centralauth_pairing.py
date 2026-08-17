"""enable_sso_and_centralauth_pairing

Revision ID: b2e9c1f45678
Revises: a1f8c2e94321
Create Date: 2026-08-17 21:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2e9c1f45678'
down_revision: Union[str, Sequence[str], None] = 'a1f8c2e94321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Create sso_settings table if not exists
    if 'sso_settings' not in tables:
        op.create_table(
            'sso_settings',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('is_enabled', sa.Boolean(), default=True),
            sa.Column('server_url', sa.String(255), nullable=True),
            sa.Column('client_id', sa.String(100), nullable=True),
            sa.Column('client_secret', sa.String(255), nullable=True),
            sa.Column('redirect_uri', sa.String(255), nullable=True),
        )

    # 2. Seed / Update default SSO config
    sso_table = sa.table(
        'sso_settings',
        sa.column('id', sa.Integer),
        sa.column('is_enabled', sa.Boolean),
        sa.column('server_url', sa.String),
        sa.column('client_id', sa.String),
        sa.column('client_secret', sa.String),
        sa.column('redirect_uri', sa.String)
    )

    # Check if a row exists
    res = conn.execute(sa.select(sso_table.c.id)).fetchone()
    if res is None:
        conn.execute(
            sso_table.insert().values(
                is_enabled=True,
                server_url='https://auth.inmind.site',
                client_id='quizmind',
                client_secret='quizmind-secret-key-2026',
                redirect_uri='https://quiz.inmind.site/auth-center/callback'
            )
        )
    else:
        conn.execute(
            sso_table.update().where(sso_table.c.id == res[0]).values(
                is_enabled=True,
                server_url='https://auth.inmind.site',
                client_id='quizmind',
                client_secret='quizmind-secret-key-2026',
                redirect_uri='https://quiz.inmind.site/auth-center/callback'
            )
        )


def downgrade() -> None:
    pass
