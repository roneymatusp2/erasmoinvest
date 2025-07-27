###############################################################################
# Sincronizar SOMENTE as Edge Functions solicitadas – ErasmoInvest           #
# Caminho‑raiz do repositório: C:\Users\roney\WebstormProjects\erasmoinvest – Copy (2)
###############################################################################

# 1. Ir para a pasta‑raiz do projeto
Set-Location 'C:\Users\roney\WebstormProjects\erasmoinvest - Copy (2)'

# 2. Garantir que o diretório .supabase existe (caso seja a primeira vez)
if (-not (Test-Path '.supabase')) {
  npx supabase init | Out-Null
}

# 3. Garantir que o projeto está linkado
npx supabase link --project-ref gjvtncdjcslnkfctqnfy | Out-Null

# 4. Definir as funções que VOCÊ pediu
$wanted = @(
  'process-command',
  'execute-command',
  'text-to-speech',
  'tesouro-direto-proxy',
  'usd-brl-rate',
  'create-user',
  'cognitive-core',
  'ingest-news-cron',
  'ingest-portfolio-webhook',
  'ingest-market-data-cron',
  'sentinel-agent-cron',
  'test-cognitive',
  'master-router',
  'governor-agent',
  'resilience-wrapper',
  'moe-orchestrator',
  'system-health',
  'test-gemini-embedding',
  'validate-system',
  'transcribe-audio'
)

# 5. Obter lista REAL que existe na nuvem
$existing = npx supabase functions list --output json `
            --project-ref gjvtncdjcslnkfctqnfy |
            ConvertFrom-Json |
            ForEach-Object { $_.name }

# 6. Fazer download APENAS das funções desejadas que já estão na nuvem
foreach ($fn in $wanted) {
  if ($existing -contains $fn) {
    Write-Host "⬇️  Baixando $fn..."
    npx supabase functions download $fn --project-ref gjvtncdjcslnkfctqnfy
  } else {
    Write-Host "⚠️  $fn ainda não existe na nuvem – ignorado."
  }
}

Write-Host "`n✅  Sincronização concluída! Veja supabase/functions/."
