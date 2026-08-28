"""
Application Configuration using Pydantic BaseSettings.
Environment-based configuration with validation.
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    APP_NAME: str = "FutureHR API"
    APP_VERSION: str = "2.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    APP_ENV: str = "development"  # Alias for ENVIRONMENT, can be set via APP_ENV env var
    # NOTE: Default remains development/demo so the current prototype keeps working.

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FORMAT: str = "json"  # json, text
    LOG_FILE: Optional[str] = None  # If None, logs to stdout

    # Legacy/demo persistence
    DB_BASE_DIR: str = "database"
    DATA_MODE: str = "demo"  # demo | database

    # SaaS database. Production should use PostgreSQL.
    # Accepted examples:
    # postgresql://user:password@host:5432/futurehr
    # postgres://user:password@host:5432/futurehr
    DATABASE_URL: Optional[str] = None
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Security / JWT
    SECRET_KEY: str = "change-me-in-production"  # MUST be changed before secure auth is enabled
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 20
    REFRESH_TOKEN_DAYS: int = 7
    SAAS_AUTH_ENABLED: bool = False
    ALLOWED_HOSTS: List[str] = ["*"]  # Restrict in production

    # API
    API_PREFIX: str = "/api"
    API_V1_PREFIX: str = "/api/v1"

    # Rate Limiting (future)
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def is_database_mode(self) -> bool:
        return self.DATA_MODE.lower() == "database"

    @property
    def secure_auth_ready(self) -> bool:
        return bool(
            self.SAAS_AUTH_ENABLED
            and self.DATABASE_URL
            and self.SECRET_KEY
            and self.SECRET_KEY != "change-me-in-production"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience instance for legacy imports.
settings = get_settings()
