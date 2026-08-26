# Klasör Taşıma Talimatları

Route group yapısını kurmak için aşağıdaki klasörlerin `app/(protected)` klasörüne taşınması gerekiyor.

## PowerShell Script ile Taşıma (Önerilen)

1. PowerShell'i **yönetici olarak** açın
2. `frontend/app` dizinine gidin:
   ```powershell
   cd "C:\Users\user24\OneDrive - CORLU TICARET VE SANAYI ODASI\Masaüstü\future_hr_system\frontend\app"
   ```
3. Execution Policy'yi geçici olarak değiştirin (gerekirse):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```
4. Script'i çalıştırın:
   ```powershell
   ..\move-folders.ps1
   ```

## Manuel Taşıma

Eğer script çalışmazsa, aşağıdaki klasörleri **Windows Explorer**'da manuel olarak taşıyın:

### Taşınacak Klasörler

Aşağıdaki klasörleri `frontend/app` dizininden `frontend/app/(protected)` dizinine taşıyın:

1. `dashboard` (layout.tsx zaten silindi, sadece page.tsx taşınacak)
2. `organizasyon`
3. `degerlendirme`
4. `egitim`
5. `gelisim`
6. `izinler`
7. `maas`
8. `kariyer`
9. `yedekleme`
10. `talent`
11. `yetenek-matrisi`
12. `ise-alim`
13. `kullanici`
14. `ekip-yönetimi`
15. `işe-alım`

### Taşınmayacak Klasörler

Bu klasörler `app` dizininde kalmalı:
- `page.tsx` (Login sayfası)
- `aday-testi` (Public sayfa)
- `data` (Shared data)
- `utils` (Shared utilities)
- `layout.tsx` (Root layout)
- `globals.css`
- `favicon.ico`
- `(protected)` (Route group klasörü - zaten var)

## Import Path Güncellemeleri

Klasörler taşındıktan sonra, import path'lerini güncellemeniz gerekebilir:

- `../utils/storage` → `../../utils/storage`
- `../data/jobData` → `../../data/jobData`

Ancak Next.js App Router genellikle bu path'leri otomatik çözümler, bu yüzden çoğu durumda güncelleme gerekmez.

## Sonuç

Taşıma işlemi tamamlandıktan sonra:
- ✅ Tüm modül sayfaları `(protected)` route group'u altında olacak
- ✅ Sidebar her sayfada sabit kalacak
- ✅ Login sayfası (`/`) Sidebar olmadan çalışacak
- ✅ Aday testi sayfası (`/aday-testi`) Sidebar olmadan çalışacak
- ✅ URL'ler değişmeyecek (route groups URL'yi etkilemez)

## Test

Taşıma işleminden sonra:
1. Uygulamayı yeniden başlatın (eğer çalışıyorsa)
2. Browser'da `http://localhost:3000` adresine gidin
3. Login yapın
4. Herhangi bir modüle tıklayın (örn: `/dashboard`, `/organizasyon`)
5. Sidebar'ın sol tarafta sabit kaldığını doğrulayın
