@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Temiz Baslangic
echo ========================================
echo.
echo 1. Node process'leri durduruluyor...
taskkill /F /IM node.exe >nul 2>&1
echo    Tamamlandi.
echo.
echo 2. .next klasoru temizleniyor...
if exist .next rmdir /s /q .next
echo    Tamamlandi.
echo.
echo 3. Dev server baslatiliyor...
echo.
npm run dev
pause

