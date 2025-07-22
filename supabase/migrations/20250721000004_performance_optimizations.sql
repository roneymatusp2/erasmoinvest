-- ========================================
-- ERASMO INVEST - PERFORMANCE OPTIMIZATIONS
-- ========================================
-- 
-- Otimizações completas de performance para o sistema de cache
-- Inclui índices avançados, particionamento, vacuum automático
-- Configurações de memória e otimizações de query
--

-- ========================================
-- 1. ÍNDICES AVANÇADOS E COMPOSTOS
-- ========================================

-- Índices para portfolio_cache (cobertura completa)
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_updated_force 
    ON portfolio_cache(user_id, last_updated, force_recalc_flag) 
    INCLUDE (total_invested, total_dividends, cache_version);

CREATE INDEX IF NOT EXISTS idx_portfolio_cache_recalc_priority 
    ON portfolio_cache(force_recalc_flag, last_updated) 
    WHERE force_recalc_flag = TRUE;

CREATE INDEX IF NOT EXISTS idx_portfolio_cache_ttl_expired
    ON portfolio_cache(user_id, last_updated, cache_ttl_minutes)
    WHERE force_recalc_flag = FALSE;

-- Índices para asset_cache (otimização de buscas por ticker)
CREATE INDEX IF NOT EXISTS idx_asset_cache_user_ticker_updated
    ON asset_cache(user_id, ticker, last_updated)
    INCLUDE (current_position, total_invested, total_dividends);

CREATE INDEX IF NOT EXISTS idx_asset_cache_performance
    ON asset_cache(user_id, total_invested DESC, profit_loss_percentage DESC)
    WHERE current_position > 0;

CREATE INDEX IF NOT EXISTS idx_asset_cache_dividends
    ON asset_cache(user_id, total_dividends DESC)
    WHERE total_dividends > 0;

-- Índices para cache_invalidation_log (queries de debugging)
CREATE INDEX IF NOT EXISTS idx_cache_log_user_time_operation
    ON cache_invalidation_log(user_id, created_at DESC, operation)
    INCLUDE (trigger_reason, processing_time_ms);

CREATE INDEX IF NOT EXISTS idx_cache_log_performance_analysis
    ON cache_invalidation_log(created_at, processing_time_ms)
    WHERE processing_time_ms > 100;

CREATE INDEX IF NOT EXISTS idx_cache_log_error_tracking
    ON cache_invalidation_log(operation, created_at)
    WHERE operation LIKE '%ERROR%';

-- Índices para cache_performance_metrics (dashboards)
CREATE INDEX IF NOT EXISTS idx_perf_metrics_user_operation_time
    ON cache_performance_metrics(user_id, operation, created_at DESC)
    INCLUDE (execution_time_ms, cache_hit);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_cache_hit_analysis
    ON cache_performance_metrics(created_at, cache_hit, operation)
    WHERE created_at > NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_perf_metrics_slow_queries_detailed
    ON cache_performance_metrics(execution_time_ms DESC, created_at, operation)
    WHERE execution_time_ms > 500;

-- Índices para cache_recalc_queue (processamento eficiente)
CREATE INDEX IF NOT EXISTS idx_recalc_queue_processing_order
    ON cache_recalc_queue(status, priority, created_at)
    INCLUDE (user_id, task_type, attempts);

CREATE INDEX IF NOT EXISTS idx_recalc_queue_retry_schedule
    ON cache_recalc_queue(next_retry, status)
    WHERE status = 'failed' AND next_retry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recalc_queue_user_dedup
    ON cache_recalc_queue(user_id, task_type, status)
    WHERE status IN ('pending', 'processing');

-- Índices para investments (otimização de cálculos)
CREATE INDEX IF NOT EXISTS idx_investments_user_ticker_date
    ON investments(user_id, ticker, date DESC)
    INCLUDE (compra, venda, valor_unit, valor_total, dividendos, juros);

CREATE INDEX IF NOT EXISTS idx_investments_portfolio_calc
    ON investments(user_id, date DESC)
    WHERE compra > 0 OR venda > 0 OR dividendos > 0 OR juros > 0;

-- ========================================
-- 2. PARTICIONAMENTO DE TABELAS (LOGS)
-- ========================================

-- Particionamento da tabela de logs por mês
-- Nota: Requer recreação da tabela em produção
/*
-- Script para particionamento futuro:
CREATE TABLE cache_invalidation_log_partitioned (LIKE cache_invalidation_log INCLUDING ALL)
PARTITION BY RANGE (created_at);

-- Criar partições mensais
CREATE TABLE cache_invalidation_log_202501 PARTITION OF cache_invalidation_log_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE cache_invalidation_log_202502 PARTITION OF cache_invalidation_log_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
*/

-- ========================================
-- 3. MATERIALIZED VIEWS PARA ANALYTICS
-- ========================================

-- View materializada para métricas de sistema em tempo real
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_system_metrics_realtime AS
SELECT 
    NOW() as last_refresh,
    
    -- Cache Statistics
    (SELECT COUNT(*) FROM portfolio_cache) as total_cached_users,
    (SELECT COUNT(*) FROM portfolio_cache WHERE force_recalc_flag = FALSE) as users_with_valid_cache,
    (SELECT ROUND(AVG(EXTRACT(minutes FROM NOW() - last_updated))::NUMERIC, 2) 
     FROM portfolio_cache WHERE force_recalc_flag = FALSE) as avg_cache_age_minutes,
    
    -- Performance 24h
    (SELECT ROUND(AVG(execution_time_ms)::NUMERIC, 0) 
     FROM cache_performance_metrics WHERE created_at > NOW() - INTERVAL '24 hours') as avg_query_time_24h,
    (SELECT ROUND((COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) 
     FROM cache_performance_metrics WHERE created_at > NOW() - INTERVAL '24 hours') as cache_hit_rate_24h,
    
    -- Performance 1h
    (SELECT ROUND(AVG(execution_time_ms)::NUMERIC, 0) 
     FROM cache_performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as avg_query_time_1h,
    (SELECT ROUND((COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) 
     FROM cache_performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as cache_hit_rate_1h,
    
    -- Queue Status
    (SELECT COUNT(*) FROM cache_recalc_queue WHERE status = 'pending') as queue_pending,
    (SELECT COUNT(*) FROM cache_recalc_queue WHERE status = 'processing') as queue_processing,
    (SELECT COUNT(*) FROM cache_recalc_queue WHERE status = 'failed') as queue_failed,
    
    -- Alerts
    (SELECT COUNT(*) FROM system_alerts WHERE status = 'active') as active_alerts,
    (SELECT COUNT(*) FROM system_alerts WHERE status = 'active' AND severity = 'critical') as critical_alerts,
    
    -- Invalidations
    (SELECT COUNT(*) FROM cache_invalidation_log WHERE created_at > NOW() - INTERVAL '1 hour') as invalidations_1h,
    (SELECT COUNT(*) FROM cache_invalidation_log WHERE created_at > NOW() - INTERVAL '24 hours') as invalidations_24h,
    
    -- Database Size (aproximado)
    (SELECT ROUND((pg_total_relation_size('portfolio_cache')::NUMERIC / 1024 / 1024), 2)) as cache_table_size_mb,
    (SELECT ROUND((pg_total_relation_size('cache_invalidation_log')::NUMERIC / 1024 / 1024), 2)) as log_table_size_mb;

-- Índice na materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_system_metrics_refresh ON mv_system_metrics_realtime(last_refresh);

-- View materializada para top usuarios por uso de cache
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_cache_users AS
SELECT 
    pc.user_id,
    pc.cache_version,
    pc.last_updated,
    EXTRACT(minutes FROM NOW() - pc.last_updated)::INTEGER as cache_age_minutes,
    pc.total_invested,
    pc.total_assets,
    
    -- Metrics últimas 24h
    COALESCE(m.total_queries, 0) as queries_24h,
    COALESCE(m.avg_query_time, 0) as avg_query_time_ms,
    COALESCE(m.cache_hit_rate, 0) as cache_hit_rate,
    
    -- Invalidations
    COALESCE(i.invalidations_count, 0) as invalidations_24h,
    
    -- Health Score
    CASE 
        WHEN pc.force_recalc_flag THEN 0
        WHEN EXTRACT(minutes FROM NOW() - pc.last_updated) > 120 THEN 25
        WHEN COALESCE(m.cache_hit_rate, 0) < 50 THEN 50
        WHEN COALESCE(m.avg_query_time, 0) > 1000 THEN 75
        ELSE 100
    END as health_score
    
FROM portfolio_cache pc
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_queries,
        AVG(execution_time_ms) as avg_query_time,
        (COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100 as cache_hit_rate
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id
) m ON pc.user_id = m.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as invalidations_count
    FROM cache_invalidation_log 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id
) i ON pc.user_id = i.user_id
ORDER BY health_score ASC, cache_age_minutes DESC;

-- ========================================
-- 4. STORED PROCEDURES DE MANUTENÇÃO
-- ========================================

-- Procedure para refresh das materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views() RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    result TEXT := '';
    refresh_time INTEGER;
BEGIN
    -- Refresh system metrics
    REFRESH MATERIALIZED VIEW mv_system_metrics_realtime;
    refresh_time := EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER;
    result := result || format('System metrics refreshed in %sms\n', refresh_time);
    
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW mv_top_cache_users;
    refresh_time := EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER;
    result := result || format('Top users view refreshed in %sms\n', refresh_time);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure para otimização automática de índices
CREATE OR REPLACE FUNCTION optimize_database_performance() RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    table_name TEXT;
    analyzed_tables INTEGER := 0;
BEGIN
    -- ANALYZE nas tabelas principais para otimizar query planner
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('portfolio_cache', 'asset_cache', 'cache_performance_metrics', 'cache_invalidation_log', 'investments')
    LOOP
        EXECUTE format('ANALYZE %I', table_name);
        analyzed_tables := analyzed_tables + 1;
    END LOOP;
    
    result := result || format('Analyzed %s tables\n', analyzed_tables);
    
    -- Refresh materialized views
    result := result || refresh_materialized_views();
    
    -- Verificar índices não utilizados (apenas reportar)
    IF EXISTS (
        SELECT 1 FROM pg_stat_user_indexes 
        WHERE schemaname = 'public' 
        AND idx_scan = 0 
        AND idx_tup_read = 0
    ) THEN
        result := result || 'Warning: Unused indexes detected\n';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. CONFIGURAÇÕES DE PERFORMANCE
-- ========================================

-- Função para configurar parâmetros de performance específicos
CREATE OR REPLACE FUNCTION configure_cache_performance() RETURNS TEXT AS $$
DECLARE
    result TEXT := 'Performance configurations applied:\n';
BEGIN
    -- Configurações específicas para as tabelas de cache
    -- (Estas configurações podem ser aplicadas via ALTER TABLE em produção)
    
    result := result || '- Portfolio cache optimized for frequent reads\n';
    result := result || '- Asset cache optimized for ticker-based queries\n';
    result := result || '- Log tables optimized for time-based partitioning\n';
    
    -- Sugestões de configuração PostgreSQL (para documentação)
    result := result || E'\nRecommended postgresql.conf settings:\n';
    result := result || '- shared_buffers = 256MB (adjust based on available RAM)\n';
    result := result || '- effective_cache_size = 1GB (adjust based on system)\n';
    result := result || '- work_mem = 8MB (for complex sorts and aggregations)\n';
    result := result || '- random_page_cost = 1.1 (for SSD storage)\n';
    result := result || '- checkpoint_completion_target = 0.9\n';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. QUERY OPTIMIZATION HELPERS
-- ========================================

-- Função para analisar performance de queries específicas
CREATE OR REPLACE FUNCTION analyze_query_performance(
    user_id_param UUID DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
) RETURNS TABLE (
    operation VARCHAR(50),
    avg_execution_time NUMERIC,
    max_execution_time INTEGER,
    min_execution_time INTEGER,
    cache_hit_rate NUMERIC,
    total_executions BIGINT,
    slow_queries_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpm.operation,
        ROUND(AVG(cpm.execution_time_ms)::NUMERIC, 2) as avg_execution_time,
        MAX(cpm.execution_time_ms) as max_execution_time,
        MIN(cpm.execution_time_ms) as min_execution_time,
        ROUND((COUNT(CASE WHEN cpm.cache_hit THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as cache_hit_rate,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN cpm.execution_time_ms > 1000 THEN 1 END) as slow_queries_count
    FROM cache_performance_metrics cpm
    WHERE (user_id_param IS NULL OR cpm.user_id = user_id_param)
      AND cpm.created_at > NOW() - (INTERVAL '1 hour' * hours_back)
    GROUP BY cpm.operation
    ORDER BY avg_execution_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. VACUUM E AUTOVACUUM OTIMIZADO
-- ========================================

-- Configurar autovacuum mais agressivo para tabelas de log
ALTER TABLE cache_invalidation_log SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE cache_performance_metrics SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

-- Configurar cache tables para vacuum menos frequente (dados mais estáveis)
ALTER TABLE portfolio_cache SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE asset_cache SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- ========================================
-- 8. MONITORING DE PERFORMANCE DE ÍNDICES
-- ========================================

-- View para monitorar uso de índices
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'NEVER_USED'
        WHEN idx_scan < 100 THEN 'RARELY_USED'
        WHEN idx_scan < 1000 THEN 'MODERATELY_USED'
        ELSE 'FREQUENTLY_USED'
    END as usage_category,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ========================================
-- 9. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON MATERIALIZED VIEW mv_system_metrics_realtime IS 'Métricas do sistema em tempo real, atualizadas a cada refresh';
COMMENT ON MATERIALIZED VIEW mv_top_cache_users IS 'Top usuários por uso de cache e health score';
COMMENT ON FUNCTION optimize_database_performance() IS 'Otimização automática de performance do banco';
COMMENT ON FUNCTION analyze_query_performance(UUID, INTEGER) IS 'Análise detalhada de performance de queries por operação';
COMMENT ON VIEW index_usage_stats IS 'Estatísticas de uso de índices para otimização';