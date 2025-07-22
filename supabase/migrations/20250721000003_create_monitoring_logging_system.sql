-- ========================================
-- ERASMO INVEST - MONITORING & LOGGING SYSTEM
-- ========================================
-- 
-- Sistema completo de logs e monitoramento para o cache de portfólio
-- Inclui dashboards, alertas, métricas de performance e debugging
-- Sistema de notificações e relatórios automatizados
--

-- ========================================
-- 1. TABELA DE ALERTAS DO SISTEMA
-- ========================================

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL, -- cache_error, performance_issue, data_inconsistency
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Contexto do alerta
    user_id UUID,
    table_affected VARCHAR(50),
    operation_affected VARCHAR(50),
    
    -- Dados técnicos
    error_details JSONB,
    stack_trace TEXT,
    system_metrics JSONB,
    
    -- Status do alerta
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, acknowledged, resolved, suppressed
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    
    -- Auto-resolução
    auto_resolve_after INTERVAL,
    suppress_until TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- 2. DASHBOARD DE MÉTRICAS EM TEMPO REAL
-- ========================================

CREATE TABLE IF NOT EXISTS system_metrics_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métricas de Cache
    total_users_with_cache INTEGER DEFAULT 0,
    cache_hit_rate_24h DECIMAL(5,2) DEFAULT 0,
    cache_hit_rate_1h DECIMAL(5,2) DEFAULT 0,
    avg_cache_age_minutes DECIMAL(8,2) DEFAULT 0,
    
    -- Performance
    avg_query_time_ms INTEGER DEFAULT 0,
    max_query_time_ms INTEGER DEFAULT 0,
    total_queries_24h INTEGER DEFAULT 0,
    slow_queries_count INTEGER DEFAULT 0, -- queries > 1000ms
    
    -- Cache Invalidations
    invalidations_24h INTEGER DEFAULT 0,
    invalidations_1h INTEGER DEFAULT 0,
    avg_invalidation_processing_ms INTEGER DEFAULT 0,
    
    -- System Health
    active_alerts INTEGER DEFAULT 0,
    critical_alerts INTEGER DEFAULT 0,
    failed_recalculations_24h INTEGER DEFAULT 0,
    queue_size INTEGER DEFAULT 0,
    
    -- Database Metrics
    cache_table_size_mb DECIMAL(10,2) DEFAULT 0,
    log_table_size_mb DECIMAL(10,2) DEFAULT 0,
    
    -- Dados detalhados
    detailed_metrics JSONB
);

-- ========================================
-- 3. VIEWS PARA DASHBOARDS
-- ========================================

-- View de saúde geral do sistema
CREATE OR REPLACE VIEW system_health_dashboard AS
SELECT 
    -- Cache Status
    COUNT(DISTINCT pc.user_id) as users_with_cache,
    COUNT(DISTINCT CASE WHEN pc.force_recalc_flag = FALSE THEN pc.user_id END) as users_with_valid_cache,
    ROUND(AVG(EXTRACT(minutes FROM NOW() - pc.last_updated))::NUMERIC, 2) as avg_cache_age_minutes,
    
    -- Performance últimas 24h
    COALESCE(perf.avg_execution_time_ms, 0) as avg_query_time_24h,
    COALESCE(perf.cache_hit_rate, 0) as cache_hit_rate_24h,
    COALESCE(perf.total_operations, 0) as total_operations_24h,
    
    -- Alertas ativos
    COALESCE(alerts.active_count, 0) as active_alerts,
    COALESCE(alerts.critical_count, 0) as critical_alerts,
    
    -- Queue status
    COALESCE(queue.pending_count, 0) as queue_pending,
    COALESCE(queue.processing_count, 0) as queue_processing,
    
    -- Última atualização
    NOW() as last_updated

FROM portfolio_cache pc
FULL OUTER JOIN (
    SELECT 
        ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_execution_time_ms,
        ROUND((COUNT(CASE WHEN cache_hit = TRUE THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as cache_hit_rate,
        COUNT(*) as total_operations
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours'
) perf ON TRUE
FULL OUTER JOIN (
    SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'active' AND severity = 'critical' THEN 1 END) as critical_count
    FROM system_alerts
    WHERE created_at > NOW() - INTERVAL '7 days'
) alerts ON TRUE
FULL OUTER JOIN (
    SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count
    FROM cache_recalc_queue
) queue ON TRUE;

-- View de performance por usuário
CREATE OR REPLACE VIEW user_performance_dashboard AS
SELECT 
    pc.user_id,
    pc.cache_version,
    pc.last_updated,
    pc.force_recalc_flag,
    EXTRACT(minutes FROM NOW() - pc.last_updated)::INTEGER as cache_age_minutes,
    
    -- Performance metrics
    perf.avg_query_time_ms,
    perf.cache_hit_rate,
    perf.total_queries_24h,
    
    -- Invalidations
    inv.invalidations_24h,
    inv.last_invalidation,
    
    -- Health score (0-100)
    CASE 
        WHEN pc.force_recalc_flag THEN 0
        WHEN EXTRACT(minutes FROM NOW() - pc.last_updated) > 60 THEN 25
        WHEN COALESCE(perf.cache_hit_rate, 0) < 50 THEN 50
        WHEN COALESCE(perf.avg_query_time_ms, 0) > 1000 THEN 75
        ELSE 100 
    END as health_score

FROM portfolio_cache pc
LEFT JOIN (
    SELECT 
        user_id,
        ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_query_time_ms,
        ROUND((COUNT(CASE WHEN cache_hit = TRUE THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as cache_hit_rate,
        COUNT(*) as total_queries_24h
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id
) perf ON pc.user_id = perf.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as invalidations_24h,
        MAX(created_at) as last_invalidation
    FROM cache_invalidation_log
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id
) inv ON pc.user_id = inv.user_id;

-- ========================================
-- 4. FUNÇÕES DE MONITORAMENTO
-- ========================================

-- Função para criar alertas automaticamente
CREATE OR REPLACE FUNCTION create_system_alert(
    alert_type_param VARCHAR(50),
    severity_param VARCHAR(20),
    title_param VARCHAR(200),
    description_param TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL,
    error_details_param JSONB DEFAULT NULL,
    auto_resolve_minutes INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    existing_alert_id UUID;
BEGIN
    -- Verificar se já existe alerta similar ativo
    SELECT id INTO existing_alert_id
    FROM system_alerts
    WHERE alert_type = alert_type_param
      AND title = title_param
      AND COALESCE(user_id, '00000000-0000-0000-0000-000000000000') = COALESCE(user_id_param, '00000000-0000-0000-0000-000000000000')
      AND status = 'active'
      AND created_at > NOW() - INTERVAL '1 hour'
    LIMIT 1;
    
    IF existing_alert_id IS NOT NULL THEN
        -- Atualizar alerta existente
        UPDATE system_alerts 
        SET 
            occurrence_count = occurrence_count + 1,
            last_occurrence = NOW(),
            error_details = COALESCE(error_details_param, error_details)
        WHERE id = existing_alert_id;
        
        RETURN existing_alert_id;
    ELSE
        -- Criar novo alerta
        INSERT INTO system_alerts (
            alert_type,
            severity,
            title,
            description,
            user_id,
            error_details,
            auto_resolve_after
        ) VALUES (
            alert_type_param,
            severity_param,
            title_param,
            description_param,
            user_id_param,
            error_details_param,
            CASE WHEN auto_resolve_minutes IS NOT NULL THEN INTERVAL '1 minute' * auto_resolve_minutes ELSE NULL END
        ) RETURNING id INTO alert_id;
        
        RETURN alert_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resolver alertas automaticamente
CREATE OR REPLACE FUNCTION resolve_expired_alerts() RETURNS INTEGER AS $$
DECLARE
    resolved_count INTEGER := 0;
BEGIN
    UPDATE system_alerts 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = 'Auto-resolved after timeout'
    WHERE status = 'active'
      AND auto_resolve_after IS NOT NULL
      AND created_at + auto_resolve_after < NOW();
    
    GET DIAGNOSTICS resolved_count = ROW_COUNT;
    
    -- Log da resolução automática
    IF resolved_count > 0 THEN
        RAISE LOG 'Auto-resolved % expired alerts', resolved_count;
    END IF;
    
    RETURN resolved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para capturar métricas do sistema
CREATE OR REPLACE FUNCTION capture_system_metrics() RETURNS BOOLEAN AS $$
DECLARE
    cache_hit_24h DECIMAL;
    cache_hit_1h DECIMAL;
    avg_query_time INTEGER;
    total_users INTEGER;
    queue_size INTEGER;
BEGIN
    -- Calcular métricas de cache
    SELECT 
        ROUND((COUNT(CASE WHEN cache_hit = TRUE THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2),
        COUNT(DISTINCT user_id)
    INTO cache_hit_24h, total_users
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    SELECT 
        ROUND((COUNT(CASE WHEN cache_hit = TRUE THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2),
        ROUND(AVG(execution_time_ms)::NUMERIC, 0)
    INTO cache_hit_1h, avg_query_time
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '1 hour';
    
    -- Tamanho da fila
    SELECT COUNT(*) INTO queue_size
    FROM cache_recalc_queue
    WHERE status IN ('pending', 'processing');
    
    -- Inserir snapshot das métricas
    INSERT INTO system_metrics_snapshot (
        total_users_with_cache,
        cache_hit_rate_24h,
        cache_hit_rate_1h,
        avg_query_time_ms,
        queue_size,
        detailed_metrics
    ) VALUES (
        COALESCE(total_users, 0),
        COALESCE(cache_hit_24h, 0),
        COALESCE(cache_hit_1h, 0),
        COALESCE(avg_query_time, 0),
        COALESCE(queue_size, 0),
        jsonb_build_object(
            'timestamp', NOW(),
            'cache_users', total_users,
            'cache_hit_24h', cache_hit_24h,
            'cache_hit_1h', cache_hit_1h,
            'avg_query_time', avg_query_time
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. TRIGGERS PARA ALERTAS AUTOMÁTICOS
-- ========================================

-- Trigger para detectar queries lentas
CREATE OR REPLACE FUNCTION detect_performance_issues() 
RETURNS TRIGGER AS $$
BEGIN
    -- Alerta para queries muito lentas (> 2 segundos)
    IF NEW.execution_time_ms > 2000 THEN
        PERFORM create_system_alert(
            'performance_issue',
            'high',
            format('Query lenta detectada: %sms', NEW.execution_time_ms),
            format('Operação %s demorou %sms para usuário %s', NEW.operation, NEW.execution_time_ms, NEW.user_id),
            NEW.user_id,
            jsonb_build_object(
                'execution_time_ms', NEW.execution_time_ms,
                'operation', NEW.operation,
                'cache_hit', NEW.cache_hit,
                'data_source', NEW.data_source
            ),
            30 -- Auto-resolve em 30 minutos
        );
    END IF;
    
    -- Alerta para muitos cache misses
    IF NEW.cache_hit = FALSE AND NEW.operation = 'portfolio_consultation' THEN
        -- Verificar se houve muitos cache misses recentemente
        IF (
            SELECT COUNT(*) 
            FROM cache_performance_metrics 
            WHERE user_id = NEW.user_id 
              AND cache_hit = FALSE 
              AND created_at > NOW() - INTERVAL '5 minutes'
        ) >= 3 THEN
            PERFORM create_system_alert(
                'cache_error',
                'medium',
                'Cache miss frequente detectado',
                format('Usuário %s teve múltiplos cache misses nos últimos 5 minutos', NEW.user_id),
                NEW.user_id,
                jsonb_build_object('consecutive_misses', 3),
                60 -- Auto-resolve em 1 hora
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger
DROP TRIGGER IF EXISTS performance_monitoring_trigger ON cache_performance_metrics;
CREATE TRIGGER performance_monitoring_trigger
    AFTER INSERT ON cache_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION detect_performance_issues();

-- ========================================
-- 6. SCHEDULED JOBS (PostgreSQL CRON)
-- ========================================

-- Função para executar tarefas de manutenção
CREATE OR REPLACE FUNCTION scheduled_maintenance() RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    resolved_alerts INTEGER;
    processed_queue INTEGER;
    cleaned_records INTEGER;
BEGIN
    result := 'Maintenance run at ' || NOW()::TEXT || E'\n';
    
    -- 1. Resolver alertas expirados
    resolved_alerts := resolve_expired_alerts();
    result := result || format('- Resolved %s expired alerts\n', resolved_alerts);
    
    -- 2. Processar fila de recálculo
    SELECT processed_count INTO processed_queue
    FROM process_recalc_queue(5); -- Processar até 5 itens
    result := result || format('- Processed %s queue items\n', COALESCE(processed_queue, 0));
    
    -- 3. Capturar métricas do sistema
    PERFORM capture_system_metrics();
    result := result || '- Captured system metrics\n';
    
    -- 4. Limpar registros antigos
    DELETE FROM system_metrics_snapshot WHERE snapshot_time < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS cleaned_records = ROW_COUNT;
    result := result || format('- Cleaned %s old metric snapshots\n', cleaned_records);
    
    -- 5. Verificar saúde geral do sistema
    IF (SELECT COUNT(*) FROM system_alerts WHERE status = 'active' AND severity = 'critical') > 0 THEN
        result := result || '⚠️ CRITICAL ALERTS ACTIVE!\n';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. ÍNDICES PARA PERFORMANCE DE MONITORAMENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_system_alerts_status_severity ON system_alerts(status, severity, created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type_user ON system_alerts(alert_type, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshot_time ON system_metrics_snapshot(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_time ON cache_performance_metrics(user_id, created_at, cache_hit);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_slow_queries ON cache_performance_metrics(execution_time_ms) WHERE execution_time_ms > 1000;

-- ========================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE system_alerts IS 'Alertas automáticos do sistema de cache com deduplicação e auto-resolução';
COMMENT ON TABLE system_metrics_snapshot IS 'Snapshots periódicos das métricas do sistema para análise histórica';
COMMENT ON VIEW system_health_dashboard IS 'Dashboard principal de saúde do sistema de cache';
COMMENT ON VIEW user_performance_dashboard IS 'Dashboard de performance individual por usuário';
COMMENT ON FUNCTION create_system_alert IS 'Cria alertas com deduplicação automática e controle de spam';
COMMENT ON FUNCTION scheduled_maintenance IS 'Função principal de manutenção para execução periódica (cron)';
COMMENT ON FUNCTION capture_system_metrics IS 'Captura snapshot das métricas atuais do sistema';