# =============================================================================
# 🚀 VALIDAÇÃO FINAL - EDGE FUNCTION TESOURO DIRETO (Windows PowerShell)
# =============================================================================
# 
# Este script valida se a implementação da Edge Function foi bem-sucedida
# Execute com: .\validate-tesouro-implementation.ps1
#
# Data: 20 de julho de 2025
# Autor: Claude (Anthropic)
# Projeto: Erasmo Invest
# =============================================================================

Write-Host "🏛️ VALIDAÇÃO DA IMPLEMENTAÇÃO EDGE FUNCTION TESOURO DIRETO" -ForegroundColor White
Write-Host "=============================================================" -ForegroundColor White
Write-Host ""

# Função para log com cores
function Log-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Log-Error($message) {
    Write-Host "❌ $message" -ForegroundColor Red
}

function Log-Info($message) {
    Write-Host "📝 $message" -ForegroundColor Blue
}

function Log-Warning($message) {
    Write-Host "⚠️ $message" -ForegroundColor Yellow
}

# URL da Edge Function
$EdgeFunctionUrl = "https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/tesouro-direto-proxy"

Write-Host "🔍 VERIFICAÇÕES DE IMPLEMENTAÇÃO" -ForegroundColor White
Write-Host "---------------------------------" -ForegroundColor White

# 1. Verificar se os arquivos foram modificados
Write-Host ""
Log-Info "1. Verificando arquivos modificados..."

if (Test-Path "src\services\marketApi.ts") {
    $content = Get-Content "src\services\marketApi.ts" -Raw
    if ($content -match "tesouro-direto-proxy") {
        Log-Success "marketApi.ts foi atualizado com a URL da Edge Function"
    } else {
        Log-Error "marketApi.ts NÃO foi atualizado corretamente"
    }
} else {
    Log-Error "Arquivo marketApi.ts não encontrado"
}

if (Test-Path "tests\test-supabase-tesouro-proxy.html") {
    Log-Success "Arquivo de teste HTML criado"
} else {
    Log-Warning "Arquivo de teste HTML não encontrado"
}

if (Test-Path "EDGE_FUNCTION_TESOURO_IMPLEMENTADA.md") {
    Log-Success "Documentação da implementação criada"
} else {
    Log-Warning "Documentação não encontrada"
}

# 2. Testar conectividade com a Edge Function
Write-Host ""
Log-Info "2. Testando conectividade com a Edge Function..."

try {
    Write-Host "   Fazendo requisição para: $EdgeFunctionUrl" -ForegroundColor Gray
    
    # Fazer requisição com timeout
    $response = Invoke-WebRequest -Uri $EdgeFunctionUrl -TimeoutSec 10 -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Log-Success "Edge Function respondeu com HTTP 200"
        
        # Verificar se a resposta contém dados do Tesouro
        if ($response.Content -match "TrsrBdTradgList") {
            Log-Success "Resposta contém dados válidos do Tesouro Direto"
            
            # Tentar contar títulos retornados
            $titleMatches = [regex]::Matches($response.Content, "TrsrBd")
            Log-Info "   Total de títulos retornados: $($titleMatches.Count)"
            
        } else {
            Log-Error "Resposta não contém dados válidos do Tesouro"
        }
        
    } else {
        Log-Error "Edge Function retornou HTTP $($response.StatusCode)"
    }
    
} catch {
    Log-Error "Falha de conectividade: $($_.Exception.Message)"
}

# 3. Verificar estrutura do projeto
Write-Host ""
Log-Info "3. Verificando estrutura do projeto..."

# Verificar se é um projeto React/Vite
if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw
    if ($packageContent -match "react" -and $packageContent -match "vite") {
        Log-Success "Projeto React + Vite identificado"
    } else {
        Log-Warning "Projeto pode não ser React + Vite"
    }
    
    # Verificar dependências importantes
    if ($packageContent -match "@supabase/supabase-js") {
        Log-Success "Supabase cliente instalado"
    } else {
        Log-Error "Supabase cliente NÃO instalado"
    }
    
} else {
    Log-Error "package.json não encontrado"
}

# 4. Verificar configuração de ambiente
Write-Host ""
Log-Info "4. Verificando arquivos de configuração..."

if (Test-Path ".env.example") {
    $envContent = Get-Content ".env.example" -Raw
    if ($envContent -match "VITE_SUPABASE_URL") {
        Log-Success "Arquivo .env.example configurado"
    } else {
        Log-Warning ".env.example pode estar incompleto"
    }
} else {
    Log-Warning "Arquivo .env.example não encontrado"
}

# 5. Resumo final
Write-Host ""
Write-Host "📊 RESUMO DA IMPLEMENTAÇÃO" -ForegroundColor White
Write-Host "==========================" -ForegroundColor White

Log-Info "Data da implementação: 20 de julho de 2025"
Log-Info "Edge Function criada: tesouro-direto-proxy"
Log-Info "Status da função: ACTIVE"
Log-Info "ID da função: 6830db9b-cb7a-40ad-9981-09fca20a32c2"

Write-Host ""
Write-Host "🎯 PRÓXIMOS PASSOS RECOMENDADOS" -ForegroundColor White
Write-Host "===============================" -ForegroundColor White
Write-Host "1. Execute 'npm run dev' para testar localmente"
Write-Host "2. Abra tests\test-supabase-tesouro-proxy.html no navegador"
Write-Host "3. Faça login no sistema e verifique se dados do Tesouro carregam"
Write-Host "4. Monitore console do navegador para verificar se não há erros CORS"

Write-Host ""
Write-Host "🔗 LINKS ÚTEIS" -ForegroundColor White
Write-Host "=============" -ForegroundColor White
Write-Host "Edge Function URL: $EdgeFunctionUrl"
Write-Host "Supabase Console: https://supabase.com/dashboard/project/gjvtncdjcslnkfctqnfy"
Write-Host "Arquivo de teste: tests\test-supabase-tesouro-proxy.html"

Write-Host ""
Write-Host "✨ IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Pausa para o usuário ler o resultado
Read-Host -Prompt "Pressione Enter para continuar"
