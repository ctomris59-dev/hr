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
    APP_NAME: str = "HR System API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    APP_ENV: str = "development"  # Alias for ENVIRONMENT, can be set via APP_ENV env var
    # NOTE: Default is "development" for local dev. Set APP_ENV=production for production.
    
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
    
    # Database
    DB_BASE_DIR: str = "database"
    
    # Security
    SECRET_KEY: str = "change-me-in-production"  # MUST be changed in production
    ALLOWED_HOSTS: List[str] = ["*"]  # Restrict in production
    
    # API
    API_PREFIX: str = "/api"
    API_V1_PREFIX: str = "/api/v1"
    
    # Rate Limiting (future)
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Allow reading from environment variables
        # Example: LOG_LEVEL=DEBUG python main.py


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Settings are loaded once and cached.
    """
    return Settings()


# Convenience function
settings = get_settings()

