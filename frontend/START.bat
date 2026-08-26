@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   Next.js Dev Server Baslatiliyor...
echo ========================================
echo.
echo Dizin: %CD%
echo.
echo Node.js versiyonu kontrol ediliyor...
node --version
echo.
echo npm versiyonu kontrol ediliyor...
npm --version
echo.
echo Port 3000 kontrol ediliyor...
netstat -ano | findstr :3000
echo.
echo Node process'leri kontrol ediliyor...
tasklist | findstr node.exe
echo.
echo ========================================
echo   Dev server baslatiliyor...
echo ========================================
echo.
npm run dev
echo.
echo ========================================
echo   Dev server durdu
echo ========================================
pause
