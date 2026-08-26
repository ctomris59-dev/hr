"""
FastAPI Backend API - HR System (Production Ready)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import get_settings
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

from routers import recruitment, org_chart, admin, dashboard, audit, workflow, observability

# Initialize settings
settings = get_settings()

# Setup logging (must be done before creating app)
setup_logging()
logger = get_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,  # Disable redoc in production
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Add metrics middleware (collects request metrics)
app.add_middleware(MetricsMiddleware)

# Add audit middleware (tracks unauthorized access, optional full request tracking)
app.add_middleware(AuditMiddleware, track_all_requests=False)  # Set to True for full tracking

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(recruitment.router)
app.include_router(org_chart.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(workflow.router)
app.include_router(observability.router)


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(
        "Application starting up",
        extra={
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
        }
    )


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("Application shutting down")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD and settings.DEBUG,
        log_config=None,  # Use our custom logging
    )
