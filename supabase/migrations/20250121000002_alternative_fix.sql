-- Migration alternativa - executar manualmente se a anterior falhar

-- Primeiro, vamos verificar e corrigir a estrutura básica
-- Esta versão é mais segura e não assume a existência de campos

-- Função para calcular valor total baseado na estrutura atual
CREATE OR REPLACE FUNCTION get_investment_total(
  p_compra NUMERIC,
  p_venda NUMERIC,
  p_valor_unit NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF p_compra > 0 AND p_valor_unit > 0 THEN
    RETURN p_compra * p_valor_unit;
  ELSIF p_venda > 0 AND p_valor_unit > 0 THEN
    RETURN p_venda * p_valor_unit;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- View para facilitar visualização com valores calculados
CREATE OR REPLACE VIEW investments_with_totals AS
SELECT 
  *,
  get_investment_total(compra, venda, valor_unit) as valor_total_calculado,
  CASE 
    WHEN compra > 0 THEN 'COMPRA'
    WHEN venda > 0 THEN 'VENDA'
    WHEN dividendos > 0 THEN 'DIVIDENDO'
    WHEN juros > 0 THEN 'JUROS'
    ELSE 'OUTRO'
  END as tipo_operacao
FROM investments;

-- Função para retornar totais por ticker
CREATE OR REPLACE FUNCTION get_ticker_totals(p_user_id UUID)
RETURNS TABLE (
  ticker TEXT,
  total_investido NUMERIC,
  total_cotas NUMERIC,
  total_dividendos NUMERIC,
  total_juros NUMERIC,
  preco_medio NUMERIC,
  dy_percentual NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.ticker,
    SUM(get_investment_total(i.compra, i.venda, i.valor_unit))::NUMERIC as total_investido,
    SUM(i.compra - i.venda)::NUMERIC as total_cotas,
    SUM(i.dividendos)::NUMERIC as total_dividendos,
    SUM(i.juros)::NUMERIC as total_juros,
    CASE 
      WHEN SUM(i.compra - i.venda) > 0 THEN
        (SUM(get_investment_total(i.compra, i.venda, i.valor_unit)) / SUM(i.compra - i.venda))::NUMERIC
      ELSE 0
    END as preco_medio,
    CASE 
      WHEN SUM(get_investment_total(i.compra, i.venda, i.valor_unit)) > 0 THEN
        ((SUM(i.dividendos) + SUM(i.juros)) / SUM(get_investment_total(i.compra, i.venda, i.valor_unit)) * 100)::NUMERIC
      ELSE 0
    END as dy_percentual
  FROM investments i
  WHERE i.user_id = p_user_id
  GROUP BY i.ticker
  ORDER BY i.ticker;
END;
$$ LANGUAGE plpgsql;

-- Teste da função
-- SELECT * FROM get_ticker_totals('seu-user-id-aqui');
