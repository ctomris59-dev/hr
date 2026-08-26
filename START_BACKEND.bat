@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   FastAPI Backend Server Baslatiliyor...
echo ========================================
echo.
echo Python versiyonu kontrol ediliyor...
python --version
echo.
echo Port 8000 kontrol ediliyor...
netstat -ano | findstr :8000
echo.
echo ========================================
echo   Backend server baslatiliyor...
echo   http://127.0.0.1:8000
echo ========================================
echo.
if not exist venv\Scripts\activate.bat (
  echo Venv bulunamadi, olusturuluyor...
  python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip uninstall -y multipart
python -m pip install -r requirements.txt
python main.py
echo.
echo ========================================
echo   Backend server durdu
echo ========================================
pause


