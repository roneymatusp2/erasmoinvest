-- Script para executar manualmente no Supabase
-- Verifica a estrutura atual da tabela investments

-- 1. Verificar se a coluna valor_total existe
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'investments' 
  AND column_name = 'valor_total';

-- 2. Listar todas as colunas da tabela
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'investments'
ORDER BY ordinal_position;

-- 3. Verificar alguns registros de exemplo
SELECT 
  ticker,
  date,
  compra,
  venda,
  valor_unit,
  dividendos,
  juros,
  CASE 
    WHEN compra > 0 THEN compra * valor_unit
    WHEN venda > 0 THEN venda * valor_unit
    ELSE 0
  END as valor_total_calculado
FROM investments
LIMIT 10;

-- 4. Estatísticas por ticker
SELECT 
  ticker,
  COUNT(*) as total_registros,
  SUM(CASE WHEN compra > 0 THEN 1 ELSE 0 END) as total_compras,
  SUM(CASE WHEN venda > 0 THEN 1 ELSE 0 END) as total_vendas,
  SUM(CASE WHEN dividendos > 0 THEN 1 ELSE 0 END) as total_dividendos,
  SUM(CASE WHEN juros > 0 THEN 1 ELSE 0 END) as total_juros,
  SUM(CASE 
    WHEN compra > 0 AND valor_unit > 0 THEN compra * valor_unit
    ELSE 0
  END) as total_investido
FROM investments
GROUP BY ticker
ORDER BY ticker;
