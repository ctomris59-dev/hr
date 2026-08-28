"""FutureHR SQL database foundation.

The current prototype continues to run in DATA_MODE=demo.  When DATA_MODE=database
and DATABASE_URL is configured, new SaaS endpoints use PostgreSQL through this
module.  Keeping both paths available lets us migrate module-by-module without
breaking the existing demo.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


def normalize_database_url(raw_url: str | None) -> str:
    """Normalize common hosted PostgreSQL URLs for SQLAlchemy + psycopg 3."""
    if not raw_url:
        # Development-only fallback.  The file is not touched unless a DB session
        # is actually opened.  Production must provide DATABASE_URL.
        return "sqlite:///./futurehr_dev.db"
    if raw_url.startswith("postgres://"):
        return "postgresql+psycopg://" + raw_url[len("postgres://") :]
    if raw_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + raw_url[len("postgresql://") :]
    return raw_url


DATABASE_URL = normalize_database_url(settings.DATABASE_URL)


def _build_engine() -> Engine:
    kwargs: dict = {
        "pool_pre_ping": True,
        "echo": settings.DB_ECHO,
    }
    if DATABASE_URL.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    return create_engine(DATABASE_URL, **kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """Context manager for scripts and non-request code."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def database_configured() -> bool:
    """Return True only when a real DATABASE_URL has been supplied."""
    return bool(settings.DATABASE_URL)


def check_database_connection() -> bool:
    """Perform a lightweight connection test without leaking connection details."""
    if not database_configured():
        return False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
