"""
FastAPI Backend API - FutureHR

The legacy/demo routes remain available while the new /api/v1 SaaS foundation is
migrated module-by-module.  Secure auth is disabled by default and only activates
when SAAS_AUTH_ENABLED=true with DATABASE_URL and a non-default SECRET_KEY.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import get_settings
from core.database import check_database_connection, database_configured
from core.logging_config import setup_logging, get_logger
from core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    api_exception_handler,
    general_exception_handler,
    APIException,
)
from core.middleware import RequestLoggingMiddleware
from core.metrics.middleware import MetricsMiddleware
from core.audit.middleware import AuditMiddleware

from routers import recruitment, org_chart, admin, dashboard, audit, workflow, observability, auth_v1

settings = get_settings()

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(AuditMiddleware, track_all_requests=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Existing demo/application routes
app.include_router(recruitment.router)
app.include_router(org_chart.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(workflow.router)
app.include_router(observability.router)

# New versioned SaaS foundation.  It is additive and does not alter demo login.
app.include_router(auth_v1.router)


@app.on_event("startup")
async def startup_event():
    if settings.SAAS_AUTH_ENABLED:
        if not settings.DATABASE_URL:
            raise RuntimeError("SAAS_AUTH_ENABLED requires DATABASE_URL")
        if settings.SECRET_KEY == "change-me-in-production":
            raise RuntimeError("SAAS_AUTH_ENABLED requires a strong SECRET_KEY")

    logger.info(
        "Application starting up",
        extra={
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "data_mode": settings.DATA_MODE,
            "saas_auth_enabled": settings.SAAS_AUTH_ENABLED,
            "database_configured": database_configured(),
        },
    )


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")


@app.get("/health")
async def health_check():
    database_ok = check_database_connection() if settings.SAAS_AUTH_ENABLED else None
    return {
        "status": "healthy" if database_ok is not False else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "data_mode": settings.DATA_MODE,
        "secure_auth_enabled": settings.SAAS_AUTH_ENABLED,
        "database_configured": database_configured(),
        "database_ok": database_ok,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD and settings.DEBUG,
        log_config=None,
    )
