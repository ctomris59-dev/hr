# Observability System
## Complete Observability Solution for FastAPI + Next.js

---

## 1. BACKEND OBSERVABILITY

### 1.1 Health Check Endpoints

**MVP Endpoints:**
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)

**Enterprise Endpoints:**
- `GET /health/detailed` - Detailed health with dependency checks
- `GET /health/dependencies` - Individual dependency health

**Örnek Response:**
```json
{
  "status": "healthy",
  "timestamp": 1706356800.0,
  "service": "HR System API",
  "version": "2.0.0"
}
```

### 1.2 Metrics Collection

**MVP: In-Memory Metrics**
- Request count by path
- Request duration (avg, p50, p95, p99)
- Error count and error rate
- Status code distribution

**Endpoints:**
- `GET /metrics` - JSON metrics (time-windowed)
- `GET /metrics/prometheus` - Prometheus format
- `GET /metrics/system` - System metrics (CPU, memory, disk)

**Örnek Metrics Response:**
```json
{
  "time_window_minutes": 5,
  "total_requests": 1250,
  "total_errors": 12,
  "error_rate_percent": 0.96,
  "uptime_seconds": 86400,
  "status_codes": {
    "200": 1200,
    "400": 5,
    "500": 7
  },
  "by_path": {
    "GET /api/org-chart": {
      "request_count": 450,
      "error_count": 2,
      "error_rate_percent": 0.44,
      "avg_duration_ms": 45.2,
      "p50_duration_ms": 42.1,
      "p95_duration_ms": 78.5,
      "p99_duration_ms": 120.3
    }
  }
}
```

### 1.3 Tracing Approach

**MVP: Request ID Tracing**
- Every request gets a unique `X-Request-ID`
- Request ID is logged in all log entries
- Request ID is returned in response headers

**Enterprise: OpenTelemetry**
- Distributed tracing across services
- Trace context propagation
- Integration with Jaeger/Zipkin

**Örnek:**
```python
# Request ID is automatically added by middleware
# Logs include request_id:
{
  "timestamp": "2025-01-27T10:00:00Z",
  "level": "INFO",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Request completed",
  "path": "/api/org-chart",
  "duration_ms": 45.2
}
```

---

## 2. FRONTEND OBSERVABILITY

### 2.1 API Error Tracking

**MVP: Console Logging + Error Boundary**
- React Error Boundary for component errors
- Console logging for API errors
- Error details in development mode

**Enterprise: Sentry Integration**
- Automatic error capture
- Error grouping and deduplication
- User context and breadcrumbs
- Release tracking

**Örnek Error Tracking:**
```typescript
// utils/errorTracking.ts
export function trackError(error: Error, context?: Record<string, any>) {
  // MVP: Console log
  console.error("Error:", error, context);
  
  // Enterprise: Send to Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

// API call wrapper
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = new Error(`API Error: ${response.status}`);
      trackError(error, { url, status: response.status });
      throw error;
    }
    return await response.json();
  } catch (error) {
    trackError(error as Error, { url });
    throw error;
  }
}
```

### 2.2 Performance Measurement

**MVP: Custom Performance API**
- Measure API call duration
- Track page load times
- Log slow operations

**Enterprise: Web Vitals**
- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Performance budgets

**Örnek Performance Tracking:**
```typescript
// utils/performance.ts
export function measurePerformance(name: string, fn: () => Promise<any>) {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    
    // Enterprise: Send to analytics
    if (duration > 1000) {
      trackSlowOperation(name, duration);
    }
  });
}

// Usage
await measurePerformance("fetchOrgChart", async () => {
  return await fetch("/api/org-chart");
});
```

---

## 3. TOOL ÖNERİLERİ

### 3.1 OpenTelemetry (Enterprise)

**Kullanım:**
- Distributed tracing
- Metrics collection
- Log correlation

**Kurulum:**
```python
# requirements.txt
opentelemetry-api==1.21.0
opentelemetry-sdk==1.21.0
opentelemetry-instrumentation-fastapi==0.42b0
opentelemetry-exporter-jaeger==1.21.0
```

**Konfigürasyon:**
```python
# main.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

# Setup tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)
```

### 3.2 Prometheus / Grafana (Enterprise)

**Kurulum:**
```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**Prometheus Config:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'fastapi'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics/prometheus'
```

**Grafana Dashboards:**
- Request rate
- Error rate
- Latency (p50, p95, p99)
- System metrics (CPU, memory)

### 3.3 Sentry (Enterprise)

**Backend Integration:**
```python
# requirements.txt
sentry-sdk[fastapi]==1.38.0

# main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # 10% of transactions
    environment=settings.ENVIRONMENT,
)
```

**Frontend Integration:**
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## 4. MVP vs ENTERPRISE

### 4.1 MVP Observability Checklist

**Backend:**
- ✅ Health check endpoints (`/health`, `/health/live`, `/health/ready`)
- ✅ In-memory metrics collection
- ✅ Request ID tracing
- ✅ Structured logging (JSON)
- ✅ Error logging with context
- ✅ Basic metrics endpoint (`/metrics`)

**Frontend:**
- ✅ Error boundary
- ✅ Console error logging
- ✅ API error tracking
- ✅ Basic performance measurement

**Tools:**
- ❌ OpenTelemetry (not needed for MVP)
- ❌ Prometheus/Grafana (not needed for MVP)
- ❌ Sentry (optional, can add later)

### 4.2 Enterprise Observability Checklist

**Backend:**
- ✅ All MVP features
- ✅ Prometheus metrics export
- ✅ OpenTelemetry distributed tracing
- ✅ Sentry error tracking
- ✅ Advanced health checks (dependency checks)
- ✅ Custom metrics (business metrics)
- ✅ Alerting integration

**Frontend:**
- ✅ All MVP features
- ✅ Sentry error tracking
- ✅ Web Vitals monitoring
- ✅ Real User Monitoring (RUM)
- ✅ Performance budgets
- ✅ Error grouping and deduplication

**Tools:**
- ✅ OpenTelemetry
- ✅ Prometheus + Grafana
- ✅ Sentry
- ✅ Jaeger (tracing)
- ✅ ELK Stack (optional, for log aggregation)

---

## 5. HANGİ METRİKLER GERÇEK DEĞER ÜRETİR?

### 5.1 Critical Metrics (Must Have)

| Metric | Açıklama | Değer |
|--------|----------|-------|
| **Request Rate** | Saniyede kaç request | Sistem yükünü gösterir |
| **Error Rate** | Hata yüzdesi | Sistem sağlığını gösterir |
| **Latency (p95)** | %95 request'in süresi | Kullanıcı deneyimini gösterir |
| **Uptime** | Servis çalışma süresi | Availability gösterir |

**Hedef Değerler:**
- Error Rate: < 1%
- p95 Latency: < 500ms (API calls)
- Uptime: > 99.9%

### 5.2 Business Metrics (Value-Adding)

| Metric | Açıklama | Değer |
|--------|----------|-------|
| **API Endpoint Usage** | Hangi endpoint'ler çok kullanılıyor? | Önceliklendirme |
| **Slow Endpoints** | Hangi endpoint'ler yavaş? | Optimizasyon fırsatları |
| **Error Patterns** | Hangi hatalar tekrar ediyor? | Bug fixing öncelikleri |
| **User Activity** | Aktif kullanıcı sayısı | Business health |

**Örnek:**
```json
{
  "by_path": {
    "GET /api/org-chart": {
      "request_count": 450,
      "p95_duration_ms": 78.5,  // Bu endpoint yavaş!
      "error_rate_percent": 0.44
    },
    "GET /api/talent-matrix": {
      "request_count": 200,
      "p95_duration_ms": 120.3,  // Bu daha da yavaş!
      "error_rate_percent": 1.5  // Ve daha fazla hata!
    }
  }
}
```

**Aksiyon:**
- `/api/talent-matrix` optimize edilmeli (en yavaş ve en çok hata veren)
- `/api/org-chart` da optimize edilebilir

### 5.3 System Metrics (Infrastructure)

| Metric | Açıklama | Değer |
|--------|----------|-------|
| **CPU Usage** | CPU kullanımı | Scaling kararları |
| **Memory Usage** | Memory kullanımı | Memory leak detection |
| **Disk Usage** | Disk kullanımı | Disk space alerts |
| **Request Queue** | Bekleyen request sayısı | Backpressure detection |

**Hedef Değerler:**
- CPU Usage: < 70%
- Memory Usage: < 80%
- Disk Usage: < 85%

### 5.4 User Experience Metrics (Frontend)

| Metric | Açıklama | Değer |
|--------|----------|-------|
| **Page Load Time** | Sayfa yükleme süresi | Kullanıcı deneyimi |
| **API Call Duration** | API çağrı süresi | Backend performance |
| **Error Rate (Frontend)** | Frontend hata oranı | Code quality |
| **Core Web Vitals** | LCP, FID, CLS | SEO ve UX |

**Hedef Değerler:**
- Page Load Time: < 2s
- API Call Duration: < 500ms (p95)
- Error Rate: < 0.1%

---

## 6. KOD ÖRNEKLERİ

### 6.1 Backend Metrics Middleware

```python
# core/metrics/middleware.py
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        try:
            response = await call_next(request)
            status_code = response.status_code
        finally:
            duration_ms = (time.time() - start_time) * 1000
            metrics_collector.record_request(
                path=request.url.path,
                method=request.method,
                status_code=status_code,
                duration_ms=duration_ms
            )
        return response
```

### 6.2 Frontend Error Tracking

```typescript
// utils/errorTracking.ts
export class ErrorTracker {
  static trackError(error: Error, context?: Record<string, any>) {
    // MVP: Console
    console.error("Error:", error, context);
    
    // Enterprise: Sentry
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context });
    }
  }
  
  static trackAPIError(url: string, status: number, response?: any) {
    this.trackError(
      new Error(`API Error: ${status}`),
      { url, status, response }
    );
  }
}
```

### 6.3 Performance Measurement

```typescript
// utils/performance.ts
export class PerformanceTracker {
  static measure(name: string, fn: () => Promise<any>) {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      
      // Alert if slow
      if (duration > 1000) {
        console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
    });
  }
}
```

---

## 7. KONFIGÜRASYON ÖRNEKLERİ

### 7.1 Environment Variables

```env
# .env
# Observability
ENABLE_METRICS=true
ENABLE_TRACING=false  # Enterprise only
METRICS_RETENTION_MINUTES=60

# Sentry (Enterprise)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Prometheus (Enterprise)
PROMETHEUS_ENABLED=false
PROMETHEUS_PORT=9090
```

### 7.2 Docker Compose (Enterprise)

```yaml
# docker-compose.observability.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
  
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "6831:6831/udp"  # Agent
```

---

## 8. SONUÇ

**MVP Observability:**
- ✅ Health checks
- ✅ In-memory metrics
- ✅ Request ID tracing
- ✅ Structured logging
- ✅ Basic error tracking

**Enterprise Observability:**
- ✅ Prometheus + Grafana
- ✅ OpenTelemetry tracing
- ✅ Sentry error tracking
- ✅ Advanced metrics
- ✅ Alerting

**Değerli Metrikler:**
- Request rate, error rate, latency (p95)
- Business metrics (endpoint usage, slow endpoints)
- System metrics (CPU, memory, disk)
- User experience metrics (page load, API duration)

**Production Ready:** ✅ MVP ready, Enterprise features optional

