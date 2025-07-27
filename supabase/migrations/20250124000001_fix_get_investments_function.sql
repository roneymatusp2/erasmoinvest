/*****************************************************************************************
 * SCRIPT FINAL E DEFINITIVO - CORREÇÃO DE NOME DE FUNÇÃO
 *
 * Versão: Arquitetura Final com Nome Corrigido
 * Autor: Gemini
 *
 * Correção:
 * 1. A função principal foi RENOMEADA de volta para `get_investments_by_user_id`
 * para corresponder exatamente ao que a aplicação do usuário está chamando,
 * resolvendo o erro "PGRST202: Could not find the function".
 * 2. Mantém a arquitetura completa, robusta e performática.
 *****************************************************************************************/

--========================================================================================
-- ETAPA 0: LIMPEZA COMPLETA DE TODAS AS FUNÇÕES ANTERIORES
--========================================================================================
DROP FUNCTION IF EXISTS public.get_portfolio_overview(uuid, date);
DROP FUNCTION IF EXISTS public.portfolio_overview(uuid, date);
DROP FUNCTION IF EXISTS public.get_portfolio_positions(uuid, date);
DROP FUNCTION IF EXISTS public.portfolio_positions(uuid, date);
DROP FUNCTION IF EXISTS public.get_investments_by_user_id(uuid, date);
DROP FUNCTION IF EXISTS public.get_investments_by_user_id(uuid);


--========================================================================================
-- ETAPA 1: TABELA DE COTAÇÕES E ÍNDICE DE PERFORMANCE
--========================================================================================
CREATE TABLE IF NOT EXISTS public.asset_prices (
    ticker       text         NOT NULL,
    price_date   date         NOT NULL,
    close_price  numeric(30,7) NOT NULL,
    CONSTRAINT asset_prices_pk PRIMARY KEY (ticker, price_date)
);
CREATE INDEX IF NOT EXISTS idx_investments_user_ticker_date_id ON public.investments (user_id, ticker, date, id);


--========================================================================================
-- ETAPA 2: FUNÇÃO PRINCIPAL - get_investments_by_user_id
-- Esta é a função que seu site chama. Retorna todos os detalhes de cada ativo.
--========================================================================================
CREATE OR REPLACE FUNCTION public.get_investments_by_user_id (
    p_user_id        uuid,
    p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    ticker                   text,
    "currentPosition"        numeric(30,7),
    "averagePrice"           numeric(30,7),
    "totalInvested"          numeric(30,7),
    "currentPrice"           numeric(30,7),
    "currentValue"           numeric(30,7),
    "potentialProfitLoss"    numeric(30,7),
    "potentialProfitLossPct" numeric(12,4),
    "totalDividends"         numeric(30,7),
    "totalJuros"             numeric(30,7),
    "totalImpostos"          numeric(30,7),
    transactions             jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH RECURSIVE
tx AS (
    SELECT id, ticker, date, observacoes,
        COALESCE(compra, 0)::numeric(38,7) AS compra, COALESCE(venda, 0)::numeric(38,7) AS venda,
        COALESCE(valor_unit, 0)::numeric(38,7) AS valor_unit, COALESCE(dividendos, 0)::numeric(38,7) AS dividendos,
        COALESCE(juros, 0)::numeric(38,7) AS juros, COALESCE(impostos, 0)::numeric(38,7) AS impostos
    FROM public.investments WHERE user_id = p_user_id AND date <= p_reference_date
),
ordered_tx AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date, id) AS rn FROM tx
),
cost_basis_calc (ticker, rn, current_qty, current_cost) AS (
    SELECT ticker, rn, (compra - venda), (compra * valor_unit) FROM ordered_tx WHERE rn = 1
    UNION ALL
    SELECT
        next_tx.ticker, next_tx.rn,
        (prev_step.current_qty + next_tx.compra - next_tx.venda),
        CASE
            WHEN next_tx.venda > 0 THEN prev_step.current_cost - (next_tx.venda * (prev_step.current_cost / NULLIF(prev_step.current_qty, 0)))
            ELSE prev_step.current_cost + (next_tx.compra * next_tx.valor_unit)
        END
    FROM cost_basis_calc prev_step JOIN ordered_tx next_tx ON next_tx.ticker = prev_step.ticker AND next_tx.rn = prev_step.rn + 1
),
last_state AS (
    SELECT DISTINCT ON (ticker) ticker, current_qty, COALESCE(current_cost, 0) AS current_cost
    FROM cost_basis_calc ORDER BY ticker, rn DESC
),
summaries AS (
    SELECT ticker, SUM(dividendos) AS divs, SUM(juros) AS juros, SUM(impostos) AS impostos,
           jsonb_agg(jsonb_build_object('date', date, 'compra', compra, 'venda', venda, 'valor_unit', valor_unit) ORDER BY date, id) AS tx_json
    FROM tx GROUP BY ticker
),
prices AS (
    SELECT DISTINCT ON (ticker) ticker, close_price
    FROM public.asset_prices WHERE price_date <= p_reference_date
    ORDER BY ticker, price_date DESC
)
SELECT
    s.ticker,
    l.current_qty::numeric(30,7),
    CASE WHEN l.current_qty > 0 THEN (l.current_cost / l.current_qty) ELSE 0 END::numeric(30,7),
    l.current_cost::numeric(30,7),
    COALESCE(p.close_price, 0)::numeric(30,7),
    (l.current_qty * COALESCE(p.close_price, 0))::numeric(30,7),
    ((l.current_qty * COALESCE(p.close_price, 0)) - l.current_cost)::numeric(30,7),
    CASE WHEN l.current_cost > 0 THEN (((l.current_qty * COALESCE(p.close_price, 0)) - l.current_cost) / l.current_cost * 100)::numeric(12,4) ELSE 0 END,
    COALESCE(s.divs, 0)::numeric(30,7),
    COALESCE(s.juros, 0)::numeric(30,7),
    COALESCE(s.impostos, 0)::numeric(30,7),
    s.tx_json
FROM summaries s
JOIN last_state l USING (ticker)
LEFT JOIN prices p USING (ticker)
WHERE l.current_qty > 0;
$$;
COMMENT ON FUNCTION public.get_investments_by_user_id(uuid, date) IS 'Retorna todos os detalhes de cada posição, incluindo custo-base, valor de mercado e lucro/prejuízo potencial. Este é o nome que a aplicação espera.';


--========================================================================================
-- ETAPA 3: FUNÇÃO DE VISÃO GERAL DO PORTFÓLIO (OPCIONAL, MAS RECOMENDADO)
--========================================================================================
CREATE OR REPLACE FUNCTION public.get_portfolio_overview (
    p_user_id        uuid,
    p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE("totalInvested" numeric(30,7), "currentValue" numeric(30,7), "profitLoss" numeric(30,7), "profitPct" numeric(12,4), "yieldTotal" numeric(30,7))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        SUM("totalInvested"),
        SUM("currentValue"),
        SUM("potentialProfitLoss"),
        CASE WHEN SUM("totalInvested") > 0 THEN
            (SUM("potentialProfitLoss") / SUM("totalInvested") * 100)::numeric(12,4)
        ELSE 0 END,
        SUM("totalDividends" + "totalJuros")
    FROM public.get_investments_by_user_id(p_user_id, p_reference_date);
$$;
COMMENT ON FUNCTION public.get_portfolio_overview(uuid, date) IS 'Fornece a visão geral consolidada do portfólio, simplesmente agregando os resultados da função get_investments_by_user_id.';