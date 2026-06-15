$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "database\pincel-luz-erp.sqlite")) {
  npm run db:sqlite
}

$apiPort = 8787
$vitePort = 5173

$apiListening = Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue
if (-not $apiListening) {
  Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "server\local_api.py" -WorkingDirectory $root
  Start-Sleep -Seconds 2
}

$viteListening = Get-NetTCPConnection -LocalPort $vitePort -State Listen -ErrorAction SilentlyContinue
if (-not $viteListening) {
  Start-Process -WindowStyle Hidden -FilePath "npm" -ArgumentList "run dev -- --host 127.0.0.1 --port $vitePort" -WorkingDirectory $root
  Start-Sleep -Seconds 3
}

Write-Host "ERP local pronto:"
Write-Host "  App: http://127.0.0.1:$vitePort"
Write-Host "  API: http://127.0.0.1:$apiPort/api/local/health"
Write-Host "  DB : $root\database\pincel-luz-erp.sqlite"
