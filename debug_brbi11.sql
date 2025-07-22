-- Diagnóstico específico para BRBI11
-- Execute este script para entender por que BRBI11 está mostrando R$ 0,00

-- 1. Ver todos os registros de BRBI11
SELECT 
    date,
    compra,
    venda,
    valor_unit,
    dividendos,
    juros,
    compra * valor_unit as valor_investido_calculado,
    observacoes
FROM investments
WHERE user_id = auth.uid()
    AND ticker = 'BRBI11'
ORDER BY date;

-- 2. Cálculo manual dos totais para BRBI11
WITH brbi11_data AS (
    SELECT 
        CASE 
            WHEN compra > 0 THEN 'COMPRA'
            WHEN venda > 0 THEN 'VENDA'
            WHEN dividendos > 0 THEN 'DIVIDENDO'
            WHEN juros > 0 THEN 'JUROS'
            ELSE 'OUTRO'
        END as tipo_operacao,
        compra,
        venda,
        valor_unit,
        dividendos,
        juros,
        CASE 
            WHEN compra > 0 THEN compra * valor_unit
            WHEN venda > 0 THEN venda * valor_unit
            ELSE 0
        END as valor_operacao
    FROM investments
    WHERE user_id = auth.uid()
        AND ticker = 'BRBI11'
)
SELECT 
    tipo_operacao,
    COUNT(*) as quantidade,
    SUM(valor_operacao) as valor_total,
    SUM(dividendos) as total_dividendos,
    SUM(juros) as total_juros
FROM brbi11_data
GROUP BY tipo_operacao
ORDER BY tipo_operacao;

-- 3. Resumo final BRBI11
SELECT 
    'BRBI11' as ticker,
    SUM(compra - venda) as posicao_atual,
    SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) as total_investido,
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
    AND ticker = 'BRBI11';

-- 4. Verificar se há algum problema específico
SELECT 
    'Compras com valor_unit zero ou nulo' as verificacao,
    COUNT(*) as quantidade
FROM investments
WHERE user_id = auth.uid()
    AND ticker = 'BRBI11'
    AND compra > 0
    AND (valor_unit IS NULL OR valor_unit = 0)
UNION ALL
SELECT 
    'Total de compras' as verificacao,
    COUNT(*) as quantidade
FROM investments
WHERE user_id = auth.uid()
    AND ticker = 'BRBI11'
    AND compra > 0
UNION ALL
SELECT 
    'Total de dividendos' as verificacao,
    COUNT(*) as quantidade
FROM investments
WHERE user_id = auth.uid()
    AND ticker = 'BRBI11'
    AND dividendos > 0;
