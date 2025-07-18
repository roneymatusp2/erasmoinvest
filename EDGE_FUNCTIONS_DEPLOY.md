# 🚀 Deploy das Edge Functions - Erasmo Invest

## 📋 **Edge Functions Criadas**

### 1. **transcribe-audio** ✅
- **Função**: Converte áudio para texto usando OpenAI Whisper
- **Entrada**: FormData com arquivo de áudio
- **Saída**: JSON com transcrição
- **Variável ENV**: `ErasmoInvest_API_OPENAI_AUDIO`

### 2. **process-command** ✅ 
- **Função**: Processa comando e extrai intenção usando Mistral AI
- **Entrada**: JSON com texto do comando
- **Saída**: JSON com ação estruturada
- **Variável ENV**: `ErasmoInvest_API_MISTRAL_text`

### 3. **execute-command** ✅
- **Função**: Executa ações no banco PostgreSQL
- **Entrada**: JSON com ação e dados
- **Saída**: JSON com resultado da operação
- **Variáveis ENV**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 4. **text-to-speech** ✅
- **Função**: Converte texto para áudio usando OpenAI TTS
- **Entrada**: JSON com texto e voz
- **Saída**: JSON com áudio em base64
- **Variável ENV**: `ErasmoInvest_API_OPENAI_AUDIO`

## 🔧 **Comandos de Deploy**

```bash
# 1. Fazer login no Supabase
supabase login

# 2. Conectar ao projeto
supabase link --project-ref gjvtncdjcslnkfctqnfy

# 3. Deploy das Edge Functions
supabase functions deploy transcribe-audio
supabase functions deploy process-command  
supabase functions deploy execute-command
supabase functions deploy text-to-speech

# 4. Configurar variáveis de ambiente
supabase secrets set ErasmoInvest_API_OPENAI_AUDIO=sk-...
supabase secrets set ErasmoInvest_API_MISTRAL_text=sk-...
supabase secrets set SUPABASE_URL=https://gjvtncdjcslnkfctqnfy.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🎯 **Status Atual**

### ✅ **Implementação Frontend**
- [x] VoiceCommandService refatorado
- [x] Callbacks estruturados
- [x] Detecção de silêncio automática
- [x] Estados visuais (Recording, Processing, Error)
- [x] Mocks temporários funcionais

### 🔄 **Mocks Temporários Ativos**
- [x] processCommand() - Parser básico de comandos PT-BR
- [x] executeCommand() - Simulação de dados do portfólio
- [x] generateSpeech() - Simulação de reprodução de áudio

### 🚀 **Próximos Passos**
1. Deploy das Edge Functions no Supabase
2. Configurar variáveis de ambiente
3. Substituir mocks pelas chamadas reais
4. Testar fluxo completo STT → IA → Execução → TTS

## 🎮 **Comandos de Teste**

### **Comandos de Texto** (Funcionando com Mock)
```
"Como está meu portfólio?"
"Quantas ações da Vale eu tenho?"
"Adicione 10 ações da Petrobras por 35 reais"
```

### **Comandos de Voz** (Pendente Edge Functions)
- Pressionar e segurar botão azul
- Falar comando
- Soltar para processar

## 📊 **Resposta Mock Atual**

### Consulta Portfólio:
```
💼 Seu portfólio: R$ 15.430,50 investidos em 12 operações. 
Dividendos: R$ 234,80, Juros: R$ 45,20. Yield médio: 1,81%.
```

### Consulta Ativo:
```
📊 VALE3: 100 ações, R$ 2.500,00 investidos. 
Preço médio: R$ 25,00. Proventos: R$ 45,00.
```

### Adicionar Investimento:
```
✅ Investimento adicionado com sucesso! 
COMPRA de 10 VALE3 por R$ 25,00 cada.
```

---

**🎯 SISTEMA FUNCIONAL COM MOCKS - PRONTO PARA DEPLOY DAS EDGE FUNCTIONS!** 🚀 