# Configuração das Variáveis de Ambiente no Supabase

## Variáveis necessárias para as Edge Functions

Para que o sistema de comandos de voz funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no Supabase:

### 1. APIs de IA
```
ErasmoInvest_API_OPENAI=sk-proj-SUA_CHAVE_OPENAI_AQUI

ErasmoInvest_API_MISTRAL=SUA_CHAVE_MISTRAL_AQUI

ErasmoInvest_API_MISTRAL_text=SUA_CHAVE_MISTRAL_TEXT_AQUI
```

### 2. Configurações do Supabase
```
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA_SUPABASE_AQUI
```

## Como configurar no Supabase Dashboard

1. Acesse o [Dashboard do Supabase](https://app.supabase.com) e entre no seu projeto
2. Vá para **Settings** → **Edge Functions**
3. Clique em **Environment Variables**
4. Adicione cada variável com o nome exato e o valor correspondente

## Edge Functions Implementadas

### 1. `transcribe-audio`
- **Função**: Transcreve áudio para texto usando OpenAI Whisper
- **Variável necessária**: `ErasmoInvest_API_OPENAI`
- **Endpoint**: `https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/transcribe-audio`

### 2. `process-command`
- **Função**: Processa comandos de voz usando Mistral AI (text-only)
- **Variável necessária**: `ErasmoInvest_API_MISTRAL_text`
- **Endpoint**: `https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/process-command`

### 3. `execute-command`
- **Função**: Executa comandos no banco de dados
- **Variáveis necessárias**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Endpoint**: `https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/execute-command`

## Fluxo de Funcionamento

1. **Usuário pressiona e segura o botão** → Gravação de áudio inicia
2. **Usuário solta o botão** → Áudio é enviado para `transcribe-audio`
3. **`transcribe-audio`** → Usa OpenAI Whisper para converter áudio em texto
4. **`process-command`** → Usa Mistral AI para processar comando e extrair informações
5. **`execute-command`** → Executa a ação no banco de dados

## Status das Correções

✅ **Migrado do Netlify Functions para Supabase Edge Functions**
✅ **Implementada API text-only do Mistral**
✅ **Melhorada captura de áudio com MediaRecorder**
✅ **Adicionados logs detalhados para debugging**
✅ **Implementada detecção automática de formato de áudio**

## Próximos Passos

1. Configure as variáveis de ambiente no Supabase
2. Teste o sistema de comandos de voz
3. Monitore os logs das Edge Functions para debug