"""
FastAPI Backend API - FutureHR

The legacy/demo routes remain available while the new /api/v1 SaaS foundation is
migrated module-by-module. Secure auth is disabled by default and only activates
when SAAS_AUTH_ENABLED=true with DATABASE_URL and a non-default SECRET_KEY.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

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

from routers import recruitment, org_chart, admin, dashboard, audit, workflow, observability, auth_v1, people_v1, employee_experience

settings = get_settings()

setup_logging()
logger = get_logger(__name__)

# Privacy bridge: the legacy /api/pulse-trends endpoint now uses the same
# five-response anonymity threshold as Employee Experience v2.
employee_experience.install_legacy_privacy_guard()

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


@app.middleware("http")
async def protect_legacy_raw_pulse_endpoint(request: Request, call_next):
    # The old endpoint exposed person-level pulse rows. Keep the route disabled
    # so management surfaces can only consume privacy-safe aggregates.
    if request.url.path == "/api/pulse/data":
        return JSONResponse(
            status_code=410,
            content={
                "success": False,
                "detail": "Bireysel pulse verisi gizlilik nedeniyle kapatıldı. /api/pulse/analytics kullanın.",
            },
        )
    return await call_next(request)


app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Existing demo/application routes
app.include_router(recruitment.router)
app.include_router(org_chart.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(employee_experience.router)
app.include_router(audit.router)
app.include_router(workflow.router)
app.include_router(observability.router)

# New versioned SaaS foundation. These are additive and do not alter demo login.
app.include_router(auth_v1.router)
app.include_router(people_v1.router)


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
