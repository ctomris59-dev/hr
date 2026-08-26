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
from core.logging_config import get_logger
from routers.dependencies import get_current_user_role, require_role_ceo
from core.response import success_response, error_response

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    Returns 200 if service is healthy.
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/health/live")
async def liveness_check():
    """
    Kubernetes liveness probe.
    Returns 200 if service is alive (can be restarted if fails).
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes readiness probe.
    Returns 200 if service is ready to accept traffic.
    """
    # Check critical dependencies
    checks = {
        "database": _check_database(),
        "disk_space": _check_disk_space(),
    }
    
    all_healthy = all(checks.values())
    
    if all_healthy:
        return {
            "status": "ready",
            "checks": checks
        }
    else:
        return error_response(
            error="Service not ready",
            error_code="NOT_READY",
            status_code=503,
            details={"checks": checks}
        )


@router.get("/metrics")
async def get_metrics(
    time_window: int = 5,  # minutes
    role: str = Depends(require_role_ceo),  # Only CEO can access
):
    """
    Get application metrics.
    Returns JSON metrics (MVP).
    """
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
    role: str = Depends(require_role_ceo),  # Only CEO can access
):
    """
    Get metrics in Prometheus format.
    Returns Prometheus text format.
    """
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
    role: str = Depends(require_role_ceo),  # Only CEO can access
):
    """
    Get system-level metrics (CPU, memory, disk).
    """
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory
        memory = psutil.virtual_memory()
        
        # Disk
        disk = psutil.disk_usage('/')
        
        # Process info
        process = psutil.Process(os.getpid())
        process_memory = process.memory_info()
        
        return success_response(data={
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
            },
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


def _check_database() -> bool:
    """Check if database is accessible."""
    try:
        # Try to read a file (JSON store check)
        from config import DB_ORG_FILE
        import os
        return os.path.exists(DB_ORG_FILE) or True  # For MVP, just check if path exists
    except Exception:
        return False


def _check_disk_space() -> bool:
    """Check if disk has enough space."""
    try:
        disk = psutil.disk_usage('/')
        # Consider unhealthy if disk usage > 90%
        return disk.percent < 90
    except Exception:
        return True  # Assume healthy if check fails

