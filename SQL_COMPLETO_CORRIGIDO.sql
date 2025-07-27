/*****************************************************************************************
 * SCRIPT COMPLETO E DEFINITIVO - FUNÇÃO CORRIGIDA
 *
 * Versão: Arquitetura Completa com Transações Individuais
 * 
 * Este script mantém a arquitetura robusta do Gemini e adiciona:
 * 1. Retorno das transações individuais no campo investments
 * 2. Cálculos precisos de custo-base usando método recursivo
 * 3. Suporte completo para todos os tipos de operações
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
-- VERSÃO COMPLETA: Retorna agregados E transações individuais
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
    transactions             jsonb,
    investments              jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH RECURSIVE
-- Buscar todas as transações
tx AS (
    SELECT 
        id, ticker, date, observacoes, created_at, updated_at,
        COALESCE(compra, 0)::numeric(38,7) AS compra, 
        COALESCE(venda, 0)::numeric(38,7) AS venda,
        COALESCE(valor_unit, 0)::numeric(38,7) AS valor_unit, 
        COALESCE(dividendos, 0)::numeric(38,7) AS dividendos,
        COALESCE(juros, 0)::numeric(38,7) AS juros, 
        COALESCE(impostos, 0)::numeric(38,7) AS impostos
    FROM public.investments 
    WHERE user_id = p_user_id AND date <= p_reference_date
),
-- Ordenar as transações
ordered_tx AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date, id) AS rn 
    FROM tx
),
-- Calcular custo-base recursivamente
cost_basis_calc (ticker, rn, current_qty, current_cost) AS (
    SELECT 
        ticker, 
        rn, 
        (compra - venda), 
        (compra * valor_unit) 
    FROM ordered_tx 
    WHERE rn = 1
    
    UNION ALL
    
    SELECT
        next_tx.ticker, 
        next_tx.rn,
        (prev_step.current_qty + next_tx.compra - next_tx.venda),
        CASE
            WHEN next_tx.venda > 0 THEN 
                prev_step.current_cost - (next_tx.venda * (prev_step.current_cost / NULLIF(prev_step.current_qty, 0)))
            ELSE 
                prev_step.current_cost + (next_tx.compra * next_tx.valor_unit)
        END
    FROM cost_basis_calc prev_step 
    JOIN ordered_tx next_tx ON next_tx.ticker = prev_step.ticker AND next_tx.rn = prev_step.rn + 1
),
-- Pegar o estado final de cada ativo
last_state AS (
    SELECT DISTINCT ON (ticker) 
        ticker, 
        current_qty, 
        COALESCE(current_cost, 0) AS current_cost
    FROM cost_basis_calc 
    ORDER BY ticker, rn DESC
),
-- Resumos e agregações
summaries AS (
    SELECT 
        ticker, 
        SUM(dividendos) AS divs, 
        SUM(juros) AS juros, 
        SUM(impostos) AS impostos,
        jsonb_agg(
            jsonb_build_object(
                'date', date, 
                'compra', compra, 
                'venda', venda, 
                'valor_unit', valor_unit,
                'dividendos', dividendos,
                'juros', juros,
                'impostos', impostos,
                'observacoes', observacoes
            ) ORDER BY date, id
        ) AS tx_json
    FROM tx 
    GROUP BY ticker
),
-- Transações completas para o campo investments
full_investments AS (
    SELECT 
        ticker,
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'ticker', ticker,
                'date', date,
                'tipo', CASE 
                    WHEN compra > 0 AND venda = 0 THEN 'COMPRA'
                    WHEN venda > 0 AND compra = 0 THEN 'VENDA'
                    WHEN dividendos > 0 THEN 'DIVIDENDO'
                    WHEN juros > 0 THEN 'JUROS'
                    ELSE 'OUTRO'
                END,
                'quantidade', CASE 
                    WHEN compra > 0 THEN compra
                    WHEN venda > 0 THEN venda
                    ELSE 0
                END,
                'compra', compra,
                'venda', venda,
                'valor_unitario', valor_unit,
                'valor_unit', valor_unit,
                'valor_total', CASE 
                    WHEN compra > 0 THEN compra * valor_unit
                    WHEN venda > 0 THEN venda * valor_unit
                    ELSE 0
                END,
                'dividendos', dividendos,
                'juros', juros,
                'impostos', impostos,
                'observacoes', observacoes,
                'created_at', created_at,
                'updated_at', updated_at
            ) ORDER BY date, id
        ) AS investments_json
    FROM tx
    GROUP BY ticker
),
-- Preços de mercado
prices AS (
    SELECT DISTINCT ON (ticker) 
        ticker, 
        close_price
    FROM public.asset_prices 
    WHERE price_date <= p_reference_date
    ORDER BY ticker, price_date DESC
)
-- Query final
SELECT
    s.ticker,
    l.current_qty::numeric(30,7),
    CASE 
        WHEN l.current_qty > 0 THEN (l.current_cost / l.current_qty) 
        ELSE 0 
    END::numeric(30,7) AS average_price,
    l.current_cost::numeric(30,7) AS total_invested,
    COALESCE(p.close_price, 0)::numeric(30,7) AS current_price,
    (l.current_qty * COALESCE(p.close_price, 0))::numeric(30,7) AS current_value,
    ((l.current_qty * COALESCE(p.close_price, 0)) - l.current_cost)::numeric(30,7) AS profit_loss,
    CASE 
        WHEN l.current_cost > 0 THEN 
            (((l.current_qty * COALESCE(p.close_price, 0)) - l.current_cost) / l.current_cost * 100)::numeric(12,4) 
        ELSE 0 
    END AS profit_loss_pct,
    COALESCE(s.divs, 0)::numeric(30,7) AS total_dividends,
    COALESCE(s.juros, 0)::numeric(30,7) AS total_juros,
    COALESCE(s.impostos, 0)::numeric(30,7) AS total_impostos,
    s.tx_json AS transactions,
    COALESCE(fi.investments_json, '[]'::jsonb) AS investments
FROM summaries s
JOIN last_state l USING (ticker)
LEFT JOIN prices p USING (ticker)
LEFT JOIN full_investments fi USING (ticker)
WHERE l.current_qty > 0
ORDER BY s.ticker;
$$;

COMMENT ON FUNCTION public.get_investments_by_user_id(uuid, date) IS 
'Retorna todos os detalhes de cada posição, incluindo custo-base, valor de mercado, lucro/prejuízo e as transações individuais no campo investments.';


--========================================================================================
-- ETAPA 3: FUNÇÃO DE VISÃO GERAL DO PORTFÓLIO
--========================================================================================
CREATE OR REPLACE FUNCTION public.get_portfolio_overview (
    p_user_id        uuid,
    p_reference_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    "totalInvested" numeric(30,7), 
    "currentValue" numeric(30,7), 
    "profitLoss" numeric(30,7), 
    "profitPct" numeric(12,4), 
    "yieldTotal" numeric(30,7)
)
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

COMMENT ON FUNCTION public.get_portfolio_overview(uuid, date) IS 
'Fornece a visão geral consolidada do portfólio.';


--========================================================================================
-- ETAPA 4: FUNÇÃO PARA BUSCAR TRANSAÇÕES DE UM TICKER ESPECÍFICO
--========================================================================================
CREATE OR REPLACE FUNCTION public.get_ticker_transactions (
    p_user_id uuid,
    p_ticker text
)
RETURNS TABLE (
    id uuid,
    ticker text,
    date date,
    tipo text,
    quantidade numeric,
    compra numeric,
    venda numeric,
    valor_unitario numeric,
    valor_total numeric,
    dividendos numeric,
    juros numeric,
    impostos numeric,
    observacoes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        id,
        ticker,
        date,
        CASE 
            WHEN compra > 0 AND venda = 0 THEN 'COMPRA'
            WHEN venda > 0 AND compra = 0 THEN 'VENDA'
            WHEN dividendos > 0 THEN 'DIVIDENDO'
            WHEN juros > 0 THEN 'JUROS'
            ELSE 'OUTRO'
        END AS tipo,
        CASE 
            WHEN compra > 0 THEN compra
            WHEN venda > 0 THEN venda
            ELSE 0
        END AS quantidade,
        compra,
        venda,
        valor_unit AS valor_unitario,
        CASE 
            WHEN compra > 0 THEN compra * valor_unit
            WHEN venda > 0 THEN venda * valor_unit
            ELSE 0
        END AS valor_total,
        dividendos,
        juros,
        impostos,
        observacoes,
        created_at,
        updated_at
    FROM investments
    WHERE user_id = p_user_id AND ticker = p_ticker
    ORDER BY date, id;
$$;

COMMENT ON FUNCTION public.get_ticker_transactions(uuid, text) IS 
'Retorna todas as transações de um ticker específico formatadas para exibição.';