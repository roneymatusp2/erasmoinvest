-- CORREÇÃO SIMPLES: Função que retorna dados agregados por ticker

-- Primeiro, remover a função existente se houver
DROP FUNCTION IF EXISTS public.get_investments_by_user_id(uuid);
DROP FUNCTION IF EXISTS public.get_investments_by_user_id(uuid, date);

-- Criar função simplificada que funciona com o código atual
CREATE OR REPLACE FUNCTION public.get_investments_by_user_id(p_user_id uuid)
RETURNS TABLE (
    ticker text,
    "currentPosition" numeric,
    "averagePrice" numeric,
    "totalInvested" numeric,
    "currentPrice" numeric,
    "totalDividends" numeric,
    "totalJuros" numeric,
    "totalImpostos" numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH position_calc AS (
        SELECT 
            i.ticker,
            SUM(COALESCE(i.compra, 0) - COALESCE(i.venda, 0)) as current_position,
            SUM(COALESCE(i.compra, 0) * COALESCE(i.valor_unit, 0) - COALESCE(i.venda, 0) * COALESCE(i.valor_unit, 0)) as total_invested,
            SUM(COALESCE(i.dividendos, 0)) as total_dividends,
            SUM(COALESCE(i.juros, 0)) as total_juros,
            SUM(COALESCE(i.impostos, 0)) as total_impostos
        FROM investments i
        WHERE i.user_id = p_user_id
        GROUP BY i.ticker
        HAVING SUM(COALESCE(i.compra, 0) - COALESCE(i.venda, 0)) > 0
    )
    SELECT 
        pc.ticker,
        pc.current_position::numeric,
        CASE 
            WHEN pc.current_position > 0 
            THEN (pc.total_invested / pc.current_position)::numeric
            ELSE 0::numeric
        END as average_price,
        pc.total_invested::numeric,
        0::numeric as current_price, -- Será preenchido pela API
        pc.total_dividends::numeric,
        pc.total_juros::numeric,
        pc.total_impostos::numeric
    FROM position_calc pc
    ORDER BY pc.ticker;
END;
$$;