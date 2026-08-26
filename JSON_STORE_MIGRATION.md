# JSON Store Migration Guide - Database Bridge

## Özet

Bu dokümantasyon, JSON tabanlı storage'dan SQLAlchemy database'e geçiş için hazırlanmış köprü yapısını açıklar.

## Mevcut Durum: Profesyonel JSON Storage

### Özellikler
- ✅ **Atomic Writes**: Temp file + rename (corruption önleme)
- ✅ **File Locking**: Cross-platform (race condition önleme)
- ✅ **Error Handling**: Comprehensive exception handling
- ✅ **Generic CRUD**: find, update, delete, append operations

### Kullanım
```python
from repositories.json_store import JsonStore, JsonDictStore

# List-based data
store = JsonStore("database/org_chart.json")
data = store.load()
store.save(data)

# Dict-based data
dict_store = JsonDictStore("database/roles.json")
data = dict_store.load()
dict_store.save(data)
```

## Database'e Geçiş Stratejisi

### 1. Repository Pattern Abstraction

Mevcut yapı zaten repository pattern kullanıyor. Database'e geçiş için sadece repository implementasyonunu değiştirmek yeterli.

### 2. Interface Tanımı

Tüm repository'ler için ortak interface:

```python
# repositories/base_repository.py (YENİ)
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable

class BaseRepository(ABC):
    """Base repository interface for all data sources."""
    
    @abstractmethod
    def get_all(self) -> List[Dict[str, Any]]:
        """Get all records."""
        pass
    
    @abstractmethod
    def find(self, predicate: Callable) -> Optional[Dict[str, Any]]:
        """Find first matching record."""
        pass
    
    @abstractmethod
    def save(self, data: List[Dict[str, Any]]) -> None:
        """Save all records."""
        pass
```

### 3. Mevcut Repository'lerin Database'e Dönüşümü

#### Örnek: OrgChartRepository

**Şu anki (JSON):**
```python
# repositories/org_chart_repository.py
from repositories.json_store import JsonStore
from config import DB_ORG_FILE

class OrgChartRepository:
    def __init__(self):
        self._store = JsonStore(DB_ORG_FILE)
    
    def get_all(self) -> List[Dict[str, Any]]:
        return self._store.load()
    
    def save_all(self, data: List[Dict[str, Any]]) -> None:
        self._store.save(data)
```

**Database'e geçiş (SQLAlchemy):**
```python
# repositories/org_chart_repository.py
from repositories.base_repository import BaseRepository
from sqlalchemy.orm import Session
from models.org_chart import OrgChartModel  # SQLAlchemy model

class OrgChartRepository(BaseRepository):
    def __init__(self, db: Session):
        self._db = db
    
    def get_all(self) -> List[Dict[str, Any]]:
        records = self._db.query(OrgChartModel).all()
        return [self._to_dict(r) for r in records]
    
    def save_all(self, data: List[Dict[str, Any]]) -> None:
        # Clear existing
        self._db.query(OrgChartModel).delete()
        # Insert new
        for item in data:
            model = OrgChartModel(**item)
            self._db.add(model)
        self._db.commit()
    
    def _to_dict(self, model: OrgChartModel) -> Dict[str, Any]:
        return {
            "Ad Soyad": model.ad_soyad,
            "Pozisyon": model.pozisyon,
            "Departman": model.departman,
            # ... map all fields
        }
```

### 4. Service Katmanı Değişmez

Service'ler zaten repository abstraction kullanıyor, değişiklik gerekmez:

```python
# domain/services/org_chart_service.py
class OrgChartService:
    def __init__(self, org_chart_repo: Optional[OrgChartRepository] = None):
        self._repo = org_chart_repo or OrgChartRepository()
    
    def get_org_chart(self, ...):
        # Service logic aynı kalır
        data = self._repo.get_all()
        # ... business rules
        return filtered_data
```

**Database'e geçişte:**
```python
# Router'da dependency injection
from sqlalchemy.orm import Session

@router.get("/api/org-chart")
async def get_org_chart(db: Session = Depends(get_db)):
    repo = OrgChartRepository(db)  # Database repository
    service = OrgChartService(repo)
    return service.get_org_chart(...)
```

## Hangi Dosyalar Kolayca SQLAlchemy'ye Döner?

### ✅ Kolay Dönüşüm (Repository Pattern Kullanıyor)

1. **OrgChartRepository** (`repositories/org_chart_repository.py`)
   - ✅ Zaten repository pattern
   - ✅ Service katmanı abstraction kullanıyor
   - ✅ Sadece `JsonStore` → `SQLAlchemy` değişimi

2. **Evaluation360Repository** (`repositories/evaluation_360_repository.py`)
   - ✅ Zaten repository pattern
   - ✅ Service katmanı abstraction kullanıyor
   - ✅ Sadece `JsonStore` → `SQLAlchemy` değişimi

3. **RolesRepository** (`repositories/roles_repository.py`)
   - ✅ Zaten repository pattern
   - ✅ Service katmanı abstraction kullanıyor
   - ✅ Sadece `JsonDictStore` → `SQLAlchemy` değişimi

### ⚠️ Orta Zorluk (utils_db.py Functions)

4. **utils_db.py Functions**
   - ⚠️ Function-based API (repository pattern değil)
   - ✅ Ama zaten `JsonStore` kullanıyor
   - 🔄 Refactor: Function'ları repository'lere dönüştür

   **Örnek:**
   ```python
   # Şu anki
   def load_org_chart():
       return _org_chart_store.load()
   
   # Database'e geçiş
   class OrgChartRepository:
       def get_all(self):
           return self._db.query(OrgChartModel).all()
   ```

### ⚠️ Orta Zorluk (Service Functions)

5. **services/succession_service.py**
   - ⚠️ Function-based (`load_succession_data`, `save_succession_data`)
   - ✅ Ama zaten `JsonDictStore` kullanıyor
   - 🔄 Refactor: Repository class'a dönüştür

6. **services/budget_service.py**
   - ⚠️ Function-based (`load_budget_data`, `save_budget_data`)
   - ✅ Ama zaten `JsonStore` kullanıyor
   - 🔄 Refactor: Repository class'a dönüştür

7. **services/talent_service.py**
   - ⚠️ Function-based (`load_talent_assessments`, `save_talent_assessment`)
   - ✅ Ama zaten `JsonStore` kullanıyor
   - 🔄 Refactor: Repository class'a dönüştür

## Migration Adımları

### Adım 1: Base Repository Interface
```python
# repositories/base_repository.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable

class BaseRepository(ABC):
    @abstractmethod
    def get_all(self) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def find(self, predicate: Callable) -> Optional[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def save_all(self, data: List[Dict[str, Any]]) -> None:
        pass
```

### Adım 2: SQLAlchemy Models
```python
# models/org_chart.py
from sqlalchemy import Column, String, Float, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class OrgChartModel(Base):
    __tablename__ = "org_chart"
    
    id = Column(Integer, primary_key=True)
    ad_soyad = Column(String)
    pozisyon = Column(String)
    departman = Column(String)
    # ... diğer alanlar
```

### Adım 3: Database Repository Implementation
```python
# repositories/org_chart_repository.py
from repositories.base_repository import BaseRepository
from sqlalchemy.orm import Session
from models.org_chart import OrgChartModel

class OrgChartRepository(BaseRepository):
    def __init__(self, db: Session):
        self._db = db
    
    def get_all(self) -> List[Dict[str, Any]]:
        # SQLAlchemy implementation
        pass
```

### Adım 4: Dependency Injection
```python
# routers/org_chart.py
from sqlalchemy.orm import Session

def get_db():
    # Database session
    pass

@router.get("/api/org-chart")
async def get_org_chart(db: Session = Depends(get_db)):
    repo = OrgChartRepository(db)  # Database repository
    service = OrgChartService(repo)
    return service.get_org_chart(...)
```

## Avantajlar

### 1. **Service Katmanı Değişmez**
- Business logic aynı kalır
- Sadece repository implementasyonu değişir

### 2. **Test Edilebilirlik**
- JSON repository: Mock file system
- Database repository: Mock database session
- Service'ler aynı test'leri kullanır

### 3. **Incremental Migration**
- Her repository ayrı ayrı migrate edilebilir
- JSON ve Database repository'ler aynı anda çalışabilir
- Feature flag ile geçiş kontrol edilebilir

### 4. **Backward Compatibility**
- Eski JSON dosyaları backup olarak kalabilir
- Rollback kolay (sadece repository değişimi)

## Sonuç

Mevcut JSON storage yapısı database'e geçiş için hazır:

- ✅ Repository pattern zaten kullanılıyor
- ✅ Service katmanı abstraction kullanıyor
- ✅ File I/O tek yerde (json_store.py)
- ✅ Atomic writes ve file locking mevcut
- ✅ Generic CRUD operations mevcut

**Database'e geçiş sadece:**
1. Repository implementasyonunu değiştir
2. SQLAlchemy models oluştur
3. Dependency injection ekle

**Service ve Router katmanları değişmez!**

