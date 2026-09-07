"""Safe application of Alembic migrations for the single-instance SaaS service."""
from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

from core.logging_config import get_logger

logger = get_logger(__name__)


def upgrade_database_to_head() -> None:
    config_path = Path(__file__).resolve().parents[1] / "alembic.ini"
    config = Config(str(config_path))
    command.upgrade(config, "head")
    logger.info("Database migrations are at Alembic head")
