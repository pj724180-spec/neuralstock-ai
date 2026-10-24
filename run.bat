@echo off
title NeuralStock AI Server
echo ========================================================
echo    Starting NeuralStock AI - Stock Predictor Platform
echo ========================================================
echo.
cd /d "%~dp0"
echo Checking Python environment...
python -c "import fastapi, uvicorn, yfinance, sklearn, pandas" 2>nul
if %errorlevel% neq 0 (
    echo Installing missing requirements...
    pip install -r backend/requirements.txt
)

echo.
echo Launching FastAPI Server on http://localhost:8000 ...
echo Press Ctrl+C in this terminal window to stop the server.
echo.

start "" "http://localhost:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
