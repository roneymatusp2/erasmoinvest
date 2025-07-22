-- ========================================
-- ERASMO INVEST - AUTOMATIC RECALCULATION SYSTEM
-- ========================================
-- 
-- Sistema inteligente de recálculo automático de cache
-- Preserva valores já calculados do frontend (R$ 434.890,05)
-- Implementa lógica de fallback e recuperação de dados
-- Sistema assíncrono com priorização e fila de processamento
--

-- ========================================
-- 1. FILA DE RECÁLCULO ASSÍNCRONO
-- ========================================

CREATE TABLE IF NOT EXISTS cache_recalc_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1, -- 1=alta, 2=média, 3=baixa
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    task_type VARCHAR(50) NOT NULL, -- full_portfolio, single_asset, market_sync
    task_data JSONB,
    
    -- Controle de tentativas
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Resultados
    result_data JSONB,
    error_message TEXT,
    processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recalc_queue_status_priority ON cache_recalc_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_recalc_queue_user_status ON cache_recalc_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recalc_queue_retry ON cache_recalc_queue(next_retry) WHERE status = 'failed';

-- ========================================
-- 2. STORED PROCEDURE PRINCIPAL DE RECÁLCULO
-- ========================================

CREATE OR REPLACE FUNCTION recalculate_portfolio_cache(
    user_id_param UUID,
    use_frontend_values BOOLEAN DEFAULT TRUE,
    force_market_sync BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    processing_time INTEGER;
    result_json JSONB;
    portfolio_data JSONB;
    asset_data JSONB;
    total_invested DECIMAL := 0;
    total_current_value DECIMAL := 0;
    total_dividends DECIMAL := 0;
    total_interest DECIMAL := 0;
    total_assets INTEGER := 0;
    error_occurred BOOLEAN := FALSE;
    error_message TEXT;
BEGIN
    -- Log início do processamento
    RAISE LOG 'Starting portfolio recalculation for user %', user_id_param;
    
    BEGIN
        -- ========================================
        -- ESTRATÉGIA 1: TENTAR USAR VALORES DO FRONTEND
        -- ========================================
        
        IF use_frontend_values THEN
            -- Primeira tentativa: buscar dados já calculados do frontend
            -- através da última consulta bem-sucedida do cache
            SELECT result_data INTO portfolio_data
            FROM cache_performance_metrics
            WHERE user_id = user_id_param 
              AND operation = 'frontend_calculation'
              AND cache_hit = TRUE
              AND created_at > NOW() - INTERVAL '1 hour'
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- Se encontrou dados do frontend, usá-los
            IF portfolio_data IS NOT NULL THEN
                total_invested := (portfolio_data->>'total_invested')::DECIMAL;
                total_current_value := (portfolio_data->>'total_current_value')::DECIMAL;
                total_dividends := (portfolio_data->>'total_dividends')::DECIMAL;
                total_interest := (portfolio_data->>'total_interest')::DECIMAL;
                total_assets := (portfolio_data->>'total_assets')::INTEGER;
                
                RAISE LOG 'Using frontend calculated values: total_invested = %', total_invested;
            END IF;
        END IF;
        
        -- ========================================
        -- ESTRATÉGIA 2: FALLBACK PARA CÁLCULO BASEADO EM DADOS
        -- ========================================
        
        IF portfolio_data IS NULL THEN
            -- Calcular a partir dos dados da tabela investments
            WITH investment_summary AS (
                SELECT 
                    ticker,
                    SUM(compra) as total_compra,
                    SUM(venda) as total_venda,
                    SUM(dividendos) as total_dividendos,
                    SUM(juros) as total_juros,
                    SUM(impostos) as total_impostos,
                    -- Cálculo conservador do valor investido
                    SUM(CASE 
                        WHEN compra > 0 THEN COALESCE(valor_total, compra * valor_unit, 0)
                        WHEN venda > 0 THEN -COALESCE(valor_total, venda * valor_unit, 0)
                        ELSE 0 
                    END) as valor_investido_liquido
                FROM investments 
                WHERE user_id = user_id_param
                GROUP BY ticker
                HAVING SUM(compra) - SUM(venda) > 0 OR SUM(dividendos) > 0 OR SUM(juros) > 0
            )
            SELECT 
                COUNT(*) as num_assets,
                SUM(valor_investido_liquido) as total_invested_calc,
                SUM(total_dividendos) as total_dividends_calc,
                SUM(total_juros) as total_interest_calc,
                jsonb_agg(
                    jsonb_build_object(
                        'ticker', ticker,
                        'position', total_compra - total_venda,
                        'invested', valor_investido_liquido,
                        'dividends', total_dividendos,
                        'interest', total_juros
                    )
                ) as assets_detail
            INTO total_assets, total_invested, total_dividends, total_interest, asset_data
            FROM investment_summary;
            
            -- Para valor atual, usar valor investido como fallback seguro
            -- (evita problemas com APIs de mercado)
            total_current_value := total_invested;
            
            RAISE LOG 'Calculated from database: total_invested = %, assets = %', total_invested, total_assets;
        END IF;
        
        -- ========================================
        -- ATUALIZAÇÃO DO CACHE PRINCIPAL
        -- ========================================
        
        -- Upsert do cache principal
        INSERT INTO portfolio_cache (
            user_id,
            total_invested,
            total_current_value,
            total_dividends,
            total_interest,
            total_assets,
            yield_on_cost,
            dividend_yield,
            monthly_income,
            annual_income,
            cache_version,
            calculation_timestamp,
            last_updated,
            force_recalc_flag,
            calculation_source,
            calculation_method
        ) VALUES (
            user_id_param,
            COALESCE(total_invested, 0),
            COALESCE(total_current_value, total_invested, 0),
            COALESCE(total_dividends, 0),
            COALESCE(total_interest, 0),
            COALESCE(total_assets, 0),
            CASE WHEN total_invested > 0 THEN (total_dividends + total_interest) / total_invested * 100 ELSE 0 END,
            CASE WHEN total_current_value > 0 THEN (total_dividends + total_interest) / total_current_value * 100 ELSE 0 END,
            (total_dividends + total_interest) / 12,
            (total_dividends + total_interest),
            1,
            NOW(),
            NOW(),
            FALSE,
            CASE WHEN use_frontend_values AND portfolio_data IS NOT NULL THEN 'frontend' ELSE 'database' END,
            format('Auto recalc: %s strategy', CASE WHEN portfolio_data IS NOT NULL THEN 'frontend' ELSE 'fallback' END)
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_invested = EXCLUDED.total_invested,
            total_current_value = EXCLUDED.total_current_value,
            total_dividends = EXCLUDED.total_dividends,
            total_interest = EXCLUDED.total_interest,
            total_assets = EXCLUDED.total_assets,
            yield_on_cost = EXCLUDED.yield_on_cost,
            dividend_yield = EXCLUDED.dividend_yield,
            monthly_income = EXCLUDED.monthly_income,
            annual_income = EXCLUDED.annual_income,
            cache_version = portfolio_cache.cache_version + 1,
            calculation_timestamp = NOW(),
            last_updated = NOW(),
            force_recalc_flag = FALSE,
            calculation_source = EXCLUDED.calculation_source,
            calculation_method = EXCLUDED.calculation_method;
        
        -- ========================================
        -- ATUALIZAÇÃO DO CACHE POR ATIVO
        -- ========================================
        
        -- Limpar cache de ativos antigo
        DELETE FROM asset_cache WHERE user_id = user_id_param;
        
        -- Inserir cache atualizado por ativo
        INSERT INTO asset_cache (
            user_id, ticker, current_position, total_invested, 
            total_dividends, total_interest, last_updated, cache_version
        )
        SELECT 
            user_id_param,
            ticker,
            SUM(compra) - SUM(venda) as position,
            SUM(CASE 
                WHEN compra > 0 THEN COALESCE(valor_total, compra * valor_unit, 0)
                WHEN venda > 0 THEN -COALESCE(valor_total, venda * valor_unit, 0)
                ELSE 0 
            END) as invested,
            SUM(dividendos) as divs,
            SUM(juros) as interest,
            NOW(),
            1
        FROM investments
        WHERE user_id = user_id_param
        GROUP BY ticker
        HAVING SUM(compra) - SUM(venda) > 0 OR SUM(dividendos) > 0 OR SUM(juros) > 0;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_occurred := TRUE;
            error_message := SQLERRM;
            RAISE WARNING 'Error in portfolio recalculation for user %: %', user_id_param, error_message;
    END;
    
    -- Calcular tempo de processamento
    processing_time := EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER;
    
    -- Preparar resultado
    result_json := jsonb_build_object(
        'success', NOT error_occurred,
        'user_id', user_id_param,
        'processing_time_ms', processing_time,
        'calculation_source', CASE WHEN portfolio_data IS NOT NULL THEN 'frontend' ELSE 'database' END,
        'total_invested', total_invested,
        'total_current_value', total_current_value,
        'total_dividends', total_dividends,
        'total_interest', total_interest,
        'total_assets', total_assets,
        'error', error_message
    );
    
    -- Log métricas de performance
    INSERT INTO cache_performance_metrics (
        user_id, operation, execution_time_ms, cache_hit, data_source, metadata
    ) VALUES (
        user_id_param, 
        'portfolio_recalculation', 
        processing_time,
        portfolio_data IS NOT NULL,
        CASE WHEN portfolio_data IS NOT NULL THEN 'frontend' ELSE 'database' END,
        result_json
    );
    
    RAISE LOG 'Portfolio recalculation completed for user % in %ms', user_id_param, processing_time;
    
    RETURN result_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. PROCESSADOR DA FILA DE RECÁLCULO
-- ========================================

CREATE OR REPLACE FUNCTION process_recalc_queue(max_items INTEGER DEFAULT 10)
RETURNS TABLE (
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    processing_details JSONB
) AS $$
DECLARE
    queue_item RECORD;
    result JSONB;
    processed INTEGER := 0;
    succeeded INTEGER := 0;
    failed INTEGER := 0;
    details JSONB := '[]'::JSONB;
    item_result JSONB;
BEGIN
    -- Processar itens da fila por prioridade
    FOR queue_item IN
        SELECT * FROM cache_recalc_queue
        WHERE status = 'pending' 
           OR (status = 'failed' AND next_retry <= NOW())
        ORDER BY priority ASC, created_at ASC
        LIMIT max_items
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Marcar como processando
            UPDATE cache_recalc_queue 
            SET status = 'processing', started_at = NOW(), attempts = attempts + 1
            WHERE id = queue_item.id;
            
            -- Processar baseado no tipo de task
            CASE queue_item.task_type
                WHEN 'full_portfolio' THEN
                    result := recalculate_portfolio_cache(
                        queue_item.user_id,
                        COALESCE((queue_item.task_data->>'use_frontend_values')::BOOLEAN, TRUE),
                        COALESCE((queue_item.task_data->>'force_market_sync')::BOOLEAN, FALSE)
                    );
                    
                WHEN 'market_sync' THEN
                    -- Placeholder para sincronização de mercado futura
                    result := jsonb_build_object(
                        'success', TRUE,
                        'message', 'Market sync not implemented yet',
                        'user_id', queue_item.user_id
                    );
                    
                ELSE
                    result := jsonb_build_object(
                        'success', FALSE,
                        'error', 'Unknown task type: ' || queue_item.task_type
                    );
            END CASE;
            
            -- Atualizar status baseado no resultado
            IF (result->>'success')::BOOLEAN THEN
                UPDATE cache_recalc_queue 
                SET status = 'completed', 
                    completed_at = NOW(),
                    result_data = result,
                    processing_time_ms = EXTRACT(milliseconds FROM NOW() - started_at)::INTEGER
                WHERE id = queue_item.id;
                
                succeeded := succeeded + 1;
            ELSE
                -- Determinar se deve tentar novamente
                IF queue_item.attempts >= queue_item.max_attempts THEN
                    UPDATE cache_recalc_queue 
                    SET status = 'failed',
                        completed_at = NOW(),
                        error_message = result->>'error',
                        processing_time_ms = EXTRACT(milliseconds FROM NOW() - started_at)::INTEGER
                    WHERE id = queue_item.id;
                ELSE
                    -- Programar retry com backoff exponencial
                    UPDATE cache_recalc_queue 
                    SET status = 'failed',
                        error_message = result->>'error',
                        next_retry = NOW() + INTERVAL '1 minute' * (queue_item.attempts ^ 2)
                    WHERE id = queue_item.id;
                END IF;
                
                failed := failed + 1;
            END IF;
            
            processed := processed + 1;
            
            -- Adicionar detalhes do processamento
            item_result := jsonb_build_object(
                'id', queue_item.id,
                'user_id', queue_item.user_id,
                'task_type', queue_item.task_type,
                'success', (result->>'success')::BOOLEAN,
                'attempts', queue_item.attempts + 1,
                'processing_time_ms', EXTRACT(milliseconds FROM NOW() - queue_item.started_at)::INTEGER
            );
            
            details := details || item_result;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Erro crítico no processamento
                UPDATE cache_recalc_queue 
                SET status = 'failed',
                    error_message = 'Critical error: ' || SQLERRM,
                    completed_at = NOW()
                WHERE id = queue_item.id;
                
                failed := failed + 1;
                processed := processed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed, succeeded, failed, details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. FUNÇÃO PARA ENFILEIRAR RECÁLCULOS
-- ========================================

CREATE OR REPLACE FUNCTION enqueue_portfolio_recalculation(
    user_id_param UUID,
    task_type_param VARCHAR(50) DEFAULT 'full_portfolio',
    priority_param INTEGER DEFAULT 2,
    task_data_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    queue_id UUID;
BEGIN
    -- Verificar se já existe task pendente para este usuário
    SELECT id INTO queue_id
    FROM cache_recalc_queue
    WHERE user_id = user_id_param 
      AND task_type = task_type_param
      AND status IN ('pending', 'processing')
    LIMIT 1;
    
    -- Se não existe, criar nova
    IF queue_id IS NULL THEN
        INSERT INTO cache_recalc_queue (
            user_id, task_type, priority, task_data
        ) VALUES (
            user_id_param, task_type_param, priority_param, task_data_param
        ) RETURNING id INTO queue_id;
        
        RAISE LOG 'Enqueued % task for user % with priority %', task_type_param, user_id_param, priority_param;
    ELSE
        RAISE LOG 'Task % already queued for user %', task_type_param, user_id_param;
    END IF;
    
    RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. TRIGGER PARA AUTO-ENFILEIRAMENTO
-- ========================================

CREATE OR REPLACE FUNCTION auto_enqueue_recalculation() 
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
BEGIN
    affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Enfileirar recálculo automático com prioridade baseada na operação
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        -- Alta prioridade para inserções e deleções
        PERFORM enqueue_portfolio_recalculation(
            affected_user_id, 
            'full_portfolio', 
            1, 
            jsonb_build_object(
                'trigger_operation', TG_OP,
                'trigger_table', TG_TABLE_NAME,
                'use_frontend_values', TRUE
            )
        );
    ELSE
        -- Prioridade normal para updates
        PERFORM enqueue_portfolio_recalculation(
            affected_user_id, 
            'full_portfolio', 
            2, 
            jsonb_build_object(
                'trigger_operation', TG_OP,
                'trigger_table', TG_TABLE_NAME,
                'use_frontend_values', TRUE
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Continuar mesmo se enfileiramento falhar
        RAISE WARNING 'Auto-enqueue failed for user %: %', affected_user_id, SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger na tabela investments
DROP TRIGGER IF EXISTS auto_enqueue_investments ON investments;
CREATE TRIGGER auto_enqueue_investments
    AFTER INSERT OR UPDATE OR DELETE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION auto_enqueue_recalculation();

-- ========================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION recalculate_portfolio_cache(UUID, BOOLEAN, BOOLEAN) IS 'Função principal que recalcula cache preservando valores do frontend quando possível';
COMMENT ON FUNCTION process_recalc_queue(INTEGER) IS 'Processador da fila de recálculo com controle de tentativas e backoff';
COMMENT ON FUNCTION enqueue_portfolio_recalculation(UUID, VARCHAR, INTEGER, JSONB) IS 'Enfileira tarefas de recálculo com deduplicação automática';
COMMENT ON TABLE cache_recalc_queue IS 'Fila assíncrona de recálculos de cache com controle de prioridade e retry';