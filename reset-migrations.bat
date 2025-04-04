@echo off
echo ======================================================
echo RESET AND REINITIALIZE FLASK MIGRATIONS
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Remove existing migrations
echo Removing existing migrations...
rmdir /s /q migrations

:: Create new migrations directory structure
echo Creating new migrations directory structure...
mkdir migrations
mkdir migrations\versions

:: Create migration script
echo Creating migration script...
echo """add OAuth columns

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
> migrations\versions\001_add_oauth_columns.py

:: Create alembic.ini
echo Creating alembic.ini...
echo [alembic]
echo script_location = migrations
echo prepend_sys_path = .
echo version_path_separator = os
echo sqlalchemy.url = driver://user:pass@localhost/dbname
echo 
echo [loggers]
echo keys = root,sqlalchemy,alembic
echo 
echo [handlers]
echo keys = console
echo 
echo [formatters]
echo keys = generic
echo 
echo [logger_root]
echo level = WARN
echo handlers = console
echo qualname =
echo 
echo [logger_sqlalchemy]
echo level = WARN
echo handlers =
echo qualname = sqlalchemy.engine
echo 
echo [logger_alembic]
echo level = INFO
echo handlers =
echo qualname = alembic
echo 
echo [handler_console]
echo class = StreamHandler
echo args = (sys.stderr,)
echo level = NOTSET
echo formatter = generic
echo 
echo [formatter_generic]
echo format = %%(levelname)-5.5s [%%(name)s] %%(message)s
echo datefmt = %%H:%%M:%%S
> migrations\alembic.ini

:: Create env.py
echo Creating env.py...
echo from __future__ import with_statement
echo 
echo import logging
echo from logging.config import fileConfig
echo 
echo from flask import current_app
echo 
echo from alembic import context
echo 
echo # this is the Alembic Config object, which provides
echo # access to the values within the .ini file in use.
echo config = context.config
echo 
echo # Interpret the config file for Python logging.
echo # This line sets up loggers basically.
echo fileConfig(config.config_file_name)
echo logger = logging.getLogger('alembic.env')
echo 
echo # add your model's MetaData object here
echo # for 'autogenerate' support
echo # from myapp import mymodel
echo # target_metadata = mymodel.Base.metadata
echo config.set_main_option(
echo     'sqlalchemy.url',
echo     str(current_app.extensions['migrate'].db.get_engine().url).replace(
echo         '%%', '%%%%'))
echo target_metadata = current_app.extensions['migrate'].db.metadata
echo 
echo # other values from the config, defined by the needs of env.py,
echo # can be acquired:
echo # my_important_option = config.get_main_option("my_important_option")
echo # ... etc.
echo 
echo 
echo def run_migrations_offline():
echo     """Run migrations in 'offline' mode.
echo 
echo     This configures the context with just a URL
echo     and not an Engine, though an Engine is acceptable
echo     here as well.  By skipping the Engine creation
echo     we don't even need a DBAPI to be available.
echo 
echo     Calls to context.execute() here emit the given string to the
echo     script output.
echo 
echo     """
echo     url = config.get_main_option("sqlalchemy.url")
echo     context.configure(
echo         url=url, target_metadata=target_metadata, literal_binds=True
echo     )
echo 
echo     with context.begin_transaction():
echo         context.run_migrations()
echo 
echo 
echo def run_migrations_online():
echo     """Run migrations in 'online' mode.
echo 
echo     In this scenario we need to create an Engine
echo     and associate a connection with the context.
echo 
echo     """
echo 
echo     # this callback is used to prevent an auto-migration from being generated
echo     # when there are no changes to the schema
echo     # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
echo     def process_revision_directives(context, revision, directives):
echo         if getattr(config.cmd_opts, 'autogenerate', False):
echo             script = directives[0]
echo             if script.upgrade_ops.is_empty():
echo                 directives[:] = []
echo                 logger.info('No changes in schema detected.')
echo 
echo     connectable = current_app.extensions['migrate'].db.get_engine()
echo 
echo     with connectable.connect() as connection:
echo         context.configure(
echo             connection=connection,
echo             target_metadata=target_metadata,
echo             process_revision_directives=process_revision_directives,
echo             **current_app.extensions['migrate'].configure_args
echo         )
echo 
echo         with context.begin_transaction():
echo             context.run_migrations()
echo 
echo 
echo if context.is_offline_mode():
echo     run_migrations_offline()
echo else:
echo     run_migrations_online()
> migrations\env.py

:: Create script.py.mako
echo Creating script.py.mako...
echo """${message}
echo 
echo Revision ID: ${up_revision}
echo Revises: ${down_revision | comma,n}
echo Create Date: ${create_date}
echo 
echo """
echo from alembic import op
echo import sqlalchemy as sa
echo ${imports if imports else ""}
echo 
echo # revision identifiers, used by Alembic
echo revision = ${repr(up_revision)}
echo down_revision = ${repr(down_revision)}
echo branch_labels = ${repr(branch_labels)}
echo depends_on = ${repr(depends_on)}
echo 
echo 
echo def upgrade():
echo     ${upgrades if upgrades else "pass"}
echo 
echo 
echo def downgrade():
echo     ${downgrades if downgrades else "pass"}
> migrations\script.py.mako

echo ======================================================
echo Migration files created!
echo ======================================================
echo.
echo Now you should:
echo 1. Run direct-db-fix.bat to fix the database schema
echo 2. Restart the application: docker compose restart
echo 3. Run migrations: docker compose exec cone-app flask db stamp head
echo.
pause
