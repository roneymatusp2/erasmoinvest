# ==============================================================================
# SCRIPT PARA CONSOLIDAR CÓDIGO DO PROJECTO NUM ÚNICO TXT
# Versão 2.3 – ASCII only, sem ícones Unicode
# ==============================================================================

# Requer admin (opcional: comente se não quiser)
#Requires -RunAsAdministrator

# --- CAMINHO DO PROJECTO -------------------------------------------------------
$ProjectRoot     = "C:\Users\roney\WebstormProjects\erasmoinvest - Copy (2)"
$OutputFileName  = "erasmoinvest_code.txt"

# Extensões a incluir
$IncludeExtensions = @("*.js","*.ts","*.jsx","*.tsx",
                       "*.css","*.html","*.json","*.mjs","*.cjs")

# Pastas a ignorar
$ExcludeFolders    = @("node_modules","dist",".git",".idea",".vscode",
                       "build","coverage","supabase")

# --- INÍCIO -------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $ProjectRoot)) {
    Write-Error "Pasta não encontrada: $ProjectRoot"
    exit 1
}

Set-Location -LiteralPath $ProjectRoot
$OutputPath = Join-Path -Path $ProjectRoot -ChildPath $OutputFileName

if (Test-Path -LiteralPath $OutputPath) {
    Remove-Item -LiteralPath $OutputPath -Force
    Write-Host "Arquivo antigo removido: $OutputFileName" -ForegroundColor Yellow
}

Write-Host "Consolidando código em $ProjectRoot" -ForegroundColor Cyan
Write-Host "Ignorando pastas: $($ExcludeFolders -join ', ')" -ForegroundColor Gray

$Files = Get-ChildItem -Recurse -File -Include $IncludeExtensions |
         Where-Object {
             $path = $_.FullName
             -not ($ExcludeFolders | Where-Object { $path -match "\\$_(\\|$)" })
         }

Write-Host "Total de arquivos: $($Files.Count)" -ForegroundColor Green

foreach ($File in $Files) {
    $RelPath = $File.FullName.Substring($ProjectRoot.Length + 1)

    $Header = @"
# ==============================================================================
# ARQUIVO: $RelPath
# ==============================================================================
"@

    Add-Content -LiteralPath $OutputPath -Value $Header
    Add-Content -LiteralPath $OutputPath -Value (Get-Content -LiteralPath $File.FullName -Raw)
}

Write-Host "Processo concluído. Arquivo gerado em: $OutputPath" -ForegroundColor Magenta
