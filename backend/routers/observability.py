"""
Observability API Endpoints
Health checks, metrics, and monitoring
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
import time
import psutil
import os

from core.metrics.collector import get_metrics_collector
from core.config import get_settings
from core.database import check_database_connection, database_configured
from core.logging_config import get_logger
from routers.dependencies import get_current_user_role, require_role_ceo
from core.response import success_response, error_response

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/health/basic")
async def basic_health_check():
    """Lightweight diagnostic endpoint; /health is the canonical readiness-aware probe."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/health/live")
async def liveness_check():
    """Process liveness probe. It intentionally does not test dependencies."""
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_check():
    """Dependency-aware readiness probe for orchestrators and diagnostics."""
    database_ok = check_database_connection() if settings.SAAS_AUTH_ENABLED else None
    issues = settings.production_issues
    ready = not issues and database_ok is not False
    payload = {
        "status": "ready" if ready else "not_ready",
        "ready": ready,
        "checks": {
            "database_configured": database_configured(),
            "database": database_ok,
            "secure_auth": settings.SAAS_AUTH_ENABLED,
            "production_configuration": not issues,
            "disk_space": _check_disk_space(),
        },
        "readiness_issue_count": len(issues),
    }
    if ready:
        return payload
    return error_response(
        error="Service not ready",
        error_code="NOT_READY",
        status_code=503,
        details=payload,
    )


@router.get("/metrics")
async def get_metrics(
    time_window: int = 5,
    role: str = Depends(require_role_ceo),
):
    try:
        metrics_collector = get_metrics_collector()
        metrics = metrics_collector.get_metrics(time_window_minutes=time_window)
        return success_response(data=metrics)
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        return error_response(
            error=str(e),
            error_code="METRICS_ERROR",
            status_code=500
        )


@router.get("/metrics/prometheus")
async def get_prometheus_metrics(
    role: str = Depends(require_role_ceo),
):
    try:
        from fastapi.responses import Response
        metrics_collector = get_metrics_collector()
        prometheus_metrics = metrics_collector.get_prometheus_metrics()
        return Response(
            content=prometheus_metrics,
            media_type="text/plain; version=0.0.4"
        )
    except Exception as e:
        logger.error(f"Failed to get Prometheus metrics: {e}")
        return error_response(
            error=str(e),
            error_code="METRICS_ERROR",
            status_code=500
        )


@router.get("/metrics/system")
async def get_system_metrics(
    role: str = Depends(require_role_ceo),
):
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        process = psutil.Process(os.getpid())
        process_memory = process.memory_info()
        return success_response(data={
            "cpu": {"percent": cpu_percent, "count": cpu_count},
            "memory": {
                "total_mb": round(memory.total / (1024 * 1024), 2),
                "available_mb": round(memory.available / (1024 * 1024), 2),
                "used_mb": round(memory.used / (1024 * 1024), 2),
                "percent": memory.percent,
            },
            "disk": {
                "total_gb": round(disk.total / (1024 * 1024 * 1024), 2),
                "used_gb": round(disk.used / (1024 * 1024 * 1024), 2),
                "free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
                "percent": disk.percent,
            },
            "process": {
                "memory_mb": round(process_memory.rss / (1024 * 1024), 2),
                "cpu_percent": process.cpu_percent(interval=0.1),
            }
        })
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return error_response(
            error=str(e),
            error_code="SYSTEM_METRICS_ERROR",
            status_code=500
        )


def _check_disk_space() -> bool:
    try:
        disk = psutil.disk_usage('/')
        return disk.percent < 90
    except Exception:
        return True
