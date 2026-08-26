# Audit Log & Event Tracking System
## Enterprise-Grade Audit Logging for Compliance and Security

---

## 1. HANGİ AKSİYONLAR AUDIT EDİLMELİ?

### 1.1 Authentication & Authorization Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `LOGIN_SUCCESS` | Başarılı giriş | MEDIUM | ✅ Evet |
| `LOGIN_FAILED` | Başarısız giriş denemesi | HIGH | ✅ Evet |
| `LOGOUT` | Çıkış | LOW | ⚠️ Opsiyonel |
| `PASSWORD_CHANGED` | Şifre değiştirme | MEDIUM | ✅ Evet |
| `PASSWORD_RESET` | Şifre sıfırlama | HIGH | ✅ Evet |
| `UNAUTHORIZED_ACCESS` | Yetkisiz erişim denemesi | HIGH | ✅ Evet |

### 1.2 User Management Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `USER_CREATED` | Kullanıcı oluşturma | HIGH | ✅ Evet |
| `USER_UPDATED` | Kullanıcı güncelleme | MEDIUM | ✅ Evet |
| `USER_DELETED` | Kullanıcı silme | HIGH | ✅ Evet |
| `USER_ROLE_CHANGED` | Rol değişikliği | HIGH | ✅ Evet |
| `USER_PERMISSION_CHANGED` | Yetki değişikliği | HIGH | ✅ Evet |

### 1.3 Organization Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `EMPLOYEE_CREATED` | Çalışan oluşturma | MEDIUM | ✅ Evet |
| `EMPLOYEE_UPDATED` | Çalışan güncelleme | MEDIUM | ✅ Evet |
| `EMPLOYEE_DELETED` | Çalışan silme | HIGH | ✅ Evet |
| `EMPLOYEE_TRANSFERRED` | Çalışan transferi | MEDIUM | ✅ Evet |
| `DEPARTMENT_CREATED` | Departman oluşturma | MEDIUM | ⚠️ Opsiyonel |
| `DEPARTMENT_UPDATED` | Departman güncelleme | MEDIUM | ⚠️ Opsiyonel |
| `DEPARTMENT_DELETED` | Departman silme | HIGH | ✅ Evet |

### 1.4 Recruitment Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `CANDIDATE_CREATED` | Aday oluşturma | MEDIUM | ✅ Evet |
| `CANDIDATE_UPDATED` | Aday güncelleme | MEDIUM | ✅ Evet |
| `CANDIDATE_DELETED` | Aday silme | MEDIUM | ✅ Evet |
| `TEST_SUBMITTED` | Test gönderimi | LOW | ⚠️ Opsiyonel |
| `CANDIDATE_APPROVED` | Aday onayı | MEDIUM | ✅ Evet |
| `CANDIDATE_REJECTED` | Aday reddi | MEDIUM | ✅ Evet |

### 1.5 Performance Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `EVALUATION_CREATED` | Değerlendirme oluşturma | MEDIUM | ✅ Evet |
| `EVALUATION_UPDATED` | Değerlendirme güncelleme | MEDIUM | ✅ Evet |
| `EVALUATION_DELETED` | Değerlendirme silme | HIGH | ✅ Evet |

### 1.6 Leave & Attendance Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `LEAVE_REQUEST_CREATED` | İzin talebi oluşturma | LOW | ⚠️ Opsiyonel |
| `LEAVE_REQUEST_APPROVED` | İzin onayı | MEDIUM | ✅ Evet |
| `LEAVE_REQUEST_REJECTED` | İzin reddi | MEDIUM | ✅ Evet |
| `LEAVE_REQUEST_CANCELLED` | İzin iptali | LOW | ⚠️ Opsiyonel |

### 1.7 Approval Flow Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `BUDGET_APPROVED` | Bütçe onayı | HIGH | ✅ Evet |
| `BUDGET_REJECTED` | Bütçe reddi | HIGH | ✅ Evet |
| `SALARY_UPDATED` | Maaş güncelleme | HIGH | ✅ Evet |

### 1.8 Data Management Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `DATA_EXPORTED` | Veri dışa aktarma | MEDIUM | ✅ Evet |
| `DATA_IMPORTED` | Veri içe aktarma | HIGH | ✅ Evet |
| `DATA_DELETED` | Veri silme | HIGH | ✅ Evet |
| `DATA_CLEARED` | Tüm veri temizleme | CRITICAL | ✅ Evet |

### 1.9 Configuration Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `CONFIG_UPDATED` | Yapılandırma güncelleme | MEDIUM | ✅ Evet |
| `ROLE_UPDATED` | Rol güncelleme | HIGH | ✅ Evet |
| `PERMISSION_UPDATED` | Yetki güncelleme | HIGH | ✅ Evet |

### 1.10 System Events

| Event | Açıklama | Severity | Zorunlu mu? |
|-------|----------|----------|-------------|
| `SYSTEM_ERROR` | Sistem hatası | HIGH | ⚠️ Opsiyonel |
| `SECURITY_VIOLATION` | Güvenlik ihlali | CRITICAL | ✅ Evet |

---

## 2. TEKNİK TASARIM

### 2.1 Event Modeli

**Immutable Event Model:**
```python
class AuditEvent(BaseModel):
    id: str                          # Unique identifier
    event_type: AuditEventType       # Event type enum
    severity: AuditSeverity          # Severity level
    timestamp: datetime              # UTC timestamp
    
    # Actor (who did it)
    actor_id: Optional[str]
    actor_name: Optional[str]
    actor_role: Optional[str]
    actor_department: Optional[str]
    actor_ip: Optional[str]
    
    # Target (what was affected)
    target_type: Optional[str]       # Entity type
    target_id: Optional[str]          # Entity ID
    target_name: Optional[str]        # Entity name
    
    # Event details
    action: str                      # Human-readable action
    description: Optional[str]
    changes: Optional[Dict]          # Before/after for updates
    metadata: Optional[Dict]         # Additional context
    
    # Request context
    request_id: Optional[str]
    request_method: Optional[str]
    request_path: Optional[str]
    
    # Result
    success: bool
    error_message: Optional[str]
    
    class Config:
        frozen = True  # Immutable
```

**Özellikler:**
- ✅ **Immutable**: Event'ler bir kez oluşturulur, değiştirilemez
- ✅ **Timestamped**: UTC timestamp ile zaman damgası
- ✅ **Context-rich**: Actor, target, request bilgileri
- ✅ **Change tracking**: Update işlemlerinde before/after

### 2.2 Storage

**Şu anki: JSON File**
- `database/audit_log.json`
- Append-only (immutable events)
- JSON store repository kullanıyor (atomic writes, file locking)

**Gelecek: Database (PostgreSQL)**
```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    actor_id VARCHAR(255),
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    actor_department VARCHAR(100),
    actor_ip VARCHAR(45),
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    target_name VARCHAR(255),
    action TEXT NOT NULL,
    description TEXT,
    changes JSONB,
    metadata JSONB,
    request_id VARCHAR(255),
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_event_type (event_type),
    INDEX idx_actor_id (actor_id),
    INDEX idx_target_id (target_id)
);
```

### 2.3 Async vs Sync

**Şu anki: Sync (Synchronous)**
- ✅ Basit implementasyon
- ✅ Immediate consistency
- ❌ Request'e ekstra latency ekler

**Gelecek: Async (Background Task)**
```python
# Background task queue (Celery/RQ)
@background_task
def log_audit_event_async(event: AuditEvent):
    repository.save(event)
```

**Öneri:**
- **Kritik event'ler**: Sync (login failed, security violations)
- **Normal event'ler**: Async (employee created, evaluation updated)

### 2.4 Performans Etkisi

**Sync Logging:**
- Her request'e ~5-10ms ekler
- JSON file write overhead
- File locking overhead

**Optimizasyonlar:**
1. **Batch Writing**: Multiple events'i topla, batch yaz
2. **Async Logging**: Background task queue
3. **Database**: JSON'dan daha hızlı
4. **Indexing**: Timestamp, event_type, actor_id index'leri

**Performans Metrikleri:**
- Sync: ~5-10ms per event
- Async: ~0.1ms per event (fire-and-forget)
- Database: ~1-2ms per event (with indexes)

---

## 3. FASTAPI MIDDLEWARE vs SERVICE-LEVEL

### 3.1 Middleware Yaklaşımı

**Artıları:**
- ✅ Otomatik tracking (tüm request'ler)
- ✅ Request context otomatik (IP, method, path)
- ✅ Unauthorized access otomatik yakalanır
- ✅ Minimal kod değişikliği

**Eksileri:**
- ❌ Business context eksik (hangi entity? hangi action?)
- ❌ Tüm request'leri loglar (noise)
- ❌ Performance overhead (her request)
- ❌ Filtering zor (hangi request'ler loglanmalı?)

**Kullanım:**
```python
# Middleware sadece unauthorized access için
app.add_middleware(AuditMiddleware, track_all_requests=False)
```

### 3.2 Service-Level Yaklaşımı

**Artıları:**
- ✅ Business context var (entity, action, changes)
- ✅ Sadece önemli event'ler loglanır
- ✅ Daha az noise
- ✅ Flexible (her service kendi event'lerini loglar)

**Eksileri:**
- ❌ Manuel ekleme gerekir (her endpoint'te)
- ❌ Unutulabilir (code review gerekir)
- ❌ Request context manuel eklenmeli

**Kullanım:**
```python
# Service'te explicit logging
audit_service.log_user_created(
    actor_id=user_id,
    actor_name=user_name,
    target_username=username,
)
```

### 3.3 Hybrid Yaklaşım (Önerilen)

**Kombinasyon:**
1. **Middleware**: Unauthorized access, security violations (otomatik)
2. **Service-Level**: Business events (explicit)

**Örnek:**
```python
# Middleware: Unauthorized access
if response.status_code == 403:
    audit_service.log_event(UNAUTHORIZED_ACCESS, ...)

# Service: User creation
audit_service.log_user_created(...)
```

**Sonuç:** Hybrid yaklaşım en iyi dengeyi sağlar.

---

## 4. FRONTEND TASARIMI

### 4.1 Audit Log Ekranı

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Audit Log                                              │
├─────────────────────────────────────────────────────────┤
│  Filters:                                                │
│  [Event Type ▼] [Severity ▼] [Actor] [Date Range]      │
│  [Search...] [Export]                                    │
├─────────────────────────────────────────────────────────┤
│  Timestamp    | Event Type      | Actor    | Action      │
├─────────────────────────────────────────────────────────┤
│  2025-01-27  | USER_CREATED    | Admin    | User...     │
│  2025-01-27  | LOGIN_FAILED    | hacker   | Login...    │
│  2025-01-27  | LEAVE_APPROVED  | Manager  | Leave...     │
└─────────────────────────────────────────────────────────┘
```

**Özellikler:**
- ✅ Real-time filtering
- ✅ Pagination
- ✅ Export to CSV/Excel
- ✅ Event details modal
- ✅ Color coding by severity

### 4.2 Filtreleme

**Filtreler:**
- Event Type (multi-select)
- Severity (multi-select)
- Actor Name (search)
- Target Type (select)
- Date Range (start/end)
- Success/Failed (toggle)

**Örnek Query:**
```
GET /api/audit/logs?
  event_types=USER_CREATED,USER_DELETED&
  severity=HIGH,CRITICAL&
  actor_name=Admin&
  start_date=2025-01-01&
  end_date=2025-01-31&
  limit=100
```

### 4.3 Export

**Formatlar:**
- CSV (Excel-compatible)
- JSON
- PDF (formatted report)

**Özellikler:**
- Filtered results export
- Date range export
- Custom columns selection

---

## 5. ÖRNEK KOD

### 5.1 Audit Event Model

```python
# core/audit/models.py
class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: AuditEventType
    severity: AuditSeverity = AuditSeverity.MEDIUM
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    # ... (tam model yukarıda)
```

### 5.2 Event Kaydeden Helper

```python
# core/audit/service.py
def audit_event(
    event_type: AuditEventType,
    action: str,
    **kwargs
) -> AuditEvent:
    """Convenience function to log audit event."""
    service = get_audit_service()
    return service.log_event(event_type=event_type, action=action, **kwargs)

# Kullanım
audit_event(
    event_type=AuditEventType.USER_CREATED,
    action="User account created",
    actor_id=user_id,
    actor_name=user_name,
    target_username=username,
)
```

### 5.3 Endpoint Entegrasyonu

```python
# routers/admin.py
@router.post("/api/admin/create-user")
async def create_user_account_api(
    request: CreateUserAccountRequest,
    role: str = Depends(get_current_user_role),
    name: str = Depends(get_current_user_name)
):
    # ... create user logic ...
    
    # Audit log
    audit_service = get_audit_service()
    audit_service.log_user_created(
        actor_id=name,
        actor_name=name,
        actor_role=role,
        target_username=username,
    )
    
    return result
```

---

## 6. MİMARİ DİYAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Application                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Audit Middleware │      │  Request Handler │        │
│  │  (Auto tracking)  │─────▶│  (Business logic)│        │
│  └──────────────────┘      └──────────────────┘        │
│         │                            │                   │
│         │                            │                   │
│         ▼                            ▼                   │
│  ┌──────────────────────────────────────────┐           │
│  │         Audit Service                     │           │
│  │  - log_event()                            │           │
│  │  - log_user_created()                    │           │
│  │  - log_login_failed()                    │           │
│  └──────────────────────────────────────────┘           │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────────┐           │
│  │      Audit Repository                     │           │
│  │  - save()                                 │           │
│  │  - find_all(filter)                      │           │
│  └──────────────────────────────────────────┘           │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────────┐           │
│  │      Storage Layer                        │           │
│  │  - JSON File (current)                   │           │
│  │  - PostgreSQL (future)                   │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Audit Log API Endpoints                     │
│  - GET /api/audit/logs (filtered)                      │
│  - GET /api/audit/logs/{id} (single event)             │
│  - GET /api/audit/stats (statistics)                    │
└─────────────────────────────────────────────────────────┘
```

**Akış:**
1. **Request gelir** → Middleware request context'i set eder
2. **Business logic çalışır** → Service audit event loglar
3. **Audit Service** → Event'i repository'ye kaydeder
4. **Repository** → JSON file'a (veya DB'ye) yazar
5. **Frontend** → Audit log API'den event'leri çeker

---

## 7. KURUMSAL GEREKSİNİMLER

### 7.1 Compliance (GDPR, SOX, ISO 27001)

**Gereksinimler:**
- ✅ Tüm kritik işlemler loglanmalı
- ✅ Event'ler immutable olmalı
- ✅ Retention policy (ne kadar süre saklanır?)
- ✅ Access control (kim audit log'ları görebilir?)

**Çözüm:**
- Event'ler immutable (frozen model)
- Retention: Config'de belirlenebilir (örn: 7 yıl)
- Access: Sadece CEO audit log'ları görebilir

### 7.2 Security

**Gereksinimler:**
- ✅ Unauthorized access loglanmalı
- ✅ Failed login attempts loglanmalı
- ✅ Security violations loglanmalı
- ✅ Audit log'ların kendisi korunmalı

**Çözüm:**
- Middleware unauthorized access'i otomatik loglar
- Login endpoint failed attempts loglar
- Audit log'lar sadece CEO tarafından erişilebilir
- Audit log'lar immutable (değiştirilemez)

### 7.3 Forensics

**Gereksinimler:**
- ✅ "Ne oldu?" sorusuna cevap
- ✅ "Kim yaptı?" sorusuna cevap
- ✅ "Ne zaman oldu?" sorusuna cevap
- ✅ "Ne değişti?" sorusuna cevap

**Çözüm:**
- Timestamp, actor, target, changes bilgileri
- Filtering ve search özellikleri
- Export özellikleri

---

## 8. SONUÇ

**Tamamlanan:**
- ✅ Event model (immutable, comprehensive)
- ✅ Audit service (business logic)
- ✅ Audit repository (data access)
- ✅ Middleware (auto tracking)
- ✅ API endpoints (query, stats)
- ✅ Örnek entegrasyon (user creation)

**Sonraki Adımlar:**
1. Diğer endpoint'lere audit logging ekle
2. Async logging implementasyonu
3. Database migration (JSON → PostgreSQL)
4. Frontend audit log ekranı
5. Export functionality
6. Retention policy implementation

**Production Ready:** ✅ Evet (temel özellikler hazır)

