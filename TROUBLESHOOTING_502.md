# 502 Bad Gateway Hatası - Troubleshooting

## Sorun
Frontend'den `/api/talent-matrix` endpoint'ine istek yapıldığında 502 Bad Gateway hatası alınıyor.

## Olası Nedenler

### 1. Backend Servisi Çalışmıyor
**Kontrol:**
```bash
# Backend'in çalışıp çalışmadığını kontrol et
curl http://127.0.0.1:8000/health

# Veya browser'da aç
http://127.0.0.1:8000/health
```

**Çözüm:**
```bash
cd backend
python main.py
# veya
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Backend Port'u Farklı
**Kontrol:**
- Backend'in hangi port'ta çalıştığını kontrol et
- `frontend/app/api/talent-matrix/route.ts` dosyasındaki `BACKEND_BASE_URL` değerini kontrol et

**Çözüm:**
```typescript
// .env.local dosyasında
BACKEND_URL=http://127.0.0.1:8000  // Backend'in gerçek port'u
```

### 3. CORS Sorunu
**Kontrol:**
- Browser console'da CORS hatası var mı?

**Çözüm:**
- Backend'de CORS ayarlarını kontrol et (`main.py`)
- Frontend origin'i CORS allowed origins listesinde olmalı

### 4. Backend Timeout
**Kontrol:**
- Backend yanıt vermiyor, timeout oluyor

**Çözüm:**
- Backend loglarını kontrol et
- Backend'de hata var mı kontrol et
- Backend'in yavaş çalışıyor olabilir

### 5. Network Bağlantı Sorunu
**Kontrol:**
- Firewall backend port'unu engelliyor mu?
- Antivirus backend bağlantısını engelliyor mu?

**Çözüm:**
- Firewall exception ekle
- Antivirus exception ekle

## Hızlı Çözüm Adımları

1. **Backend'i başlat:**
   ```bash
   cd backend
   python main.py
   ```

2. **Backend'in çalıştığını doğrula:**
   ```bash
   curl http://127.0.0.1:8000/health
   ```

3. **Frontend'i yeniden başlat:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Browser console'u kontrol et:**
   - F12 > Console
   - Hata mesajlarını kontrol et

5. **Network tab'ı kontrol et:**
   - F12 > Network
   - `/api/talent-matrix` isteğini kontrol et
   - Response'u kontrol et

## Geliştirilmiş Hata Mesajları

Kod güncellemeleri yapıldı:
- ✅ Next.js API route'unda daha detaylı hata mesajları
- ✅ Timeout handling (30 saniye)
- ✅ JSON parse hatalarını yakalama
- ✅ Frontend'de kullanıcı dostu hata mesajları

## Test

1. Backend çalışıyor mu?
   ```bash
   curl http://127.0.0.1:8000/health
   ```

2. Backend endpoint çalışıyor mu?
   ```bash
   curl http://127.0.0.1:8000/api/talent-matrix \
     -H "x-user-role: CEO" \
     -H "x-user-dept: Yönetim"
   ```

3. Next.js API route çalışıyor mu?
   ```bash
   curl http://localhost:3000/api/talent-matrix?user_role=CEO&user_dept=Yönetim
   ```

## Yaygın Hatalar

### "Failed to reach backend"
- Backend servisi çalışmıyor
- Backend URL yanlış
- Network bağlantı sorunu

### "Backend request timeout"
- Backend çok yavaş yanıt veriyor
- Backend'de infinite loop veya deadlock var

### "Invalid backend response"
- Backend JSON döndürmüyor
- Backend HTML error page döndürüyor

### "Network error: ECONNREFUSED"
- Backend servisi çalışmıyor
- Backend port'u yanlış

