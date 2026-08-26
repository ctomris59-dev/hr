"""
Metrics Collector - Collects application metrics
MVP: In-memory metrics
Enterprise: Prometheus integration
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import threading
import time

from core.logging_config import get_logger

logger = get_logger(__name__)


class MetricsCollector:
    """
    Collects application metrics.
    
    MVP: In-memory storage
    Enterprise: Prometheus integration
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        
        # Request metrics
        self._request_count = defaultdict(int)  # path -> count
        self._request_duration = defaultdict(list)  # path -> [durations]
        self._error_count = defaultdict(int)  # path -> error count
        self._status_codes = defaultdict(int)  # status_code -> count
        
        # Timestamps for time-windowed metrics
        self._request_timestamps = deque()  # (timestamp, path, status_code, duration)
        self._max_timestamps = 10000  # Keep last 10k requests
        
        # System metrics
        self._start_time = time.time()
    
    def record_request(
        self,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float,
        error: bool = False
    ) -> None:
        """Record a request metric."""
        with self._lock:
            # Request count
            key = f"{method} {path}"
            self._request_count[key] += 1
            
            # Duration
            self._request_duration[key].append(duration_ms)
            # Keep only last 1000 durations per path
            if len(self._request_duration[key]) > 1000:
                self._request_duration[key] = self._request_duration[key][-1000:]
            
            # Error count
            if error or status_code >= 400:
                self._error_count[key] += 1
            
            # Status codes
            self._status_codes[status_code] += 1
            
            # Timestamps (for time-windowed queries)
            self._request_timestamps.append((
                time.time(),
                key,
                status_code,
                duration_ms
            ))
            # Keep only last N timestamps
            if len(self._request_timestamps) > self._max_timestamps:
                self._request_timestamps.popleft()
    
    def get_metrics(self, time_window_minutes: int = 5) -> Dict:
        """
        Get aggregated metrics.
        
        Args:
            time_window_minutes: Time window for metrics (default: 5 minutes)
        """
        with self._lock:
            cutoff_time = time.time() - (time_window_minutes * 60)
            
            # Filter timestamps by time window
            recent_requests = [
                ts for ts in self._request_timestamps
                if ts[0] >= cutoff_time
            ]
            
            # Calculate metrics
            total_requests = len(recent_requests)
            total_errors = sum(1 for ts in recent_requests if ts[2] >= 400)
            
            # Request count by path
            request_count_by_path = defaultdict(int)
            error_count_by_path = defaultdict(int)
            duration_by_path = defaultdict(list)
            
            for ts in recent_requests:
                path = ts[1]
                status_code = ts[2]
                duration = ts[3]
                
                request_count_by_path[path] += 1
                if status_code >= 400:
                    error_count_by_path[path] += 1
                duration_by_path[path].append(duration)
            
            # Calculate averages
            avg_duration_by_path = {
                path: sum(durations) / len(durations) if durations else 0
                for path, durations in duration_by_path.items()
            }
            
            # P50, P95, P99 percentiles
            def percentile(values: List[float], p: float) -> float:
                if not values:
                    return 0
                sorted_values = sorted(values)
                index = int(len(sorted_values) * p)
                return sorted_values[min(index, len(sorted_values) - 1)]
            
            p50_by_path = {
                path: percentile(durations, 0.50)
                for path, durations in duration_by_path.items()
            }
            p95_by_path = {
                path: percentile(durations, 0.95)
                for path, durations in duration_by_path.items()
            }
            p99_by_path = {
                path: percentile(durations, 0.99)
                for path, durations in duration_by_path.items()
            }
            
            # Error rate
            error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
            
            # Uptime
            uptime_seconds = time.time() - self._start_time
            
            return {
                "time_window_minutes": time_window_minutes,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate_percent": round(error_rate, 2),
                "uptime_seconds": round(uptime_seconds, 2),
                "status_codes": dict(self._status_codes),
                "by_path": {
                    path: {
                        "request_count": request_count_by_path[path],
                        "error_count": error_count_by_path[path],
                        "error_rate_percent": round(
                            (error_count_by_path[path] / request_count_by_path[path] * 100)
                            if request_count_by_path[path] > 0 else 0,
                            2
                        ),
                        "avg_duration_ms": round(avg_duration_by_path.get(path, 0), 2),
                        "p50_duration_ms": round(p50_by_path.get(path, 0), 2),
                        "p95_duration_ms": round(p95_by_path.get(path, 0), 2),
                        "p99_duration_ms": round(p99_by_path.get(path, 0), 2),
                    }
                    for path in request_count_by_path.keys()
                }
            }
    
    def get_prometheus_metrics(self) -> str:
        """
        Get metrics in Prometheus format.
        
        Returns:
            Prometheus metrics string
        """
        metrics = self.get_metrics(time_window_minutes=60)  # Last hour
        
        lines = []
        
        # Uptime
        lines.append(f"# HELP app_uptime_seconds Application uptime in seconds")
        lines.append(f"# TYPE app_uptime_seconds gauge")
        lines.append(f"app_uptime_seconds {metrics['uptime_seconds']}")
        
        # Total requests
        lines.append(f"# HELP http_requests_total Total number of HTTP requests")
        lines.append(f"# TYPE http_requests_total counter")
        lines.append(f"http_requests_total {metrics['total_requests']}")
        
        # Total errors
        lines.append(f"# HELP http_errors_total Total number of HTTP errors")
        lines.append(f"# TYPE http_errors_total counter")
        lines.append(f"http_errors_total {metrics['total_errors']}")
        
        # Error rate
        lines.append(f"# HELP http_error_rate Error rate percentage")
        lines.append(f"# TYPE http_error_rate gauge")
        lines.append(f"http_error_rate {metrics['error_rate_percent']}")
        
        # By path
        for path, path_metrics in metrics.get("by_path", {}).items():
            # Request count
            lines.append(f"http_requests_total{{path=\"{path}\"}} {path_metrics['request_count']}")
            # Error count
            lines.append(f"http_errors_total{{path=\"{path}\"}} {path_metrics['error_count']}")
            # Duration
            lines.append(f"http_request_duration_ms{{path=\"{path}\",quantile=\"0.5\"}} {path_metrics['p50_duration_ms']}")
            lines.append(f"http_request_duration_ms{{path=\"{path}\",quantile=\"0.95\"}} {path_metrics['p95_duration_ms']}")
            lines.append(f"http_request_duration_ms{{path=\"{path}\",quantile=\"0.99\"}} {path_metrics['p99_duration_ms']}")
            lines.append(f"http_request_duration_ms_sum{{path=\"{path}\"}} {path_metrics['avg_duration_ms'] * path_metrics['request_count']}")
            lines.append(f"http_request_duration_ms_count{{path=\"{path}\"}} {path_metrics['request_count']}")
        
        # Status codes
        for status_code, count in metrics.get("status_codes", {}).items():
            lines.append(f"http_status_codes{{code=\"{status_code}\"}} {count}")
        
        return "\n".join(lines)
    
    def reset(self) -> None:
        """Reset all metrics (for testing)."""
        with self._lock:
            self._request_count.clear()
            self._request_duration.clear()
            self._error_count.clear()
            self._status_codes.clear()
            self._request_timestamps.clear()
            self._start_time = time.time()


# Global metrics collector instance
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector

