# =============================================================================
# InAds — Script de Inicio Rápido (Backend Golang + Frontend Next.js)
# Uso: .\start-dev.ps1
# =============================================================================

Write-Host "Iniciando Backend Golang en puerto 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\Backend\railway'; go run ./cmd/api"

Write-Host "Iniciando Frontend Next.js en http://localhost:3000 ..." -ForegroundColor Blue
Set-Location "$PSScriptRoot\Frontend"
npm.cmd run dev

