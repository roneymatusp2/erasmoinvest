# Deploy das Edge Functions do ErasmoInvest

## Pré-requisitos

1. Ter o Supabase CLI instalado
2. Estar autenticado no Supabase CLI
3. Ter as secrets configuradas no dashboard do Supabase

## Secrets Necessárias

Configure as seguintes secrets no dashboard do Supabase (Settings > Edge Functions > Secrets):

```
ErasmoInvest_API_MISTRAL        # API key da Mistral AI para processamento
ErasmoInvest_API_OPENAI_AUDIO   # API key da OpenAI para TTS e transcrição
```

## Deploy Individual

Para fazer deploy de uma função específica:

```bash
# Deploy da função process-command
supabase functions deploy process-command --project-ref gjvtncdjcslnkfctqnfy

# Deploy da função execute-command
supabase functions deploy execute-command --project-ref gjvtncdjcslnkfctqnfy

# Deploy da função text-to-speech
supabase functions deploy text-to-speech --project-ref gjvtncdjcslnkfctqnfy

# Deploy da função transcribe-audio
supabase functions deploy transcribe-audio --project-ref gjvtncdjcslnkfctqnfy
```

## Deploy de Todas as Functions

Para fazer deploy de todas as functions de uma vez:

```bash
supabase functions deploy --project-ref gjvtncdjcslnkfctqnfy
```

## Aplicar Migrations

Para aplicar as migrations do banco de dados:

```bash
# Push todas as migrations
supabase db push --project-ref gjvtncdjcslnkfctqnfy

# Ou aplicar migration específica
supabase db push --project-ref gjvtncdjcslnkfctqnfy --include 20250121_improve_investments_structure.sql
```

## Testar as Functions

### 1. Testar process-command
```bash
curl -X POST https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/process-command \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"text": "Comprei 100 ações de HGLG11 a 160 reais"}'
```

### 2. Testar execute-command
```bash
curl -X POST https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/execute-command \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "action": "consult_portfolio",
    "data": {},
    "isVoice": false
  }'
```

### 3. Testar text-to-speech
```bash
curl -X POST https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/text-to-speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"text": "Olá, bem-vindo ao ErasmoInvest"}'
```

## Logs e Monitoramento

Para ver os logs das functions:

```bash
# Logs em tempo real
supabase functions logs process-command --project-ref gjvtncdjcslnkfctqnfy --tail

# Logs das últimas 24h
supabase functions logs execute-command --project-ref gjvtncdjcslnkfctqnfy
```

## Troubleshooting

### Erro de CORS
Se encontrar erros de CORS, verifique se os headers estão configurados corretamente nas functions.

### Erro de Autenticação
Verifique se as secrets estão configuradas corretamente no dashboard do Supabase.

### Erro de Permissão
Certifique-se de usar a chave de serviço (service_role_key) para operações administrativas.

## Estrutura das Functions

```
supabase/functions/
├── process-command/     # Processa comandos de texto/voz com Mistral AI
├── execute-command/     # Executa ações no banco de dados
├── text-to-speech/      # Converte texto em fala
└── transcribe-audio/    # Converte áudio em texto
```

## Melhorias Implementadas

1. **process-command**: Usa Mistral AI com prompts otimizados para investimentos
2. **execute-command**: Suporta múltiplas ações e gera relatórios com IA
3. **text-to-speech**: Preparado para múltiplos providers
4. **transcribe-audio**: Pós-processamento para corrigir tickers

## Próximos Passos

1. Adicionar cache para melhorar performance
2. Implementar rate limiting
3. Adicionar métricas e analytics
4. Integrar com APIs de cotações em tempo real 