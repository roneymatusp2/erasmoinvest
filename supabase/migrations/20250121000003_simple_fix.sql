-- Migration simplificada para corrigir cálculos
-- Esta versão funciona com a estrutura existente sem adicionar campos

-- Criar função helper para cálculo de totais
CREATE OR REPLACE FUNCTION calculate_investment_value(
  compra_qty NUMERIC,
  venda_qty NUMERIC,
  unit_value NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF compra_qty > 0 AND unit_value > 0 THEN
    RETURN compra_qty * unit_value;
  ELSIF venda_qty > 0 AND unit_value > 0 THEN
    RETURN venda_qty * unit_value;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_investments_calc ON investments(compra, venda, valor_unit);

-- View materializada para cálculos rápidos por ticker
CREATE MATERIALIZED VIEW IF NOT EXISTS ticker_summary AS
SELECT 
  user_id,
  ticker,
  SUM(calculate_investment_value(compra, venda, valor_unit)) as total_investido,
  SUM(compra - venda) as posicao_atual,
  SUM(dividendos) as total_dividendos,
  SUM(juros) as total_juros,
  SUM(dividendos + juros) as total_proventos,
  COUNT(*) as total_operacoes,
  MAX(date) as ultima_operacao
FROM investments
GROUP BY user_id, ticker;

-- Criar índice na view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticker_summary ON ticker_summary(user_id, ticker);

-- Função para refresh da view
CREATE OR REPLACE FUNCTION refresh_ticker_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ticker_summary;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar a view quando houver mudanças
CREATE OR REPLACE FUNCTION trigger_refresh_ticker_summary()
RETURNS trigger AS $$
BEGIN
  -- Agenda refresh da view (não bloqueia a operação)
  PERFORM pg_notify('refresh_ticker_summary', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS refresh_ticker_summary_trigger ON investments;
CREATE TRIGGER refresh_ticker_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON investments
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_ticker_summary();

-- Fazer o primeiro refresh
SELECT refresh_ticker_summary();
