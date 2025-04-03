"""add OAuth columns

Revision ID: 001
Revises: 
Create Date: 2025-04-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Check if columns exist before adding them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('user')]
    
    # Add OAuth columns if they don't exist
    if 'oauth_provider' not in columns:
        op.add_column('user', sa.Column('oauth_provider', sa.String(50), nullable=True))
    if 'oauth_id' not in columns:
        op.add_column('user', sa.Column('oauth_id', sa.String(256), nullable=True))
    if 'name' not in columns:
        op.add_column('user', sa.Column('name', sa.String(255), nullable=True))
    
    # Make some fields nullable for OAuth users
    for col_name in ['username', 'password', 'fs_uniquifier']:
        if col_name in columns:
            op.alter_column('user', col_name, nullable=True)


def downgrade():
    # Remove OAuth columns
    op.drop_column('user', 'oauth_provider')
    op.drop_column('user', 'oauth_id')
    op.drop_column('user', 'name')
    
    # Make fields required again
    op.alter_column('user', 'username', nullable=False)
    op.alter_column('user', 'password', nullable=False)
    op.alter_column('user', 'fs_uniquifier', nullable=False)
