# Test Edilebilirlik Rehberi

## Özet

Bu dokümantasyon, projede yapılan test edilebilirlik iyileştirmelerini ve mevcut kodun test edilebilirlik zorluklarını açıklar.

## Test Altyapısı Kurulumu

### 1. Pytest Yapılandırması

**Dosya**: `pytest.ini`
- Test path'leri tanımlandı
- Marker'lar eklendi (unit, integration, slow)
- Verbose output ayarlandı

### 2. Test Fixtures (`conftest.py`)

**FastAPI TestClient**: HTTP request'leri test etmek için
```python
@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
```

**Mock Repositories**: Service testleri için
```python
@pytest.fixture
def mock_org_chart_repo():
    repo = Mock()
    repo.get_all.return_value = []
    return repo
```

**Sample Data**: Test verisi için
```python
@pytest.fixture
def sample_employees():
    return [...]
```

## Test Edilebilirlik İyileştirmeleri

### 1. Dependency Injection Pattern

**Önce (Test Edilemez)**:
```python
class OrgChartService:
    def __init__(self):
        self._repo = OrgChartRepository()  # Hard-coded, test edilemez
```

**Sonra (Test Edilebilir)**:
```python
class OrgChartService:
    def __init__(self, org_chart_repo: Optional[OrgChartRepository] = None):
        self._repo = org_chart_repo or OrgChartRepository()  # Injectable
```

**Fayda**: Test'te mock repository inject edilebilir:
```python
mock_repo = Mock(spec=OrgChartRepository)
service = OrgChartService(mock_repo)
```

### 2. Repository Abstraction

**Önce**: Direct file I/O, test edilemez
```python
def load_org_chart():
    with open(DB_ORG_FILE, "r") as f:
        return json.load(f)
```

**Sonra**: Repository pattern, mock'lanabilir
```python
class OrgChartRepository:
    def get_all(self) -> List[Dict[str, Any]]:
        return self._store.load()
```

**Fayda**: Test'te repository mock'lanabilir:
```python
mock_repo = Mock()
mock_repo.get_all.return_value = sample_data
```

### 3. Service Layer Abstraction

**Önce**: Service'ler dosya yollarını biliyordu
```python
class Evaluation360Service:
    def __init__(self):
        self._file_path = DB_360_FILE  # Hard-coded
```

**Sonra**: Service'ler sadece repository kullanıyor
```python
class Evaluation360Service:
    def __init__(self, evaluation_repo: Optional[Evaluation360Repository] = None):
        self._evaluation_repo = evaluation_repo or Evaluation360Repository()
```

**Fayda**: Service'ler dosya sisteminden bağımsız, test edilebilir.

## Mevcut Kodun Test Edilebilirlik Zorlukları

### 1. Global State Kullanımı

**Sorun**: `app_state.is_data_cleared()` gibi global state'ler test edilebilirliği zorlaştırıyor.

**Örnek**:
```python
# domain/services/org_chart_service.py
if is_data_cleared():  # Global state
    return {"success": True, "data": []}
```

**Çözüm**: `patch` kullanarak mock'lanıyor:
```python
with patch("app_state.is_data_cleared", return_value=False):
    result = service.get_org_chart(...)
```

**Gelecek İyileştirme**: Dependency injection ile state'i service'e inject etmek:
```python
class OrgChartService:
    def __init__(self, data_state: Optional[DataState] = None):
        self._data_state = data_state or DataState()
    
    def get_org_chart(self, ...):
        if self._data_state.is_cleared():  # Injectable
            return {"success": True, "data": []}
```

### 2. Direct Import'lar

**Sorun**: Bazı modüller doğrudan import ediliyor, test'te mock'lanması zor.

**Örnek**:
```python
# services/hierarchy_service.py
from data.data_roles import get_roles  # Direct import

def get_role_config(user_role_or_position: str):
    roles = get_roles()  # Hard to mock
```

**Çözüm**: `patch` ile mock'lanıyor:
```python
with patch("services.hierarchy_service.get_roles") as mock_get_roles:
    mock_get_roles.return_value = [...]
    result = get_role_config("CEO")
```

**Gelecek İyileştirme**: Dependency injection:
```python
class HierarchyService:
    def __init__(self, roles_provider: Optional[RolesProvider] = None):
        self._roles_provider = roles_provider or RolesProvider()
    
    def get_role_config(self, user_role: str):
        roles = self._roles_provider.get_roles()  # Injectable
```

### 3. Module-Level Functions

**Sorun**: Bazı service'ler function-based, class-based değil.

**Örnek**:
```python
# services/budget_service.py
def load_budget_data() -> List[Dict[str, Any]]:
    return _budget_store.load()  # Module-level store
```

**Çözüm**: Function'lar patch'leniyor veya store mock'lanıyor.

**Gelecek İyileştirme**: Class-based service'lere dönüştürmek:
```python
class BudgetService:
    def __init__(self, budget_repo: Optional[BudgetRepository] = None):
        self._repo = budget_repo or BudgetRepository()
    
    def load_budget_data(self) -> List[Dict[str, Any]]:
        return self._repo.get_all()
```

### 4. FastAPI Dependencies

**Sorun**: FastAPI dependencies (örn: `get_current_user_role`) test'te mock'lanması gerekiyor.

**Çözüm**: TestClient ile header'lar gönderiliyor:
```python
response = client.get(
    "/api/org-chart",
    headers={"x-user-role": "CEO"}
)
```

**Alternatif**: Dependency override kullanılabilir:
```python
app.dependency_overrides[get_current_user_role] = lambda: "CEO"
```

## Test Yazma Best Practices

### 1. Unit Testler

**Kural**: Hızlı, izole, mock kullan
```python
def test_is_ceo(self):
    """Test CEO role identification."""
    assert is_ceo("CEO") is True
    assert is_ceo("DIRECTOR") is False
```

### 2. Integration Testler

**Kural**: Gerçek HTTP cycle test et, bazı bağımlılıkları mock'la
```python
def test_get_org_chart_success_ceo(self, client: TestClient):
    with patch("domain.services.org_chart_service.OrgChartRepository") as mock_repo:
        mock_repo.return_value.get_all.return_value = sample_data
        response = client.get("/api/org-chart", headers={"x-user-role": "CEO"})
        assert response.status_code == 200
```

### 3. Edge Case Testleri

**Kural**: Boundary conditions ve error cases test et
```python
def test_filter_data_empty_list(self):
    result = filter_data_by_hierarchy(..., all_employees=[])
    assert result == []
```

## Test Coverage Hedefleri

- ✅ **Unit Tests**: %80+ coverage
- ✅ **Integration Tests**: Tüm kritik endpoint'ler
- ⏳ **E2E Tests**: User flow'ları
- ⏳ **Performance Tests**: Load testing

## Sonuç

Proje artık test edilebilir bir yapıya sahip:

- ✅ **Dependency Injection**: Service'ler mock'lanabilir
- ✅ **Repository Pattern**: Data access mock'lanabilir
- ✅ **Test Fixtures**: Ortak test utilities
- ✅ **FastAPI TestClient**: HTTP testleri yapılabilir
- ⚠️ **Global State**: Hala var ama patch'lenebilir
- ⚠️ **Direct Imports**: Hala var ama patch'lenebilir

**Gelecek İyileştirmeler**:
1. Global state'leri dependency injection'a çevir
2. Direct import'ları dependency injection'a çevir
3. Function-based service'leri class-based'e çevir
4. Test coverage'ı %80+'a çıkar

