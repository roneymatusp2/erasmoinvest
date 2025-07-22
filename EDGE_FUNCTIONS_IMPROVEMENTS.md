# Melhorias nas Edge Functions do ErasmoInvest

## Resumo das Alterações

Este documento descreve as melhorias implementadas nas edge functions do Supabase para o sistema ErasmoInvest, focando em:
1. Uso de dados reais do Supabase
2. Integração com Mistral AI
3. Novos comandos e funcionalidades
4. Melhor análise e relatórios

## 1. process-command

### Melhorias Implementadas:
- **Modelo Mistral Atualizado**: Mudou de `mistral-tiny` para `mistral-small-latest` para melhor precisão
- **Novos Comandos Suportados**:
  - Vender investimento
  - Registrar dividendos
  - Registrar juros/JCP
  - Consultar proventos
  - Gerar relatórios completos
- **Prompt Aprimorado**: Inclui lista de tickers comuns brasileiros
- **Response Format JSON**: Força resposta em JSON válido
- **Validação e Normalização**: Converte tickers para maiúsculas e garante campos numéricos

### Comandos Disponíveis:
```
1. ADICIONAR: "Comprei 100 ações de HGLG11 a 160 reais"
2. VENDER: "Vendi 50 ações de PETR4"
3. DIVIDENDO: "Recebi 50 reais de dividendo de XPLG11"
4. JUROS: "TAEE11 pagou 30 reais de JCP"
5. CONSULTAR: "Como está meu portfólio?"
6. ATIVO: "Quantas ações de VALE3 eu tenho?"
7. PROVENTOS: "Quanto recebi de dividendos?"
8. RELATÓRIO: "Gere um relatório completo"
```

## 2. execute-command

### Melhorias Implementadas:
- **Suporte a Múltiplos Usuários**: Detecta user_id do token de autenticação
- **Cálculo de valor_total**: Calcula automaticamente o valor total das transações
- **Novos Actions**:
  - `sell_investment`: Registrar vendas
  - `add_dividend`: Registrar dividendos
  - `add_interest`: Registrar juros/JCP
  - `query_income`: Consultar proventos recebidos
  - `generate_report`: Gerar relatório completo com IA

### Funcionalidades por Action:

#### consult_portfolio
- Agrupa investimentos por ticker
- Calcula posição atual (compras - vendas)
- Soma dividendos e juros por ativo
- Calcula yield on cost
- Gera análise com Mistral AI

#### query_asset
- Mostra posição detalhada do ativo
- Calcula preço médio correto
- Lista últimas transações
- Calcula yield on cost do ativo

#### query_income
- Agrupa proventos por mês
- Identifica top pagadores
- Mostra evolução temporal

#### generate_report
- Análise completa do portfólio
- Diversificação por tipo de ativo
- Performance e rentabilidade
- Recomendações da IA
- Usa modelo `mistral-medium-latest` para relatórios detalhados

### Melhorias nos Cálculos:
- **Preço Médio**: Calcula corretamente considerando apenas compras
- **Valor Investido**: Considera compras (+) e vendas (-)
- **Yield on Cost**: (Proventos / Valor Investido) * 100
- **Identificação de Tipo de Ativo**: 
  - FIIs: terminam com 11
  - Ações BR: terminam com 3-8
  - BDRs: terminam com 34-39
  - ETFs: lista específica
  - Stocks US: apenas letras

## 3. text-to-speech

### Melhorias Implementadas:
- **Suporte Multi-Provider**: Estrutura preparada para múltiplos providers
- **Vozes Brasileiras**: Mapeamento de vozes pt-BR
- **Fallback Handling**: Tratamento de erros com fallback
- **Formato de Resposta**: Inclui provider e formato do áudio

### Observações:
- Mistral AI não possui TTS nativo ainda
- Mantém OpenAI como provider principal
- Usa a chave `ErasmoInvest_API_OPENAI_AUDIO` específica para áudio

## 4. transcribe-audio

### Melhorias Implementadas:
- **Pós-Processamento**: Corrige tickers e palavras comuns
- **Prompt Contextual**: Informa que o áudio contém comandos de investimento
- **Correções Automáticas**:
  - Tickers separados (HGLG 11 → HGLG11)
  - Palavras de comando (compre → comprei)
  - Números decimais (10,50 → 10.50)
- **Multi-Provider Ready**: Estrutura preparada para futuros providers

### Correções Aplicadas:
- Tickers brasileiros comuns
- Verbos de comando
- Formatação numérica
- Remoção de espaços extras

## Configuração de Secrets

As seguintes secrets devem estar configuradas no Supabase:

```
ErasmoInvest_API_MISTRAL       - Para processamento de comandos
ErasmoInvest_API_MISTRAL_text  - Backup para processamento
ErasmoInvest_API_OPENAI_AUDIO  - Para TTS e transcrição
SUPABASE_URL                   - URL do projeto Supabase
SUPABASE_SERVICE_ROLE_KEY     - Chave de serviço do Supabase
```

## Estrutura da Tabela investments

```sql
investments (
  id UUID,
  user_id UUID,
  ticker TEXT,
  date DATE,
  compra NUMERIC,      -- quantidade comprada
  venda NUMERIC,       -- quantidade vendida
  valor_unit NUMERIC,  -- valor unitário
  valor_total NUMERIC, -- calculado automaticamente
  dividendos NUMERIC,
  juros NUMERIC,
  impostos NUMERIC,
  observacoes TEXT
)
```

## Deploy das Functions

Para fazer deploy das functions atualizadas:

```bash
# Deploy individual
supabase functions deploy process-command
supabase functions deploy execute-command
supabase functions deploy text-to-speech
supabase functions deploy transcribe-audio

# Ou deploy de todas
supabase functions deploy --all
```

## Testes Recomendados

### 1. Teste de Comandos de Voz:
```
"Comprei 100 ações de HGLG11 a 160 reais"
"Vendi 50 ações de PETR4 por 35 reais"
"Recebi 100 reais de dividendo de XPLG11"
"Como está meu portfólio?"
"Gere um relatório completo"
```

### 2. Teste de Consultas:
```
"Quantas ações de VALE3 eu tenho?"
"Quanto recebi de dividendos este mês?"
"Qual meu yield médio?"
```

### 3. Teste de Relatórios:
```
"Análise do meu portfólio"
"Relatório de proventos"
"Performance dos investimentos"
```

## Melhorias Futuras Sugeridas

1. **Cache de Cotações**: Integrar com API de cotações em tempo real
2. **Análise de Risco**: Calcular volatilidade e correlação
3. **Metas e Objetivos**: Permitir definir metas de investimento
4. **Alertas**: Notificar sobre dividendos, splits, etc.
5. **Integração com Corretoras**: Importar extratos automaticamente
6. **Gráficos**: Gerar visualizações com a IA 