# Backend Architecture Refactor - Layered Architecture

## Yeni Klasör Yapısı

```
backend/
├── api/                    # HTTP Layer (routers)
│   └── routers/           # FastAPI routers - SADECE HTTP handling
├── domain/                 # Business Logic Layer
│   └── services/          # Business rules, orchestration
├── repositories/          # Data Access Layer
│   ├── json_store.py      # Generic JSON file operations
│   ├── org_chart_repository.py
│   ├── evaluation_360_repository.py
│   └── roles_repository.py
├── core/                  # Cross-cutting concerns
│   └── (config, logging, utilities)
└── legacy/                # Legacy Streamlit UI code
```

## Katman Sorumlulukları

### 1. API/Routers Layer (`routers/`)
**Sorumluluk:** SADECE HTTP request/response handling
- Request validation (schemas)
- Response formatting
- Error handling (HTTP exceptions)
- Dependency injection (auth, RBAC)

**YAPMAZ:**
- ❌ Dosya okuma/yazma
- ❌ Business logic
- ❌ JSON bilgisi
- ❌ Veri formatı dönüşümleri

**Örnek:**
```python
@router.post("/api/360-data")
async def save_360_data(request: Save360DataRequest):
    service = Evaluation360Service()
    result = service.save_evaluation(...)
    return result
```

### 2. Domain/Services Layer (`domain/services/`)
**Sorumluluk:** Business rules ve orchestration
- İş kuralları (business rules)
- Veri validasyonu (domain-level)
- Repository orchestration
- Cross-entity operations

**YAPMAZ:**
- ❌ HTTP bilgisi
- ❌ JSON dosya yolları
- ❌ Direct file I/O

**Örnek:**
```python
class Evaluation360Service:
    def save_evaluation(self, ...):
        # Business Rule: Determine suffix based on eval_type
        suffix = "_Mgr" if "1. Yönetici" in eval_type else "_Mgr2"
        
        # Business Rule: Calculate potential
        final_pot = (final_perf + avg_competency) / 2
        
        # Save via repository
        self._evaluation_repo.upsert(...)
```

### 3. Repositories Layer (`repositories/`)
**Sorumluluk:** Data access (CRUD operations)
- JSON file I/O (TEK YER)
- Data persistence
- Generic operations (load, save, find, update)

**YAPMAZ:**
- ❌ Business logic
- ❌ HTTP bilgisi
- ❌ Request/response formatting

**Örnek:**
```python
class OrgChartRepository:
    def get_all(self) -> List[Dict[str, Any]]:
        return self._store.load()
    
    def update_by_name(self, name: str, updates: Dict[str, Any]) -> bool:
        all_data = self.get_all()
        # Update logic
        self.save_all(all_data)
```

### 4. Core Layer (`core/`)
**Sorumluluk:** Cross-cutting concerns
- Configuration
- Logging
- Common utilities
- Shared constants

## Refactor Edilen Endpoint'ler

### 1. `/api/360-data` (POST & GET)

**Önce:**
- Router içinde dosya okuma/yazma
- Business logic router'da
- JSON dosya yolu router'da

**Sonra:**
```
Router → Evaluation360Service → Evaluation360Repository → JsonStore
```

**Kazanımlar:**
- Router sadece HTTP handling
- Business logic service'te (suffix belirleme, potansiyel hesaplama)
- Repository sadece CRUD
- JSON bilgisi sadece repository'de

### 2. `/api/org-chart` (GET)

**Önce:**
- Router içinde dosya okuma
- CLEAN_DB dönüşümü router'da
- RBAC filtering router'da

**Sonra:**
```
Router → OrgChartService → OrgChartRepository → JsonStore
```

**Kazanımlar:**
- Business rule (CLEAN_DB dönüşümü) service'te
- RBAC filtering service'te
- Repository sadece data access

### 3. `/api/roles` (GET & POST)

**Önce:**
- Router içinde dosya okuma/yazma
- Default roles logic router'da
- Validation router'da

**Sonra:**
```
Router → RolesService → RolesRepository → JsonDictStore
```

**Kazanımlar:**
- Business rules (default roles, validation) service'te
- Repository sadece CRUD
- Router sadece HTTP

## Ortak Helper: `repositories/json_store.py`

**Amaç:** Tüm JSON file I/O'yu tek yerde toplamak

**İki tip store:**
1. `JsonStore` - List-based data (org_chart, 360_data)
2. `JsonDictStore` - Dict-based data (roles)

**Faydalar:**
- Tekrar eden dosya okuma/yazma kodları kaldırıldı
- Hata yönetimi merkezi
- Gelecekte database'e geçiş kolay (sadece repository değişir)

## Bu Yapı Neden Büyümeye Uygundur?

### 1. **Separation of Concerns (SoC)**
Her katman tek bir sorumluluğa sahip:
- Router: HTTP
- Service: Business logic
- Repository: Data access

Bu sayede:
- Değişiklikler izole edilir
- Test edilebilirlik artar
- Kod okunabilirliği artar

### 2. **Dependency Inversion**
- Router → Service → Repository (tek yönlü bağımlılık)
- Service'ler repository'leri inject edebilir (test için mock)
- Repository'ler service'leri bilmez

### 3. **Scalability**
- Yeni endpoint eklemek: Router + Service + Repository
- Business rule değişikliği: Sadece Service
- Database'e geçiş: Sadece Repository katmanı

### 4. **Maintainability**
- Business logic tek yerde (Service)
- Data access tek yerde (Repository)
- HTTP handling tek yerde (Router)

### 5. **Testability**
- Router'lar: HTTP client ile test
- Service'ler: Mock repository ile unit test
- Repository'ler: Mock file system ile test

### 6. **Future-Proof**
- Database'e geçiş: Repository implementasyonu değişir, Service/Router aynı kalır
- Microservice'e geçiş: Service'ler bağımsız modüller olabilir
- API versioning: Router katmanında yönetilir

## Örnek: Yeni Endpoint Ekleme

**Senaryo:** `/api/training` endpoint'i eklemek

1. **Repository oluştur:**
```python
# repositories/training_repository.py
class TrainingRepository:
    def __init__(self):
        self._store = JsonStore(DB_TRAINING_FILE)
    # CRUD methods
```

2. **Service oluştur:**
```python
# domain/services/training_service.py
class TrainingService:
    def __init__(self, training_repo=None):
        self._repo = training_repo or TrainingRepository()
    
    def get_trainings(self, user_role, user_dept):
        # Business rules
        data = self._repo.get_all()
        # Filter by RBAC
        return filtered_data
```

3. **Router ekle:**
```python
# routers/dashboard.py
@router.get("/api/training")
async def get_training(role=Depends(...)):
    service = TrainingService()
    return service.get_trainings(role, dept)
```

**Sonuç:** Her katman kendi sorumluluğunda, kod temiz ve test edilebilir.

## Migration Path

1. ✅ **Tamamlandı:** 3 endpoint refactor edildi (360-data, org-chart, roles)
2. **Sonraki adımlar:**
   - Diğer endpoint'leri aynı pattern'e göre refactor et
   - Tüm dosya okuma/yazmaları repository'lere taşı
   - Business logic'i router'lardan service'lere taşı
   - Test coverage ekle

## Sonuç

Bu katmanlı mimari:
- ✅ **Kurumsal:** Standart pattern'ler (Repository, Service)
- ✅ **Ölçeklenebilir:** Yeni özellikler kolay eklenir
- ✅ **Sürdürülebilir:** Kod temiz, okunabilir, test edilebilir
- ✅ **Büyümeye uygun:** Database, microservice, API versioning için hazır

