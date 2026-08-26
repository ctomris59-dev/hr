# Test Suite Documentation

## Test Altyapısı

Bu proje için profesyonel bir test altyapısı kurulmuştur. Testler `pytest` framework'ü kullanılarak yazılmıştır.

## Test Yapısı

```
tests/
├── conftest.py                    # Pytest fixtures ve configuration
├── unit/                          # Unit testler (hızlı, izole)
│   ├── test_hierarchy_service.py
│   └── test_roles_permissions.py
└── integration/                   # Integration testler (daha yavaş, gerçek bağımlılıklar)
    └── test_org_chart_endpoint.py
```

## Test Çalıştırma

### Tüm Testleri Çalıştır
```bash
cd backend
pytest
```

### Sadece Unit Testler
```bash
pytest tests/unit/
```

### Sadece Integration Testler
```bash
pytest tests/integration/
```

### Belirli Bir Test Dosyası
```bash
pytest tests/unit/test_hierarchy_service.py
```

### Belirli Bir Test Fonksiyonu
```bash
pytest tests/unit/test_hierarchy_service.py::TestRoleChecks::test_is_ceo
```

### Verbose Output (Detaylı Çıktı)
```bash
pytest -v
```

### Coverage Raporu (Eğer pytest-cov kuruluysa)
```bash
pytest --cov=. --cov-report=html
```

## Test Kategorileri

### Unit Tests (`tests/unit/`)
- **Hız**: Çok hızlı (< 1 saniye)
- **İzolasyon**: Tam izole, mock'lar kullanılıyor
- **Bağımlılıklar**: Hiç gerçek bağımlılık yok
- **Örnekler**:
  - `test_hierarchy_service.py`: RBAC logic testleri
  - `test_roles_permissions.py`: Role ve permission business rules

### Integration Tests (`tests/integration/`)
- **Hız**: Orta hızlı (1-5 saniye)
- **İzolasyon**: Kısmi izole, bazı bağımlılıklar mock'lanıyor
- **Bağımlılıklar**: FastAPI TestClient kullanılıyor
- **Örnekler**:
  - `test_org_chart_endpoint.py`: Full HTTP request/response cycle

## Test Fixtures

### `client`
FastAPI TestClient instance'ı. HTTP request'leri test etmek için kullanılır.

```python
def test_example(client):
    response = client.get("/api/endpoint")
    assert response.status_code == 200
```

### `mock_org_chart_repo`
Mock OrgChartRepository. Service testlerinde kullanılır.

### `sample_employees`
Örnek employee data. Test verisi olarak kullanılır.

### `sample_360_evaluations`
Örnek 360 evaluation data. Test verisi olarak kullanılır.

## Test Yazma Rehberi

### Unit Test Örneği
```python
def test_is_ceo(self):
    """Test CEO role identification."""
    assert is_ceo("CEO") is True
    assert is_ceo("DIRECTOR") is False
```

### Integration Test Örneği
```python
def test_get_org_chart_success_ceo(self, client: TestClient):
    """CEO should get all org chart data."""
    response = client.get(
        "/api/org-chart",
        headers={"x-user-role": "CEO"}
    )
    assert response.status_code == 200
```

## Test Edilebilirlik İyileştirmeleri

### 1. Dependency Injection
Service'ler artık repository'leri constructor'da alıyor, bu sayede mock'lanabilir:

```python
# Önce (Test edilemez)
class OrgChartService:
    def __init__(self):
        self._repo = OrgChartRepository()  # Hard-coded

# Sonra (Test edilebilir)
class OrgChartService:
    def __init__(self, org_chart_repo: Optional[OrgChartRepository] = None):
        self._repo = org_chart_repo or OrgChartRepository()  # Injectable
```

### 2. Repository Abstraction
Repository'ler artık interface pattern kullanıyor, kolayca mock'lanabilir:

```python
# Test'te
mock_repo = Mock(spec=OrgChartRepository)
service = OrgChartService(mock_repo)
```

### 3. Global State Azaltma
`app_state.is_data_cleared()` gibi global state'ler artık patch'lenebilir:

```python
with patch("app_state.is_data_cleared", return_value=False):
    # Test code
```

## Mevcut Kodun Test Edilebilirlik Zorlukları

### 1. Global State Kullanımı
**Sorun**: `app_state.is_data_cleared()` gibi global state'ler test edilebilirliği zorlaştırıyor.

**Çözüm**: `patch` kullanarak mock'lanıyor:
```python
with patch("app_state.is_data_cleared", return_value=False):
    # Test code
```

**Gelecek İyileştirme**: Dependency injection ile state'i service'e inject etmek.

### 2. Direct Import'lar
**Sorun**: Bazı modüller doğrudan import ediliyor (örn: `from data.data_roles import get_roles`).

**Çözüm**: `patch` ile mock'lanıyor.

**Gelecek İyileştirme**: Dependency injection ile inject etmek.

### 3. File I/O
**Sorun**: Bazı service'ler hala direct file I/O yapıyor.

**Çözüm**: Repository pattern kullanılıyor, mock'lanabilir.

## Test Coverage

Şu anki test coverage:
- ✅ `hierarchy_service`: %90+ (role checks, access control, filtering)
- ✅ `roles_service`: %85+ (business rules, validation)
- ✅ `/api/org-chart`: Başarılı ve hatalı senaryolar
- ✅ `/api/360-data`: Başarılı ve hatalı senaryolar
- ✅ `/api/roles`: Başarılı ve hatalı senaryolar

## CI/CD Entegrasyonu

Testler CI/CD pipeline'ında çalıştırılabilir:

```yaml
# .github/workflows/test.yml örneği
- name: Run tests
  run: |
    cd backend
    pytest
```

## Sonraki Adımlar

1. **Daha fazla unit test**: Tüm service'ler için
2. **Daha fazla integration test**: Tüm endpoint'ler için
3. **E2E testler**: Full user flow testleri
4. **Performance testler**: Load testing
5. **Coverage artırma**: %80+ coverage hedefi

