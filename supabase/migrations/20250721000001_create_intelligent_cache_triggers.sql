-- ========================================
-- ERASMO INVEST - INTELLIGENT CACHE TRIGGERS
-- ========================================
-- 
-- Sistema de triggers inteligentes com error handling completo
-- Invalidação automática de cache baseada em mudanças nos dados
-- Logs detalhados e recuperação de erros
-- Performance otimizada com processamento assíncrono
--

-- ========================================
-- 1. TRIGGER FUNCTIONS COM ERROR HANDLING
-- ========================================

-- Função principal de invalidação de cache com error handling
CREATE OR REPLACE FUNCTION trigger_invalidate_portfolio_cache() 
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
    trigger_reason TEXT;
    error_message TEXT;
    start_time TIMESTAMP := clock_timestamp();
    processing_time INTEGER;
BEGIN
    -- Inicialização segura
    BEGIN
        -- Determinar user_id baseado na operação
        IF TG_OP = 'DELETE' THEN
            affected_user_id := OLD.user_id;
            trigger_reason := format('DELETE on %s: ticker=%s', TG_TABLE_NAME, OLD.ticker);
        ELSE
            affected_user_id := NEW.user_id;
            trigger_reason := format('%s on %s: ticker=%s', TG_OP, TG_TABLE_NAME, NEW.ticker);
        END IF;

        -- Verificar se user_id é válido
        IF affected_user_id IS NULL THEN
            RAISE WARNING 'Cache trigger: user_id is NULL for % operation on %', TG_OP, TG_TABLE_NAME;
            RETURN COALESCE(NEW, OLD);
        END IF;

        -- Log da operação para debugging
        RAISE LOG 'Cache invalidation triggered: % for user %', trigger_reason, affected_user_id;

        -- Invalidar cache do portfólio
        UPDATE portfolio_cache 
        SET 
            force_recalc_flag = TRUE,
            cache_version = cache_version + 1,
            last_updated = NOW()
        WHERE user_id = affected_user_id;

        -- Se não existe cache, criar registro básico
        IF NOT FOUND THEN
            INSERT INTO portfolio_cache (user_id, force_recalc_flag, cache_version)
            VALUES (affected_user_id, TRUE, 1)
            ON CONFLICT (user_id) DO UPDATE SET
                force_recalc_flag = TRUE,
                cache_version = portfolio_cache.cache_version + 1,
                last_updated = NOW();
        END IF;

        -- Invalidar cache de ativos específicos se aplicável
        IF TG_TABLE_NAME = 'investments' THEN
            -- Invalidar cache do ativo específico
            DELETE FROM asset_cache 
            WHERE user_id = affected_user_id 
            AND ticker = COALESCE(NEW.ticker, OLD.ticker);
        END IF;

        -- Calcular tempo de processamento
        processing_time := EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER;

        -- Log detalhado da invalidação
        INSERT INTO cache_invalidation_log (
            user_id,
            table_name,
            operation,
            trigger_reason,
            old_values,
            new_values,
            cache_version_before,
            cache_version_after,
            processing_time_ms
        ) VALUES (
            affected_user_id,
            TG_TABLE_NAME,
            TG_OP,
            trigger_reason,
            CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
            COALESCE((SELECT cache_version - 1 FROM portfolio_cache WHERE user_id = affected_user_id), 0),
            COALESCE((SELECT cache_version FROM portfolio_cache WHERE user_id = affected_user_id), 1),
            processing_time
        );

        RETURN COALESCE(NEW, OLD);

    EXCEPTION
        WHEN OTHERS THEN
            -- Capturar qualquer erro e continuar operação
            error_message := SQLERRM;
            
            -- Log do erro mas não interromper a transação principal
            RAISE WARNING 'Cache invalidation failed for user %: %', affected_user_id, error_message;
            
            -- Tentar log do erro (se possível)
            BEGIN
                INSERT INTO cache_invalidation_log (
                    user_id,
                    table_name,
                    operation,
                    trigger_reason,
                    processing_time_ms
                ) VALUES (
                    affected_user_id,
                    TG_TABLE_NAME,
                    TG_OP || '_ERROR',
                    'ERROR: ' || error_message,
                    EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER
                );
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se não conseguir nem fazer log, apenas continuar
                    NULL;
            END;
            
            -- Continuar com a operação original mesmo com erro no cache
            RETURN COALESCE(NEW, OLD);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. TRIGGER FUNCTION PARA RECÁLCULO INTELIGENTE
-- ========================================

-- Função que determina se deve recalcular cache baseado no tipo de mudança
CREATE OR REPLACE FUNCTION smart_cache_recalculation() 
RETURNS TRIGGER AS $$
DECLARE
    affected_user_id UUID;
    needs_full_recalc BOOLEAN := FALSE;
    needs_asset_recalc BOOLEAN := FALSE;
    change_significance DECIMAL := 0;
    old_value DECIMAL := 0;
    new_value DECIMAL := 0;
BEGIN
    BEGIN
        affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
        
        -- Analisar significância da mudança
        IF TG_TABLE_NAME = 'investments' AND TG_OP = 'UPDATE' THEN
            -- Verificar mudanças em valores importantes
            old_value := COALESCE(OLD.valor_total, OLD.compra * OLD.valor_unit, 0);
            new_value := COALESCE(NEW.valor_total, NEW.compra * NEW.valor_unit, 0);
            
            -- Calcular significância da mudança (%)
            IF old_value > 0 THEN
                change_significance := ABS((new_value - old_value) / old_value) * 100;
            ELSE
                change_significance := 100; -- Mudança total se era 0
            END IF;
            
            -- Determinar tipo de recálculo necessário
            IF change_significance > 1.0 THEN  -- Mudança > 1%
                needs_full_recalc := TRUE;
                needs_asset_recalc := TRUE;
            ELSIF change_significance > 0.1 THEN  -- Mudança > 0.1%
                needs_asset_recalc := TRUE;
            END IF;
            
        ELSIF TG_OP IN ('INSERT', 'DELETE') THEN
            -- Inserções e deleções sempre precisam recálculo completo
            needs_full_recalc := TRUE;
            needs_asset_recalc := TRUE;
        END IF;
        
        -- Aplicar recálculo baseado na análise
        IF needs_full_recalc THEN
            -- Invalidar cache completo do portfólio
            UPDATE portfolio_cache 
            SET 
                force_recalc_flag = TRUE,
                cache_version = cache_version + 1,
                last_updated = NOW(),
                calculation_method = format('Smart recalc: %s%% change', change_significance::TEXT)
            WHERE user_id = affected_user_id;
            
        ELSIF needs_asset_recalc THEN
            -- Invalidar apenas cache do ativo específico
            DELETE FROM asset_cache 
            WHERE user_id = affected_user_id 
            AND ticker = COALESCE(NEW.ticker, OLD.ticker);
        END IF;
        
        -- Log da análise inteligente
        INSERT INTO cache_invalidation_log (
            user_id,
            table_name,
            operation,
            trigger_reason,
            old_values,
            new_values
        ) VALUES (
            affected_user_id,
            TG_TABLE_NAME,
            'SMART_' || TG_OP,
            format('Change significance: %s%%, Full recalc: %s, Asset recalc: %s', 
                   change_significance::TEXT, needs_full_recalc::TEXT, needs_asset_recalc::TEXT),
            CASE WHEN TG_OP != 'INSERT' THEN jsonb_build_object('value', old_value, 'significance', change_significance) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN jsonb_build_object('value', new_value, 'significance', change_significance) ELSE NULL END
        );

        RETURN COALESCE(NEW, OLD);

    EXCEPTION
        WHEN OTHERS THEN
            -- Em caso de erro, fazer invalidação simples
            RAISE WARNING 'Smart cache recalculation failed, falling back to simple invalidation: %', SQLERRM;
            
            UPDATE portfolio_cache 
            SET force_recalc_flag = TRUE, cache_version = cache_version + 1
            WHERE user_id = affected_user_id;
            
            RETURN COALESCE(NEW, OLD);
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. CRIAÇÃO DOS TRIGGERS
-- ========================================

-- Triggers para a tabela investments
DROP TRIGGER IF EXISTS investments_cache_invalidation ON investments;
CREATE TRIGGER investments_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION smart_cache_recalculation();

-- Trigger adicional para mudanças críticas
DROP TRIGGER IF EXISTS investments_critical_changes ON investments;
CREATE TRIGGER investments_critical_changes
    AFTER INSERT OR DELETE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_invalidate_portfolio_cache();

-- ========================================
-- 4. TRIGGER PARA LIMPEZA AUTOMÁTICA
-- ========================================

-- Função para limpeza automática de cache antigo
CREATE OR REPLACE FUNCTION auto_cleanup_cache() 
RETURNS TRIGGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Executar limpeza a cada 100 operações (aproximadamente)
    IF random() < 0.01 THEN  -- 1% de chance a cada operação
        BEGIN
            -- Limpar logs antigos
            DELETE FROM cache_invalidation_log 
            WHERE created_at < NOW() - INTERVAL '7 days';
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            
            -- Limpar métricas antigas
            DELETE FROM cache_performance_metrics 
            WHERE created_at < NOW() - INTERVAL '3 days';
            
            -- Log da limpeza
            IF cleanup_count > 0 THEN
                RAISE LOG 'Auto cleanup removed % old cache log entries', cleanup_count;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Se limpeza falhar, apenas continuar
                RAISE WARNING 'Auto cleanup failed: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de limpeza automática
DROP TRIGGER IF EXISTS auto_cleanup_trigger ON cache_invalidation_log;
CREATE TRIGGER auto_cleanup_trigger
    AFTER INSERT ON cache_invalidation_log
    FOR EACH ROW
    EXECUTE FUNCTION auto_cleanup_cache();

-- ========================================
-- 5. FUNÇÕES DE MONITORAMENTO E DEBUGGING
-- ========================================

-- Função para verificar saúde do cache
CREATE OR REPLACE FUNCTION check_cache_health(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    user_id UUID,
    cache_exists BOOLEAN,
    cache_age_minutes INTEGER,
    cache_version INTEGER,
    force_recalc BOOLEAN,
    last_invalidation TIMESTAMP WITH TIME ZONE,
    total_invalidations BIGINT,
    avg_processing_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.user_id,
        (pc.id IS NOT NULL) as cache_exists,
        EXTRACT(minutes FROM NOW() - pc.last_updated)::INTEGER as cache_age_minutes,
        pc.cache_version,
        pc.force_recalc_flag as force_recalc,
        (SELECT MAX(cil.created_at) FROM cache_invalidation_log cil WHERE cil.user_id = pc.user_id) as last_invalidation,
        (SELECT COUNT(*) FROM cache_invalidation_log cil WHERE cil.user_id = pc.user_id) as total_invalidations,
        (SELECT AVG(cil.processing_time_ms) FROM cache_invalidation_log cil WHERE cil.user_id = pc.user_id AND cil.created_at > NOW() - INTERVAL '24 hours') as avg_processing_time_ms
    FROM portfolio_cache pc
    WHERE user_id_param IS NULL OR pc.user_id = user_id_param
    ORDER BY pc.last_updated DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para forçar recálculo de cache
CREATE OR REPLACE FUNCTION force_cache_recalculation(user_id_param UUID, reason TEXT DEFAULT 'Manual force')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE portfolio_cache 
    SET 
        force_recalc_flag = TRUE,
        cache_version = cache_version + 1,
        last_updated = NOW(),
        calculation_method = 'FORCED: ' || reason
    WHERE user_id = user_id_param;
    
    -- Limpar cache de ativos
    DELETE FROM asset_cache WHERE user_id = user_id_param;
    
    -- Log da operação forçada
    INSERT INTO cache_invalidation_log (
        user_id, table_name, operation, trigger_reason
    ) VALUES (
        user_id_param, 'portfolio_cache', 'FORCE_RECALC', reason
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION trigger_invalidate_portfolio_cache() IS 'Trigger principal com error handling completo para invalidação de cache';
COMMENT ON FUNCTION smart_cache_recalculation() IS 'Trigger inteligente que analisa significância da mudança antes de invalidar cache';
COMMENT ON FUNCTION auto_cleanup_cache() IS 'Limpeza automática de logs antigos executada probabilisticamente';
COMMENT ON FUNCTION check_cache_health(UUID) IS 'Função de monitoramento para verificar saúde do sistema de cache';
COMMENT ON FUNCTION force_cache_recalculation(UUID, TEXT) IS 'Função para forçar recálculo manual do cache de um usuário';