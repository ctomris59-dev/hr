# Multi-Tenant Architecture Design
## SaaS Transformation for HR System

---

## 1. TENANT MODELLERİ KARŞILAŞTIRMASI

### 1.1 Shared Database + tenant_id (Row-Level Security)

**Açıklama:**
- Tek bir veritabanı
- Her tabloda `tenant_id` kolonu
- Tüm sorgularda `WHERE tenant_id = ?` filtresi

**Avantajlar:**
- ✅ En kolay implementasyon
- ✅ En düşük maliyet (tek DB)
- ✅ Kolay backup/restore (tek DB)
- ✅ Kolay migration (mevcut yapıya uyumlu)
- ✅ Schema değişiklikleri tek seferde
- ✅ Cross-tenant analytics kolay

**Dezavantajlar:**
- ❌ Data isolation riski (SQL injection, bug riski)
- ❌ Tenant bazlı scaling zor
- ❌ Tenant bazlı backup zor
- ❌ Compliance riski (GDPR, SOX)

**Kod Örneği:**
```python
# Repository
class OrgChartRepository:
    def get_all(self, tenant_id: str) -> List[Dict]:
        data = self._store.load()
        return [item for item in data if item.get("tenant_id") == tenant_id]
    
    def save(self, tenant_id: str, data: List[Dict]) -> None:
        # Ensure all items have tenant_id
        for item in data:
            item["tenant_id"] = tenant_id
        self._store.save(data)
```

**Maliyet:** 💰💰 (En düşük)

---

### 1.2 Schema Per Tenant

**Açıklama:**
- Tek veritabanı, her tenant için ayrı schema
- `tenant_acme_corp.employees`, `tenant_xyz.employees`
- Connection string'de schema değişir

**Avantajlar:**
- ✅ Güçlü data isolation
- ✅ Tenant bazlı backup mümkün
- ✅ Schema değişiklikleri tenant bazlı
- ✅ Tenant bazlı optimizasyon

**Dezavantajlar:**
- ❌ Kompleks implementasyon
- ❌ Schema management zor
- ❌ Migration zor (her schema için)
- ❌ Connection pooling zor
- ❌ Cross-tenant analytics zor

**Kod Örneği:**
```python
# Connection per tenant
def get_db_connection(tenant_id: str):
    schema = f"tenant_{tenant_id}"
    return create_connection(schema=schema)
```

**Maliyet:** 💰💰💰 (Orta)

---

### 1.3 Database Per Tenant

**Açıklama:**
- Her tenant için ayrı veritabanı
- `tenant_acme_corp_db`, `tenant_xyz_db`
- Connection string tamamen farklı

**Avantajlar:**
- ✅ En güçlü data isolation
- ✅ Tenant bazlı scaling (farklı DB server)
- ✅ Tenant bazlı backup/restore
- ✅ Compliance için ideal (GDPR, SOX)
- ✅ Tenant bazlı optimizasyon

**Dezavantajlar:**
- ❌ En yüksek maliyet (her tenant için DB)
- ❌ En kompleks implementasyon
- ❌ Schema management çok zor
- ❌ Migration çok zor (her DB için)
- ❌ Connection management çok zor
- ❌ Cross-tenant analytics çok zor

**Kod Örneği:**
```python
# Different DB per tenant
def get_db_connection(tenant_id: str):
    db_name = f"tenant_{tenant_id}_db"
    return create_connection(database=db_name)
```

**Maliyet:** 💰💰💰💰💰 (En yüksek)

---

## 2. KARAR MATRİSİ

| Kriter | Shared DB + tenant_id | Schema Per Tenant | DB Per Tenant |
|--------|----------------------|-------------------|---------------|
| **Implementasyon Kolaylığı** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Maliyet** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Data Isolation** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Backup/Restore** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Migration Kolaylığı** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Compliance** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cross-Tenant Analytics** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |

**MVP İçin Öneri:** ✅ **Shared DB + tenant_id**

**Neden:**
1. Mevcut JSON yapısına en uyumlu
2. En hızlı implementasyon (1-2 hafta)
3. En düşük maliyet
4. Migration kolay (mevcut data'ya tenant_id ekle)
5. İleride schema per tenant veya DB per tenant'a geçilebilir

---

## 3. AUTHENTICATION & AUTHORIZATION ETKİLERİ

### 3.1 Tenant Identification

**Yöntemler:**
1. **Subdomain-based** (Önerilen MVP)
   - `acme.hrsystem.com` → tenant: "acme"
   - `xyz.hrsystem.com` → tenant: "xyz"

2. **Path-based**
   - `/api/tenants/acme/org-chart`
   - `/api/tenants/xyz/org-chart`

3. **Header-based**
   - `X-Tenant-ID: acme`
   - `X-Tenant-Slug: acme-corp`

4. **JWT Token içinde**
   - Token payload: `{"tenant_id": "acme", "user_id": "..."}`

**MVP Önerisi:** Subdomain + Header (fallback)

### 3.2 User-Tenant Relationship

**Model:**
```python
class User:
    user_id: str
    username: str
    tenant_id: str  # User belongs to tenant
    role: str
    # ...
```

**Login Flow:**
1. User login → `username@tenant-slug` veya `username` + `tenant-slug`
2. System identifies tenant from subdomain or request
3. Validate user belongs to tenant
4. Generate JWT with `tenant_id` in payload

### 3.3 Authorization Changes

**Mevcut:**
```python
@router.get("/api/org-chart")
async def get_org_chart(role: str = Depends(get_current_user_role)):
    # No tenant filtering
    return org_chart_data
```

**Yeni (Tenant-aware):**
```python
@router.get("/api/org-chart")
async def get_org_chart(
    tenant_id: str = Depends(get_current_tenant_id),
    role: str = Depends(get_current_user_role)
):
    # Filter by tenant
    return org_chart_service.get_all(tenant_id=tenant_id)
```

---

## 4. DATA ISOLATION RİSKLERİ

### 4.1 Riskler

| Risk | Açıklama | Olasılık | Etki | Mitigation |
|------|----------|----------|------|------------|
| **SQL Injection** | tenant_id filtresi bypass | Düşük | Yüksek | Parameterized queries |
| **Bug in Code** | tenant_id filtresi unutulmuş | Orta | Yüksek | Code review, tests |
| **Direct DB Access** | Admin direkt DB'ye erişir | Düşük | Yüksek | Access control, audit |
| **Data Leakage** | Yanlış tenant'a data gösterilir | Orta | Yüksek | Tenant context validation |

### 4.2 Mitigation Stratejileri

**1. Repository Pattern (Zorunlu)**
```python
# ❌ BAD: Direct access
data = load_org_chart()  # No tenant filter!

# ✅ GOOD: Repository with tenant_id
data = org_chart_repo.get_all(tenant_id=tenant_id)
```

**2. Middleware Validation**
```python
class TenantValidationMiddleware:
    async def dispatch(self, request, call_next):
        tenant_id = extract_tenant_id(request)
        if not tenant_id:
            raise HTTPException(400, "Tenant ID required")
        
        # Validate tenant exists and is active
        tenant = tenant_service.get_tenant(tenant_id)
        if not tenant or tenant.status != "ACTIVE":
            raise HTTPException(403, "Invalid tenant")
        
        # Set tenant context
        set_tenant_context(tenant)
        return await call_next(request)
```

**3. Database-Level Constraints (Enterprise)**
```sql
-- Row-level security (PostgreSQL)
CREATE POLICY tenant_isolation ON employees
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id'));
```

**4. Automated Tests**
```python
def test_tenant_isolation():
    # Create two tenants
    tenant1 = create_tenant("acme")
    tenant2 = create_tenant("xyz")
    
    # Create data for tenant1
    create_employee(tenant1.tenant_id, "John")
    
    # Try to access from tenant2
    employees = get_employees(tenant2.tenant_id)
    assert "John" not in [e.name for e in employees]
```

---

## 5. MIGRATION VE BACKUP STRATEJİSİ

### 5.1 Migration Stratejisi

**Phase 1: Add tenant_id to existing data**
```python
# Migration script
def migrate_existing_data():
    # 1. Create default tenant
    default_tenant = tenant_service.create_tenant(
        name="Default Company",
        slug="default"
    )
    
    # 2. Add tenant_id to all existing data
    org_chart = load_org_chart()
    for item in org_chart:
        item["tenant_id"] = default_tenant.tenant_id
    save_org_chart(org_chart)
    
    # Repeat for all data types...
```

**Phase 2: Update repositories**
```python
# Update all repositories to require tenant_id
class OrgChartRepository:
    def get_all(self, tenant_id: str) -> List[Dict]:
        # Always filter by tenant_id
        ...
```

**Phase 3: Update services**
```python
# Update all services to accept tenant_id
class OrgChartService:
    def get_org_chart(self, tenant_id: str, ...):
        return self._repo.get_all(tenant_id=tenant_id)
```

**Phase 4: Update routers**
```python
# Update all routers to extract tenant_id
@router.get("/api/org-chart")
async def get_org_chart(
    tenant_id: str = Depends(get_current_tenant_id)
):
    ...
```

### 5.2 Backup Stratejisi

**Shared DB + tenant_id:**
```python
# Backup all data (single backup)
def backup_all_data():
    backup = {
        "tenants": load_tenants(),
        "org_chart": load_org_chart(),
        "users": load_users(),
        # ...
    }
    save_backup(backup)

# Backup specific tenant
def backup_tenant(tenant_id: str):
    backup = {
        "tenant": get_tenant(tenant_id),
        "org_chart": [item for item in load_org_chart() if item["tenant_id"] == tenant_id],
        "users": [user for user in load_users() if user["tenant_id"] == tenant_id],
        # ...
    }
    save_backup(backup)
```

**Schema Per Tenant / DB Per Tenant:**
```python
# Backup specific tenant schema/DB
def backup_tenant(tenant_id: str):
    schema = f"tenant_{tenant_id}"
    backup_database(schema)
```

---

## 6. MVP İÇİN EN MANTIKLI YAKLAŞIM

### 6.1 Seçim: Shared DB + tenant_id

**Neden:**
1. ✅ **Mevcut yapıya uyumlu**: JSON files'a `tenant_id` eklemek kolay
2. ✅ **Hızlı implementasyon**: 1-2 hafta
3. ✅ **Düşük maliyet**: Tek DB, tek backup
4. ✅ **Kolay migration**: Mevcut data'ya tenant_id ekle
5. ✅ **İleride geçiş mümkün**: Schema per tenant veya DB per tenant'a geçilebilir

**Risk Mitigation:**
- Repository pattern (zorunlu tenant_id)
- Middleware validation
- Automated tests
- Code review

### 6.2 Gelecek Planı

**Phase 1 (MVP):** Shared DB + tenant_id
- 1-2 hafta implementasyon
- Mevcut yapıya uyumlu
- Düşük maliyet

**Phase 2 (Growth):** Schema Per Tenant
- 100+ tenant olduğunda
- Daha güçlü isolation gerekirse
- Compliance gereksinimleri artarsa

**Phase 3 (Enterprise):** DB Per Tenant
- Enterprise müşteriler için
- Yüksek compliance gereksinimleri
- Custom requirements

---

## 7. MEVCUT MİMARİDE DEĞİŞECEK YERLER

### 7.1 Tenant-Aware Olması Gereken Yerler

| Katman | Dosya | Değişiklik |
|--------|-------|------------|
| **Middleware** | `core/middleware.py` | Tenant extraction & validation |
| **Auth** | `auth.py` | User-tenant relationship |
| **Repositories** | `repositories/*.py` | Tüm repository'ler tenant_id filter |
| **Services** | `domain/services/*.py` | Tüm service'ler tenant_id parametresi |
| **Routers** | `routers/*.py` | Tüm endpoint'ler tenant_id dependency |
| **Config** | `config.py` | Tenant settings |
| **Storage** | `repositories/json_store.py` | Tenant-aware file paths (optional) |

### 7.2 Kod Değişiklikleri

#### 7.2.1 Middleware (YENİ)

```python
# core/middleware/tenant_middleware.py
class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract tenant from subdomain or header
        tenant_id = extract_tenant_id(request)
        
        # Validate tenant
        tenant = tenant_service.get_tenant(tenant_id)
        if not tenant or tenant.status != "ACTIVE":
            raise HTTPException(403, "Invalid tenant")
        
        # Set tenant context
        set_tenant_context(tenant)
        
        return await call_next(request)
```

#### 7.2.2 Repository (DEĞİŞECEK)

```python
# repositories/org_chart_repository.py
class OrgChartRepository:
    def get_all(self, tenant_id: str) -> List[Dict]:  # ✅ tenant_id eklendi
        data = self._store.load()
        return [item for item in data if item.get("tenant_id") == tenant_id]
    
    def save_all(self, tenant_id: str, data: List[Dict]) -> None:  # ✅ tenant_id eklendi
        # Ensure all items have tenant_id
        for item in data:
            item["tenant_id"] = tenant_id
        self._store.save(data)
```

#### 7.2.3 Service (DEĞİŞECEK)

```python
# domain/services/org_chart_service.py
class OrgChartService:
    def get_org_chart(self, tenant_id: str, ...):  # ✅ tenant_id eklendi
        return self._repo.get_all(tenant_id=tenant_id)
    
    def save_employee(self, tenant_id: str, ...):  # ✅ tenant_id eklendi
        ...
```

#### 7.2.4 Router (DEĞİŞECEK)

```python
# routers/org_chart.py
@router.get("/api/org-chart")
async def get_org_chart(
    tenant_id: str = Depends(get_current_tenant_id),  # ✅ tenant_id dependency
    role: str = Depends(get_current_user_role)
):
    service = OrgChartService()
    return service.get_org_chart(tenant_id=tenant_id)  # ✅ tenant_id passed
```

#### 7.2.5 Auth (DEĞİŞECEK)

```python
# auth.py
def check_login(username: str, password: str, tenant_id: str) -> Optional[Dict]:  # ✅ tenant_id eklendi
    users = load_users()
    user_key = f"{tenant_id}:{username}"  # ✅ tenant-scoped username
    if user_key in users:
        if users[user_key]['password'] == password:
            return users[user_key]
    return None
```

---

## 8. UYGULANABİLİR YOL HARİTASI

### Phase 1: Foundation (Week 1)

- [ ] Tenant model & repository oluştur
- [ ] Tenant service oluştur
- [ ] Tenant context management
- [ ] Tenant middleware (extraction & validation)
- [ ] Migration script (existing data'ya tenant_id ekle)

### Phase 2: Repository Layer (Week 1-2)

- [ ] Tüm repository'lere `tenant_id` parametresi ekle
- [ ] Tüm repository method'larında tenant filtering
- [ ] Unit tests (tenant isolation)

### Phase 3: Service Layer (Week 2)

- [ ] Tüm service'lere `tenant_id` parametresi ekle
- [ ] Service method'larında tenant validation
- [ ] Integration tests

### Phase 4: Router Layer (Week 2-3)

- [ ] Tüm router'lara `tenant_id` dependency ekle
- [ ] Tenant extraction (subdomain/header)
- [ ] End-to-end tests

### Phase 5: Auth & User Management (Week 3)

- [ ] User-tenant relationship
- [ ] Login flow (tenant identification)
- [ ] JWT token (tenant_id in payload)
- [ ] User management (tenant-scoped)

### Phase 6: Frontend (Week 3-4)

- [ ] Subdomain routing
- [ ] Tenant context in frontend
- [ ] API calls with tenant context
- [ ] Multi-tenant UI

### Phase 7: Testing & Migration (Week 4)

- [ ] Tenant isolation tests
- [ ] Performance tests
- [ ] Data migration (production)
- [ ] Rollback plan

---

## 9. ÖRNEK IMPLEMENTASYON

### 9.1 Tenant Extraction

```python
# core/middleware/tenant_middleware.py
def extract_tenant_id(request: Request) -> Optional[str]:
    # 1. Try subdomain
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        tenant = tenant_service.get_tenant_by_slug(subdomain)
        if tenant:
            return tenant.tenant_id
    
    # 2. Try header
    tenant_id = request.headers.get("x-tenant-id")
    if tenant_id:
        return tenant_id
    
    # 3. Try JWT token (if exists)
    # ...
    
    return None
```

### 9.2 Tenant-Aware Repository

```python
# repositories/org_chart_repository.py
class OrgChartRepository:
    def __init__(self, file_path: Optional[str] = None):
        # Option 1: Shared file with tenant_id filter
        self._store = JsonStore(file_path or DB_ORG_FILE)
        
        # Option 2: Tenant-specific files (better isolation)
        # self._base_path = file_path or DB_ORG_FILE
    
    def get_all(self, tenant_id: str) -> List[Dict]:
        data = self._store.load()
        # Filter by tenant_id
        return [item for item in data if item.get("tenant_id") == tenant_id]
    
    def save_all(self, tenant_id: str, data: List[Dict]) -> None:
        # Load all data
        all_data = self._store.load()
        
        # Remove old data for this tenant
        all_data = [item for item in all_data if item.get("tenant_id") != tenant_id]
        
        # Add tenant_id to new data
        for item in data:
            item["tenant_id"] = tenant_id
        
        # Save
        all_data.extend(data)
        self._store.save(all_data)
```

### 9.3 Tenant-Aware Service

```python
# domain/services/org_chart_service.py
class OrgChartService:
    def __init__(self, org_chart_repo: Optional[OrgChartRepository] = None):
        self._repo = org_chart_repo or OrgChartRepository()
    
    def get_org_chart(self, tenant_id: str, ...) -> Dict:
        # Validate tenant
        if not tenant_service.is_tenant_active(tenant_id):
            raise ValueError("Tenant is not active")
        
        # Get data (automatically filtered by tenant_id)
        data = self._repo.get_all(tenant_id=tenant_id)
        return {"success": True, "data": data}
```

---

## 10. SONUÇ

**MVP Yaklaşımı:** ✅ Shared DB + tenant_id

**Neden:**
- Mevcut yapıya en uyumlu
- En hızlı implementasyon
- En düşük maliyet
- İleride geçiş mümkün

**Risk Mitigation:**
- Repository pattern (zorunlu tenant_id)
- Middleware validation
- Automated tests
- Code review

**Yol Haritası:** 4 hafta (MVP)

**Sonraki Adımlar:**
1. Tenant model & service implementasyonu
2. Repository layer güncellemesi
3. Service layer güncellemesi
4. Router layer güncellemesi
5. Frontend multi-tenant support

