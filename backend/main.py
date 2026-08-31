"""
FastAPI Backend API - FutureHR

The legacy/demo routes remain available for local demo mode. In secure SaaS mode,
unversioned legacy data endpoints are fail-closed so tenant isolation cannot be
bypassed while modules are migrated to /api/v1.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware
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

from routers import (
    recruitment,
    org_chart,
    admin,
    dashboard,
    audit,
    workflow,
    observability,
    auth_v1,
    people_v1,
    employee_experience,
    performance_v1,
    talent_v1,
    workforce_ops_v1,
    decision_intelligence_v1,
    recruitment_v1,
    compensation_intelligence_v1,
)

settings = get_settings()

setup_logging()
logger = get_logger(__name__)

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

# TrustedHost is meaningful only once production hosts have been explicitly set.
if settings.is_production and settings.ALLOWED_HOSTS and "*" not in settings.ALLOWED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)


@app.middleware("http")
async def secure_saas_api_boundary(request: Request, call_next):
    """Prevent legacy/demo API routes from bypassing tenant-aware /api/v1 auth."""
    path = request.url.path
    secure_mode = settings.SAAS_AUTH_ENABLED or settings.is_production
    if (
        secure_mode
        and not settings.ALLOW_LEGACY_API_IN_SAAS
        and path.startswith("/api/")
        and not path.startswith("/api/v1/")
    ):
        return JSONResponse(
            status_code=410,
            content={
                "success": False,
                "detail": "This legacy endpoint is disabled in secure SaaS mode. Use the tenant-scoped /api/v1 API.",
            },
        )
    return await call_next(request)


@app.middleware("http")
async def protect_legacy_raw_pulse_endpoint(request: Request, call_next):
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

# Existing demo/application routes. The middleware above blocks them in secure SaaS mode.
app.include_router(recruitment.router)
app.include_router(org_chart.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(employee_experience.router)
app.include_router(audit.router)
app.include_router(workflow.router)
app.include_router(observability.router)

# Tenant-scoped/versioned SaaS surface.
app.include_router(auth_v1.router)
app.include_router(people_v1.router)
app.include_router(performance_v1.router)
app.include_router(talent_v1.router)
app.include_router(workforce_ops_v1.router)
app.include_router(decision_intelligence_v1.router)
app.include_router(recruitment_v1.router)
app.include_router(compensation_intelligence_v1.router)


@app.on_event("startup")
async def startup_event():
    production_issues = settings.production_issues
    if production_issues:
        raise RuntimeError("Production security configuration invalid: " + "; ".join(production_issues))

    if settings.SAAS_AUTH_ENABLED:
        if not settings.DATABASE_URL:
            raise RuntimeError("SAAS_AUTH_ENABLED requires DATABASE_URL")
        if settings.SECRET_KEY == "change-me-in-production" or len(settings.SECRET_KEY) < 32:
            raise RuntimeError("SAAS_AUTH_ENABLED requires a strong SECRET_KEY of at least 32 characters")

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
            "legacy_api_allowed": settings.ALLOW_LEGACY_API_IN_SAAS,
        },
    )


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")


@app.get("/health")
async def health_check():
    database_ok = check_database_connection() if settings.SAAS_AUTH_ENABLED else None
    readiness_issues = settings.production_issues
    ready = not readiness_issues and database_ok is not False
    return {
        "status": "healthy" if ready else "degraded",
        "ready": ready,
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "data_mode": settings.DATA_MODE,
        "secure_auth_enabled": settings.SAAS_AUTH_ENABLED,
        "database_configured": database_configured(),
        "database_ok": database_ok,
        "legacy_api_allowed": settings.ALLOW_LEGACY_API_IN_SAAS,
        "readiness_issue_count": len(readiness_issues),
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
