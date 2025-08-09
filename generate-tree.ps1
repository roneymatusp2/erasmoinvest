# Script para gerar árvore de arquivos do projeto
# Exclui pastas de build, dependências e arquivos temporários

param(
    [string]$Path = ".",
    [string]$OutputFile = "project-tree.txt"
)

function Get-ProjectTree {
    param(
        [string]$CurrentPath,
        [string]$Prefix = "",
        [int]$Depth = 0
    )

    # Pastas e arquivos a serem excluídos
    $ExcludedFolders = @(
        "node_modules", "dist", "build", ".git", ".vscode", ".idea",
        ".next", ".nuxt", "coverage", ".nyc_output", "tmp", "temp",
        ".cache", ".parcel-cache", ".claude"
    )

    $ExcludedFiles = @(
        "*.log", "*.tmp", "*.lock", "package-lock.json", "yarn.lock",
        "*.cache", "*.pid", "*.seed", "*.pid.lock", "*.tgz", "*.tar.gz"
    )

    # Limita a profundidade para evitar loops infinitos
    if ($Depth -gt 10) { return }

    try {
        $Items = Get-ChildItem -Path $CurrentPath -Force | Where-Object {
            $item = $_

            # Verifica se é pasta excluída
            if ($item.PSIsContainer) {
                return $ExcludedFolders -notcontains $item.Name
            }

            # Verifica se é arquivo excluído
            $isExcluded = $false
            foreach ($pattern in $ExcludedFiles) {
                if ($item.Name -like $pattern) {
                    $isExcluded = $true
                    break
                }
            }
            return -not $isExcluded
        }

        $Items = $Items | Sort-Object PSIsContainer, Name

        for ($i = 0; $i -lt $Items.Count; $i++) {
            $item = $Items[$i]
            $isLast = ($i -eq ($Items.Count - 1))

            if ($isLast) {
                $currentPrefix = "└── "
                $nextPrefix = $Prefix + "    "
            } else {
                $currentPrefix = "├── "
                $nextPrefix = $Prefix + "│   "
            }

            if ($item.PSIsContainer) {
                Write-Output "$Prefix$currentPrefix$($item.Name)/"
                Get-ProjectTree -CurrentPath $item.FullName -Prefix $nextPrefix -Depth ($Depth + 1)
            } else {
                Write-Output "$Prefix$currentPrefix$($item.Name)"
            }
        }
    }
    catch {
        Write-Warning "Erro ao acessar: $CurrentPath - $($_.Exception.Message)"
    }
}

# Gera o cabeçalho
$ProjectName = Split-Path -Leaf (Get-Location)
$Header = @"
ESTRUTURA DO PROJETO: $ProjectName
Gerado em: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
===============================================

$ProjectName/
"@

# Gera a árvore
Write-Host "Gerando estrutura em árvore do projeto..." -ForegroundColor Green
$TreeOutput = Get-ProjectTree -CurrentPath $Path

# Combina cabeçalho e árvore
$FullOutput = $Header + "`n" + ($TreeOutput -join "`n")

# Salva no arquivo
$FullOutput | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "Estrutura salva em: $OutputFile" -ForegroundColor Green
Write-Host "Total de linhas: $($TreeOutput.Count + 4)" -ForegroundColor Cyan

# Mostra preview das primeiras linhas
Write-Host "`nPreview das primeiras linhas:" -ForegroundColor Yellow
$FullOutput -split "`n" | Select-Object -First 20 | ForEach-Object { Write-Host $_ }

if ($TreeOutput.Count -gt 16) {
    Write-Host "..." -ForegroundColor Gray
    Write-Host "Arquivo completo salvo em $OutputFile" -ForegroundColor Green
}
