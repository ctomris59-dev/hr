# Development Mode Auth Bypass

## Amaç
`APP_ENV=development` veya `ENVIRONMENT=development` iken tüm authentication/authorization kontrolleri bypass edilir.

## Nasıl Çalışır

### 1. Settings
- `ENVIRONMENT` veya `APP_ENV` environment variable'ı `development` ise bypass aktif
- Default: `development` (güvenli default)

### 2. Auth Bypass Mekanizması

**`get_current_user_role`:**
- Development: Header yoksa `"CEO"` döndürür
- Production: Header yoksa `"EMPLOYEE"` döndürür

**`get_current_user_dept`:**
- Development: Header yoksa `"Yönetim"` döndürür
- Production: Header yoksa `""` döndürür

**`get_current_user_name`:**
- Development: Header yoksa `"Development User"` döndürür
- Production: Header yoksa `""` döndürür

**Tüm `require_*` fonksiyonları:**
- Development: Hiçbir kontrol yapmaz, direkt geçer
- Production: Normal RBAC kontrolleri yapar

## Etkilenen Endpoint'ler

### Talent Matrix
- **Path:** `/api/talent-matrix`
- **Router:** `backend/routers/org_chart.py`
- **Protection:** `require_non_employee` dependency
- **Development:** Bypass edilir, herkes erişebilir

### Org Chart
- **Path:** `/api/org-chart`
- **Router:** `backend/routers/org_chart.py`
- **Protection:** `require_non_employee` dependency
- **Development:** Bypass edilir

### Diğer Endpoint'ler
- Tüm `require_role_ceo`, `require_role_director`, `require_non_employee`, `require_recruitment_access`, `require_budget_access` kullanan endpoint'ler development'da bypass edilir

## Kullanım

### Development Mode (Bypass Aktif)
```bash
# .env dosyasında veya environment variable
ENVIRONMENT=development
# veya
APP_ENV=development
```

### Production Mode (Normal Auth)
```bash
# .env dosyasında veya environment variable
ENVIRONMENT=production
# veya
APP_ENV=production
```

## Test

### Development Mode Test
```bash
# Backend'i development modunda başlat
ENVIRONMENT=development python main.py

# Talent Matrix endpoint'ini test et (header olmadan)
curl http://127.0.0.1:8000/api/talent-matrix
# ✅ 200 OK dönmeli
```

### Production Mode Test
```bash
# Backend'i production modunda başlat
ENVIRONMENT=production python main.py

# Talent Matrix endpoint'ini test et (header olmadan)
curl http://127.0.0.1:8000/api/talent-matrix
# ❌ 403 Forbidden dönmeli (EMPLOYEE rolü)
```

## Güvenlik Notu

⚠️ **ÖNEMLİ:** Development mode sadece local development için kullanılmalıdır. Production'da asla `ENVIRONMENT=development` kullanmayın!

## Değişen Dosyalar

1. `backend/core/config.py` - `APP_ENV` field eklendi
2. `backend/routers/dependencies.py` - Tüm auth fonksiyonlarına development bypass eklendi
3. `frontend/app/api/talent-matrix/route.ts` - Cookie ve authorization header forwarding eklendi

