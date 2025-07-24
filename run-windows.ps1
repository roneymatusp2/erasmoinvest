# Script PowerShell para rodar no Windows nativo
Write-Host "🚀 Iniciando ErasmoInvest no Windows..." -ForegroundColor Green

# Limpar processos antigos
Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like "*vite*"} | Stop-Process -Force

# Limpar cache
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

# Iniciar o servidor
Write-Host "📦 Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
npm run dev