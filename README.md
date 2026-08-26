# HR System (Future HR) — Monorepo

Bu depo iki ayrı uygulama içerir:

```
.
├── frontend/   Next.js 16 (React 19) — kullanıcı arayüzü
└── backend/    FastAPI (Python) — API, iş mantığı, JSON dosya tabanlı "veritabanı"
```

Frontend, backend'e HTTP üzerinden bağlanır (varsayılan olarak `http://127.0.0.1:8000`).
Bu adres artık tek bir yerden, environment variable ile ayarlanıyor — aşağıya bakın.

## ⚠️ Önce oku: mimari hakkında iki önemli not

1. **Backend'in "veritabanı" düz JSON dosyaları.** (`backend/database/*.json`)
   Bu, yerelde çalışırken veya Render/Railway gibi *kalıcı, sürekli çalışan* bir
   sunucuda sorunsuz çalışır. **Vercel'in serverless fonksiyonlarında çalışmaz**
   çünkü her istek farklı, geçici (ephemeral) bir dosya sistemi ile başlayabilir —
   yazdığın veriler kalıcı olmaz / instance'lar arasında tutarsız davranır.
   👉 Önerilen kurulum: **frontend'i Vercel'e, backend'i Render/Railway/Fly.io gibi
   bir servise** deploy etmek (aşağıda adımlar var).

2. **`backend/database/users.json` içinde ~123 demo kullanıcı kaydı var, hepsinin
   şifresi `"123"`.** Şifrelerin tekdüze olması bunun demo/seed verisi olduğunu
   gösteriyor, ama isimler gerçek bir çalışan listesine benziyor. GitHub'a **public**
   repo olarak yüklemeden önce bu verinin gerçek kişilere ait olmadığından emin ol —
   emin değilsen repoyu **private** yap. Prodüksiyona alırsan bu dosyayı ve
   `SECRET_KEY` değerini (`backend/core/config.py`) mutlaka değiştir.

## Yerelde çalıştırma

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000

# Frontend (ayrı bir terminalde)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend `http://localhost:3000`, backend `http://localhost:8000` adresinde açılır.

## GitHub'a yükleme

```bash
cd /path/to/this/repo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<kullanici-adi>/<repo-adi>.git
git push -u origin main
```

(Bu depo zaten bir git reposu olarak hazırlandıysa sadece `git remote add` ve
`git push` adımlarını uygulaman yeterli.)

## Frontend'i Vercel'e deploy etme

1. Vercel'de "New Project" → GitHub reponu seç.
2. **Root Directory** olarak `frontend` seç (monorepo olduğu için önemli).
3. Framework Preset: Next.js (otomatik algılanır).
4. Environment Variables ekle:
   - `NEXT_PUBLIC_API_URL` = backend'inin public URL'i (örn. `https://your-backend.onrender.com`)
   - `BACKEND_URL` = aynı URL (bazı `app/api/*` route'ları bunu server-side okuyor)
5. Deploy et.

Backend'i henüz deploy etmediysen, geçici olarak backend'i yerelde çalıştırıp
`ngrok`/`cloudflared` gibi bir tünelleme aracıyla dışarı açıp o URL'i
`NEXT_PUBLIC_API_URL` olarak da verebilirsin — sadece test amaçlı, kalıcı çözüm değil.

## Backend'i Render'a (önerilen) deploy etme

1. [render.com](https://render.com) → New → Web Service → GitHub reponu bağla.
2. **Root Directory:** `backend`
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables (bkz. `backend/.env.example`):
   - `SECRET_KEY` → rastgele üret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - `CORS_ORIGINS` → `["https://your-frontend.vercel.app"]` (JSON dizi formatında!)
   - `APP_ENV=production`, `DEBUG=false`
6. Deploy sonrası verilen URL'i frontend'in Vercel ortam değişkenlerine
   (`NEXT_PUBLIC_API_URL`, `BACKEND_URL`) gir ve frontend'i yeniden deploy et
   (Vercel'de env değişkeni değişince redeploy gerekir).

Not: Render'ın ücretsiz planında disk kalıcı değildir (her redeploy'da JSON
dosyaları seed haline döner). Kalıcı veri gerekiyorsa Render'ın "Persistent Disk"
özelliğini (ücretli plan) ekleyip `DB_BASE_DIR` değişkenini o disk yoluna
yönlendirmen gerekir, ya da JSON dosya sistemini gerçek bir veritabanına
(Postgres vb.) taşımak uzun vadede daha sağlıklı olur.

## Ortam değişkenleri özeti

| Değişken | Nerede | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | Client tarafından çağrılan backend adresi |
| `BACKEND_URL` | frontend | Next.js `app/api/*` route'larının sunucu tarafında çağırdığı backend adresi |
| `SECRET_KEY` | backend | Prodüksiyonda mutlaka değiştirilmeli |
| `CORS_ORIGINS` | backend | JSON dizi string'i, frontend'in deploy edildiği domain(ler) |
| `DB_BASE_DIR` | backend | JSON "veritabanı" dosyalarının bulunduğu klasör |
