# Server Başlatma Talimatları

## Sorun Giderme

Eğer server başlamıyorsa, aşağıdaki adımları izleyin:

### 1. Terminal'i Açın

PowerShell veya Command Prompt'u açın ve proje dizinine gidin:

```powershell
cd "C:\Users\user24\OneDrive - CORLU TICARET VE SANAYI ODASI\Masaüstü\future_hr_system\frontend"
```

### 2. Node Modules Kontrolü

```powershell
# node_modules var mı kontrol et
if (Test-Path "node_modules") {
    Write-Host "node_modules mevcut"
} else {
    Write-Host "node_modules yok - npm install calistiriliyor..."
    npm install
}
```

### 3. Server'ı Başlatın

```powershell
npm run dev
```

### 4. Hataları Kontrol Edin

Eğer hata alırsanız, hata mesajını not edin ve paylaşın.

## Beklenen Çıktı

Server başarıyla başladığında şu mesajı görmelisiniz:

```
  ▲ Next.js 16.1.1
  - Local:        http://localhost:3000
  - Ready in Xs
```

## Tarayıcıda Açın

Server başladıktan sonra tarayıcıda şu adrese gidin:

**http://localhost:3000**

## Yaygın Hatalar

### Port 3000 Kullanımda

Eğer port 3000 kullanımda ise:

```powershell
# Port 3000'i kullanan process'i bul
netstat -ano | findstr :3000

# Process'i sonlandır (PID'yi yukarıdaki komuttan alın)
taskkill /PID <PID> /F
```

### Module Bulunamadı

Eğer "Cannot find module" hatası alırsanız:

```powershell
npm install
```

### TypeScript Hataları

Eğer TypeScript hataları varsa:

```powershell
npm run build
```

Hataları görmek için.

