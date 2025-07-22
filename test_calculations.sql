-- Script de teste para verificar cálculos
-- Execute este script no SQL Editor do Supabase para verificar se os totais estão sendo calculados corretamente

-- 1. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'investments'
ORDER BY ordinal_position;

-- 2. Exemplo de alguns registros
SELECT 
    ticker,
    date,
    compra,
    venda,
    valor_unit,
    dividendos,
    juros,
    compra * valor_unit as valor_calculado,
    observacoes
FROM investments
WHERE user_id = auth.uid()
ORDER BY ticker, date DESC
LIMIT 20;

-- 3. Totais por ticker (simulando o que o frontend deveria mostrar)
SELECT 
    ticker,
    COUNT(*) as total_operacoes,
    SUM(compra - venda) as posicao_atual,
    SUM(CASE 
        WHEN compra > 0 THEN compra * valor_unit 
        WHEN venda > 0 THEN venda * valor_unit
        ELSE 0 
    END) as total_investido,
    SUM(dividendos) as total_dividendos,
    SUM(juros) as total_juros,
    SUM(dividendos + juros) as total_proventos,
    CASE 
        WHEN SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) > 0 
        THEN ROUND((SUM(dividendos + juros) / SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) * 100)::numeric, 2)
        ELSE 0 
    END as yield_percentual
FROM investments
WHERE user_id = auth.uid()
GROUP BY ticker
ORDER BY ticker;

-- 4. Verificar se há registros com problemas
SELECT 
    ticker,
    date,
    compra,
    venda,
    valor_unit,
    'Valor unitário zerado' as problema
FROM investments
WHERE user_id = auth.uid()
    AND (compra > 0 OR venda > 0)
    AND (valor_unit IS NULL OR valor_unit = 0)
ORDER BY ticker, date;
