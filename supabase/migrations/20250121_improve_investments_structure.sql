-- Migration para garantir estrutura correta da tabela investments
-- e adicionar funcionalidades extras

-- 1. Adicionar coluna valor_total se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'investments' 
        AND column_name = 'valor_total'
    ) THEN
        ALTER TABLE investments 
        ADD COLUMN valor_total NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. Criar função para calcular valor_total automaticamente
CREATE OR REPLACE FUNCTION calculate_investment_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valor_total baseado em compra/venda e valor_unit
    IF NEW.compra > 0 THEN
        NEW.valor_total := NEW.compra * NEW.valor_unit;
    ELSIF NEW.venda > 0 THEN
        NEW.valor_total := NEW.venda * NEW.valor_unit;
    ELSE
        NEW.valor_total := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para calcular valor_total automaticamente
DROP TRIGGER IF EXISTS calculate_total_trigger ON investments;
CREATE TRIGGER calculate_total_trigger
BEFORE INSERT OR UPDATE ON investments
FOR EACH ROW
EXECUTE FUNCTION calculate_investment_total();

-- 4. Atualizar registros existentes
UPDATE investments
SET valor_total = CASE
    WHEN compra > 0 THEN compra * valor_unit
    WHEN venda > 0 THEN venda * valor_unit
    ELSE 0
END
WHERE valor_total IS NULL OR valor_total = 0;

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_investments_user_ticker 
ON investments(user_id, ticker);

CREATE INDEX IF NOT EXISTS idx_investments_date 
ON investments(date DESC);

CREATE INDEX IF NOT EXISTS idx_investments_proventos 
ON investments(user_id, dividendos, juros)
WHERE dividendos > 0 OR juros > 0;

-- 6. Criar view para resumo do portfólio
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
    user_id,
    ticker,
    SUM(compra) as total_compra,
    SUM(venda) as total_venda,
    SUM(compra) - SUM(venda) as posicao_atual,
    SUM(CASE WHEN compra > 0 THEN valor_total ELSE 0 END) -
    SUM(CASE WHEN venda > 0 THEN valor_total ELSE 0 END) as valor_investido,
    SUM(dividendos) as total_dividendos,
    SUM(juros) as total_juros,
    SUM(dividendos + juros) as total_proventos,
    CASE 
        WHEN SUM(CASE WHEN compra > 0 THEN valor_total ELSE 0 END) > 0
        THEN (SUM(dividendos + juros) / 
              SUM(CASE WHEN compra > 0 THEN valor_total ELSE 0 END)) * 100
        ELSE 0
    END as yield_on_cost,
    COUNT(*) as num_transacoes,
    MIN(date) as primeira_transacao,
    MAX(date) as ultima_transacao
FROM investments
GROUP BY user_id, ticker
HAVING SUM(compra) - SUM(venda) > 0 OR SUM(dividendos + juros) > 0;

-- 7. Criar view para proventos mensais
CREATE OR REPLACE VIEW monthly_income AS
SELECT 
    user_id,
    DATE_TRUNC('month', date) as mes,
    SUM(dividendos) as dividendos_mes,
    SUM(juros) as juros_mes,
    SUM(dividendos + juros) as total_mes,
    COUNT(DISTINCT ticker) as num_pagadores
FROM investments
WHERE dividendos > 0 OR juros > 0
GROUP BY user_id, DATE_TRUNC('month', date)
ORDER BY mes DESC;

-- 8. Criar função para análise de portfólio
CREATE OR REPLACE FUNCTION analyze_portfolio(p_user_id UUID)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH portfolio_stats AS (
        SELECT 
            SUM(valor_investido) as total_investido,
            SUM(total_proventos) as total_proventos,
            COUNT(DISTINCT ticker) as num_ativos,
            AVG(yield_on_cost) as yield_medio
        FROM portfolio_summary
        WHERE user_id = p_user_id
    ),
    concentration AS (
        SELECT 
            MAX(valor_investido) / NULLIF(SUM(valor_investido), 0) * 100 as max_concentration
        FROM portfolio_summary
        WHERE user_id = p_user_id
    )
    SELECT 'Total Investido'::TEXT, total_investido FROM portfolio_stats
    UNION ALL
    SELECT 'Total Proventos'::TEXT, total_proventos FROM portfolio_stats
    UNION ALL
    SELECT 'Número de Ativos'::TEXT, num_ativos FROM portfolio_stats
    UNION ALL
    SELECT 'Yield Médio %'::TEXT, yield_medio FROM portfolio_stats
    UNION ALL
    SELECT 'Concentração Máxima %'::TEXT, max_concentration FROM concentration;
END;
$$ LANGUAGE plpgsql;

-- 9. Adicionar comentários para documentação
COMMENT ON TABLE investments IS 'Tabela principal de investimentos com compras, vendas e proventos';
COMMENT ON COLUMN investments.compra IS 'Quantidade de ativos comprados';
COMMENT ON COLUMN investments.venda IS 'Quantidade de ativos vendidos';
COMMENT ON COLUMN investments.valor_unit IS 'Valor unitário da transação';
COMMENT ON COLUMN investments.valor_total IS 'Valor total calculado automaticamente (quantidade * valor_unit)';
COMMENT ON VIEW portfolio_summary IS 'Resumo consolidado do portfólio por ativo';
COMMENT ON VIEW monthly_income IS 'Proventos recebidos agrupados por mês'; 