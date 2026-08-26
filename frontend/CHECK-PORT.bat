@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Port 3000 Kontrol
echo ========================================
echo.
echo Port 3000'i kullanan process'ler:
netstat -ano | findstr :3000
echo.
echo.
echo Node.js process'leri:
tasklist | findstr node.exe
echo.
echo.
echo Port 3000'i temizlemek icin:
echo   taskkill /PID [PID_NUMARASI] /F
echo.
pause

