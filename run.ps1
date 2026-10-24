# PowerShell launcher for NeuralStock AI
$Host.UI.RawUI.WindowTitle = "NeuralStock AI Platform"
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "    Starting NeuralStock AI - Stock Predictor Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "Launching server at http://localhost:8000 ..." -ForegroundColor Green
Start-Process "http://localhost:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
