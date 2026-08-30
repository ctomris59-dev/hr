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

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False

    # CORS / host boundary
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    ALLOWED_HOSTS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: Optional[str] = None

    # Legacy/demo persistence
    DB_BASE_DIR: str = "database"
    DATA_MODE: str = "demo"  # demo | database
    ALLOW_LEGACY_API_IN_SAAS: bool = False

    # SaaS database. Production should use PostgreSQL.
    DATABASE_URL: Optional[str] = None
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # Security / JWT
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 20
    REFRESH_TOKEN_DAYS: int = 7
    SAAS_AUTH_ENABLED: bool = False
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCK_MINUTES: int = 15

    # API
    API_PREFIX: str = "/api"
    API_V1_PREFIX: str = "/api/v1"

    # Rate limiting. Edge/gateway rate limiting is still recommended in production.
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def is_database_mode(self) -> bool:
        return self.DATA_MODE.lower() == "database"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production" or self.APP_ENV.lower() == "production"

    @property
    def secure_auth_ready(self) -> bool:
        return bool(
            self.SAAS_AUTH_ENABLED
            and self.DATABASE_URL
            and self.SECRET_KEY
            and self.SECRET_KEY != "change-me-in-production"
            and len(self.SECRET_KEY) >= 32
        )

    @property
    def production_issues(self) -> list[str]:
        """Return fail-closed configuration violations without exposing secrets."""
        if not self.is_production:
            return []
        issues: list[str] = []
        if self.DEBUG:
            issues.append("DEBUG must be false")
        if not self.is_database_mode:
            issues.append("DATA_MODE must be database")
        if not self.SAAS_AUTH_ENABLED:
            issues.append("SAAS_AUTH_ENABLED must be true")
        if not self.DATABASE_URL:
            issues.append("DATABASE_URL is required")
        if not self.SECRET_KEY or self.SECRET_KEY == "change-me-in-production" or len(self.SECRET_KEY) < 32:
            issues.append("SECRET_KEY must be a non-default value of at least 32 characters")
        if not self.ALLOWED_HOSTS or "*" in self.ALLOWED_HOSTS:
            issues.append("ALLOWED_HOSTS must explicitly list production hosts")
        if not self.CORS_ORIGINS or "*" in self.CORS_ORIGINS:
            issues.append("CORS_ORIGINS must explicitly list trusted origins")
        if self.ALLOW_LEGACY_API_IN_SAAS:
            issues.append("ALLOW_LEGACY_API_IN_SAAS must be false")
        if self.LOGIN_MAX_ATTEMPTS < 3 or self.LOGIN_MAX_ATTEMPTS > 10:
            issues.append("LOGIN_MAX_ATTEMPTS must be between 3 and 10")
        if self.LOGIN_LOCK_MINUTES < 5:
            issues.append("LOGIN_LOCK_MINUTES must be at least 5")
        return issues

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
