"""Production launcher for FutureHR.

Runs Alembic migrations under a PostgreSQL advisory lock, then replaces the
launcher process with Uvicorn. This makes startup migration-safe even on hosts
that do not provide a dedicated pre-deploy migration phase.
"""
from __future__ import annotations

import os
import subprocess
import sys
from contextlib import contextmanager

import psycopg

MIGRATION_LOCK_ID = 764_202_609_02


def required_env(name: str) -> str:
    value = str(os.environ.get(name, "")).strip()
    if not value:
        raise RuntimeError(f"{name} is required for production startup")
    return value


@contextmanager
def migration_lock(database_url: str):
    """Serialize schema migrations across concurrent service startups."""
    connection = psycopg.connect(database_url, autocommit=True)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_lock(%s)", (MIGRATION_LOCK_ID,))
        yield
    finally:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
        finally:
            connection.close()


def run_migrations(database_url: str) -> None:
    with migration_lock(database_url):
        print("[futurehr] applying database migrations", flush=True)
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
        print("[futurehr] database migrations complete", flush=True)


def start_api() -> None:
    port = str(os.environ.get("PORT", "10000")).strip() or "10000"
    workers = str(os.environ.get("WEB_CONCURRENCY", "1")).strip() or "1"
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        port,
        "--workers",
        workers,
        "--proxy-headers",
        "--forwarded-allow-ips=*",
    ]
    print(f"[futurehr] starting API on port {port} with {workers} worker(s)", flush=True)
    os.execvp(command[0], command)


def main() -> None:
    environment = str(os.environ.get("ENVIRONMENT") or os.environ.get("APP_ENV") or "").lower()
    if environment != "production":
        raise RuntimeError("Production launcher requires ENVIRONMENT=production or APP_ENV=production")
    database_url = required_env("DATABASE_URL")
    required_env("SECRET_KEY")
    run_migrations(database_url)
    start_api()


if __name__ == "__main__":
    main()
