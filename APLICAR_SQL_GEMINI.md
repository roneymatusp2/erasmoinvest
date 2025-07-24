# 🚀 APLICAR SQL COMPLETO DO GEMINI

## ✅ PASSO 1: Execute ESTE SQL no Supabase

Copie TODO o conteúdo do arquivo:
`/supabase/migrations/20250124000001_fix_get_investments_function.sql`

E execute no SQL Editor do Supabase Dashboard.

## ✅ PASSO 2: Teste a função

Execute este teste no SQL Editor:
```sql
-- Teste básico
SELECT * FROM get_investments_by_user_id('4362da88-d01c-4ffe-a447-75751ea8e182');

-- Se retornar resultados, teste a visão geral
SELECT * FROM get_portfolio_overview('4362da88-d01c-4ffe-a447-75751ea8e182');
```

## ✅ PASSO 3: Verifique os resultados

A função deve retornar colunas como:
- ticker
- currentPosition
- averagePrice
- totalInvested
- currentPrice
- currentValue
- potentialProfitLoss
- potentialProfitLossPct
- totalDividends
- totalJuros
- totalImpostos
- transactions

## 🔴 SE DER ERRO

### Erro: "relation asset_prices does not exist"
A função usa uma tabela `asset_prices` para cotações. Se não existir, será criada pelo script.

### Erro: "column compra does not exist"
Verifique se sua tabela investments tem as colunas:
- compra (não quantidade)
- venda
- valor_unit
- dividendos
- juros
- impostos

## ✅ CÓDIGO JÁ AJUSTADO

O código TypeScript já foi ajustado para mapear corretamente os campos retornados pela função SQL completa do Gemini.

## 🎯 RESULTADO ESPERADO

Após aplicar o SQL e reiniciar o servidor, você deve ver:
1. Dados carregando corretamente
2. Cálculos de preço médio precisos
3. Lucro/prejuízo calculado corretamente
4. Dividendos e juros totalizados