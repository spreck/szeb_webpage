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
    # These operations have already been performed manually
    # Just marking them as done
    pass


def downgrade():
    # Remove OAuth columns
    op.drop_column('user', 'oauth_provider')
    op.drop_column('user', 'oauth_id')
    op.drop_column('user', 'name')
    
    # Make fields required again
    op.alter_column('user', 'username', nullable=False)
    op.alter_column('user', 'password', nullable=False)
    op.alter_column('user', 'fs_uniquifier', nullable=False)
