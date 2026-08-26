"""
Metrics Middleware - Collects request metrics
"""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from core.metrics.collector import get_metrics_collector
from core.logging_config import get_logger

logger = get_logger(__name__)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware to collect request metrics."""
    
    async def dispatch(self, request: Request, call_next):
        """Collect metrics for each request."""
        start_time = time.time()
        
        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
            error = status_code >= 400
        except Exception as e:
            # Exception occurred
            status_code = 500
            error = True
            raise
        finally:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Record metric
            try:
                metrics_collector = get_metrics_collector()
                metrics_collector.record_request(
                    path=request.url.path,
                    method=request.method,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    error=error
                )
            except Exception as e:
                # Don't fail request if metrics collection fails
                logger.error(f"Failed to record metric: {e}")
        
        return response

