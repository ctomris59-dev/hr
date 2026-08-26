# Multi-Tenant Implementation Roadmap
## Step-by-Step Implementation Guide

---

## PHASE 1: Foundation (Week 1)

### 1.1 Tenant Domain Model

**Files to Create:**
- [x] `domain/tenant/models.py` - Tenant model
- [x] `domain/tenant/repository.py` - Tenant repository
- [x] `domain/tenant/service.py` - Tenant service
- [x] `core/tenant_context.py` - Tenant context management

**Files to Update:**
- [x] `config.py` - Add `DB_TENANTS_FILE`

**Tasks:**
- [ ] Create tenant model with all fields
- [ ] Implement tenant repository (JSON-based for MVP)
- [ ] Implement tenant service (CRUD operations)
- [ ] Implement tenant context (thread-local storage)
- [ ] Write unit tests

**Acceptance Criteria:**
- Can create tenant
- Can get tenant by ID, slug, domain
- Can update tenant status
- Tenant context can be set and retrieved

---

## PHASE 2: Middleware & Request Processing (Week 1)

### 2.1 Tenant Middleware

**Files to Create:**
- [x] `core/middleware/tenant_middleware.py` - Tenant extraction & validation

**Files to Update:**
- [ ] `main.py` - Add tenant middleware

**Tasks:**
- [ ] Implement tenant extraction (subdomain, header)
- [ ] Implement tenant validation
- [ ] Set tenant context in middleware
- [ ] Handle tenant not found errors
- [ ] Write integration tests

**Acceptance Criteria:**
- Tenant extracted from subdomain
- Tenant extracted from header (fallback)
- Invalid tenant raises 404
- Inactive tenant raises 403
- Tenant context available in request

---

## PHASE 3: Repository Layer (Week 1-2)

### 3.1 Update All Repositories

**Files to Update:**
- [ ] `repositories/org_chart_repository.py`
- [ ] `repositories/evaluation_360_repository.py`
- [ ] `repositories/roles_repository.py`
- [ ] `repositories/audit_repository.py` (if exists)
- [ ] `repositories/workflow_repository.py` (if exists)

**Tasks:**
- [ ] Add `tenant_id` parameter to all repository methods
- [ ] Filter all queries by `tenant_id`
- [ ] Ensure `tenant_id` is set on save operations
- [ ] Update repository tests

**Example:**
```python
# Before
def get_all(self) -> List[Dict]:
    return self._store.load()

# After
def get_all(self, tenant_id: str) -> List[Dict]:
    data = self._store.load()
    return [item for item in data if item.get("tenant_id") == tenant_id]
```

**Acceptance Criteria:**
- All repository methods require `tenant_id`
- All queries filtered by `tenant_id`
- Tenant isolation tests pass

---

## PHASE 4: Service Layer (Week 2)

### 4.1 Update All Services

**Files to Update:**
- [ ] `domain/services/org_chart_service.py`
- [ ] `domain/services/evaluation_360_service.py`
- [ ] `domain/services/roles_service.py`

**Tasks:**
- [ ] Add `tenant_id` parameter to all service methods
- [ ] Pass `tenant_id` to repository calls
- [ ] Validate tenant is active before operations
- [ ] Update service tests

**Example:**
```python
# Before
def get_org_chart(self, ...) -> Dict:
    return self._repo.get_all()

# After
def get_org_chart(self, tenant_id: str, ...) -> Dict:
    if not tenant_service.is_tenant_active(tenant_id):
        raise ValueError("Tenant is not active")
    return self._repo.get_all(tenant_id=tenant_id)
```

**Acceptance Criteria:**
- All service methods require `tenant_id`
- Tenant validation in place
- Service tests pass

---

## PHASE 5: Router Layer (Week 2-3)

### 5.1 Update All Routers

**Files to Update:**
- [ ] `routers/org_chart.py`
- [ ] `routers/admin.py`
- [ ] `routers/recruitment.py`
- [ ] `routers/dashboard.py`
- [ ] `routers/audit.py`
- [ ] `routers/workflow.py`
- [ ] `routers/observability.py`

**Files to Update:**
- [ ] `routers/dependencies.py` - Add `get_current_tenant_id()`

**Tasks:**
- [ ] Add `tenant_id` dependency to all endpoints
- [ ] Pass `tenant_id` to service calls
- [ ] Update router tests

**Example:**
```python
# Before
@router.get("/api/org-chart")
async def get_org_chart(role: str = Depends(get_current_user_role)):
    service = OrgChartService()
    return service.get_org_chart()

# After
@router.get("/api/org-chart")
async def get_org_chart(
    tenant_id: str = Depends(get_current_tenant_id),
    role: str = Depends(get_current_user_role)
):
    service = OrgChartService()
    return service.get_org_chart(tenant_id=tenant_id)
```

**Acceptance Criteria:**
- All endpoints have `tenant_id` dependency
- Tenant context properly used
- Router tests pass

---

## PHASE 6: Authentication & User Management (Week 3)

### 6.1 User-Tenant Relationship

**Files to Update:**
- [ ] `auth.py` - Add tenant_id to user model
- [ ] `routers/admin.py` - Update login endpoint

**Tasks:**
- [ ] Add `tenant_id` to user model
- [ ] Update login to identify tenant
- [ ] Update user creation to include tenant
- [ ] Update user management (tenant-scoped)

**Example:**
```python
# User model
{
    "username": "john",
    "tenant_id": "acme-tenant-id",
    "password": "...",
    "role": "EMPLOYEE"
}

# Login
def check_login(username: str, password: str, tenant_id: str):
    users = load_users()
    user_key = f"{tenant_id}:{username}"
    if user_key in users:
        ...
```

**Acceptance Criteria:**
- Users are tenant-scoped
- Login identifies tenant
- User management is tenant-aware

---

## PHASE 7: Data Migration (Week 3-4)

### 7.1 Migration Script

**Files to Create:**
- [ ] `scripts/migrate_to_multi_tenant.py`

**Tasks:**
- [ ] Create default tenant
- [ ] Add `tenant_id` to all existing data
- [ ] Validate migration
- [ ] Backup before migration

**Example:**
```python
def migrate_existing_data():
    # 1. Create default tenant
    tenant = tenant_service.create_tenant(
        name="Default Company",
        slug="default"
    )
    
    # 2. Migrate org chart
    org_chart = load_org_chart()
    for item in org_chart:
        item["tenant_id"] = tenant.tenant_id
    save_org_chart(org_chart)
    
    # 3. Migrate users
    users = load_users()
    for username, user_data in users.items():
        user_data["tenant_id"] = tenant.tenant_id
    save_users(users)
    
    # Repeat for all data types...
```

**Acceptance Criteria:**
- All existing data has `tenant_id`
- Migration is reversible
- Data integrity maintained

---

## PHASE 8: Frontend (Week 4)

### 8.1 Multi-Tenant Frontend

**Files to Update:**
- [ ] `frontend/app/(public)/page.tsx` - Login with tenant
- [ ] `frontend/context/AuthContext.tsx` - Tenant context
- [ ] `frontend/utils/apiClient.ts` - Tenant in API calls

**Tasks:**
- [ ] Subdomain detection
- [ ] Tenant context in frontend
- [ ] API calls with tenant context
- [ ] Multi-tenant UI (if needed)

**Example:**
```typescript
// Extract tenant from subdomain
const getTenantFromSubdomain = () => {
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  return subdomain;
};

// API client with tenant
const apiClient = new ApiClient();
apiClient.setHeader('X-Tenant-Slug', getTenantFromSubdomain());
```

**Acceptance Criteria:**
- Frontend identifies tenant
- API calls include tenant context
- UI works for multiple tenants

---

## PHASE 9: Testing (Week 4)

### 9.1 Comprehensive Testing

**Tasks:**
- [ ] Unit tests (tenant isolation)
- [ ] Integration tests (tenant context)
- [ ] End-to-end tests (multi-tenant flow)
- [ ] Performance tests
- [ ] Security tests (data leakage)

**Test Scenarios:**
- Tenant A cannot access Tenant B's data
- Tenant context properly set
- Invalid tenant rejected
- Inactive tenant rejected

**Acceptance Criteria:**
- All tests pass
- No data leakage between tenants
- Performance acceptable

---

## PHASE 10: Deployment (Week 4)

### 10.1 Production Deployment

**Tasks:**
- [ ] Backup existing data
- [ ] Run migration script
- [ ] Deploy updated code
- [ ] Monitor for issues
- [ ] Rollback plan ready

**Acceptance Criteria:**
- Migration successful
- No data loss
- System operational
- Monitoring in place

---

## CHECKLIST SUMMARY

### Foundation
- [x] Tenant domain model
- [x] Tenant repository
- [x] Tenant service
- [x] Tenant context management
- [ ] Tenant middleware

### Data Layer
- [ ] All repositories tenant-aware
- [ ] All services tenant-aware
- [ ] All routers tenant-aware

### Authentication
- [ ] User-tenant relationship
- [ ] Login with tenant
- [ ] User management tenant-scoped

### Migration
- [ ] Migration script
- [ ] Data backup
- [ ] Migration execution

### Frontend
- [ ] Tenant detection
- [ ] API calls with tenant
- [ ] Multi-tenant UI

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security tests

### Deployment
- [ ] Production migration
- [ ] Monitoring
- [ ] Rollback plan

---

## ESTIMATED TIMELINE

- **Week 1:** Foundation + Middleware + Repository layer
- **Week 2:** Service layer + Router layer
- **Week 3:** Auth + Migration
- **Week 4:** Frontend + Testing + Deployment

**Total:** 4 weeks for MVP

---

## RISKS & MITIGATION

| Risk | Mitigation |
|------|------------|
| Data leakage | Repository pattern, automated tests |
| Migration failure | Backup, rollback plan |
| Performance degradation | Performance tests, monitoring |
| Breaking changes | Feature flags, gradual rollout |

