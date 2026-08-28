# FutureHR Türkiye V1 — SaaS Core / Phase 1

Bu aşama mevcut demo prototipini bozmadan gerçek SaaS omurgasını ekler.

## Korunan mevcut davranış

- `DATA_MODE=demo` varsayılandır.
- Mevcut frontend/localStorage demo girişi ve mevcut JSON tabanlı endpoint'ler çalışmaya devam eder.
- Yeni güvenli yapı yalnızca `/api/v1/*` altında eklenmiştir.
- `SAAS_AUTH_ENABLED=false` varsayılandır; bu nedenle PostgreSQL hazır olmadan prototip etkilenmez.

## Eklenen gerçek SaaS omurgası

- SQLAlchemy 2.x veri katmanı
- PostgreSQL (`psycopg`) desteği
- Alembic migration sistemi
- Tenant/company tablosu
- Tenant'a bağlı çalışan ana veri tablosu
- Tenant'a bağlı kullanıcı tablosu
- Argon2 parola hashing
- JWT access + refresh token
- Token version ile tüm oturumları iptal etme
- Backend tarafında Bearer token doğrulama
- Server-side role guard (`require_roles`)
- Tenant-scoped çalışan API'si

## İlk migration

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DBNAME'
alembic upgrade head
```

## Demo SaaS tenant'ı oluşturma

```bash
export SAAS_BOOTSTRAP_PASSWORD='GUCLU-BIR-PAROLA'
python scripts/seed_saas_demo.py
```

Parola kaynak koda yazılmaz; yalnızca environment variable'dan okunur ve Argon2 hash olarak saklanır.

## Güvenli auth'u etkinleştirme

Migration ve seed tamamlandıktan sonra:

```env
DATA_MODE=database
DATABASE_URL=postgresql://...
SECRET_KEY=<uzun-rastgele-secret>
SAAS_AUTH_ENABLED=true
```

### Yeni endpoint'ler

- `GET /api/v1/auth/status`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/employees` — CEO / İK, tenant-scoped
- `POST /api/v1/employees` — CEO / İK, tenant-scoped

## Geçiş prensibi

Eski modüller tek seferde kaldırılmayacak. Her modül için sıralama:

1. SQL tablo/model
2. tenant-scoped repository/service
3. `/api/v1` endpoint
4. frontend adapter
5. demo fallback doğrulaması
6. modül güvenli veri katmanına alındıktan sonra legacy write kapatma

Böylece sunum/demo ortamı her aşamada kullanılabilir kalır.

## Sonraki alt faz

Phase 1B'de frontend login adapter'ı ve session yönetimi eklenecek; varsayılan yine demo olacak. PostgreSQL ortamı bağlandıktan sonra tek environment flag ile secure auth'a geçilebilecek.
