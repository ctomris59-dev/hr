# Test Setup ve Çalıştırma Talimatları

## Kurulum

### 1. Test Bağımlılıklarını Yükle

```bash
cd backend
pip install -r requirements.txt
```

Veya sadece test bağımlılıkları:
```bash
pip install pytest pytest-asyncio httpx
```

### 2. Test Çalıştırma

#### Tüm Testleri Çalıştır
```bash
cd backend
pytest
```

#### Sadece Unit Testler
```bash
pytest tests/unit/
```

#### Sadece Integration Testler
```bash
pytest tests/integration/
```

#### Verbose Output
```bash
pytest -v
```

#### Belirli Bir Test
```bash
pytest tests/unit/test_hierarchy_service.py::TestRoleChecks::test_is_ceo
```

## Test Yapısı

```
backend/
├── tests/
│   ├── conftest.py                    # Fixtures ve configuration
│   ├── unit/                          # Unit testler
│   │   ├── test_hierarchy_service.py # RBAC logic testleri
│   │   └── test_roles_permissions.py # Role/permission testleri
│   └── integration/                   # Integration testler
│       └── test_org_chart_endpoint.py # HTTP endpoint testleri
├── pytest.ini                         # Pytest configuration
└── requirements.txt                   # Test dependencies dahil
```

## Test Örnekleri

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

## Test Coverage

Şu anki test coverage:
- ✅ `hierarchy_service`: Role checks, access control, filtering
- ✅ `roles_service`: Business rules, validation
- ✅ `/api/org-chart`: Success ve error scenarios
- ✅ `/api/360-data`: Success ve error scenarios
- ✅ `/api/roles`: Success ve error scenarios

## Sorun Giderme

### ImportError: httpx
```bash
pip install httpx
```

### ModuleNotFoundError
```bash
# Backend klasöründe olduğunuzdan emin olun
cd backend
pytest
```

### Test Failures
Test'ler mock'lar kullanıyor, gerçek dosya sistemine ihtiyaç yok. Eğer test fail ederse:
1. `conftest.py`'deki fixture'ları kontrol edin
2. Mock'ların doğru setup edildiğinden emin olun
3. `-v` flag ile detaylı output alın

## Sonraki Adımlar

1. Daha fazla unit test ekle
2. Tüm endpoint'ler için integration test
3. Coverage raporu oluştur: `pytest --cov=. --cov-report=html`
4. CI/CD pipeline'a test ekle

