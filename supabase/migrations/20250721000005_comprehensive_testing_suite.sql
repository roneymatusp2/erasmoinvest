-- ========================================
-- ERASMO INVEST - COMPREHENSIVE TESTING SUITE
-- ========================================
-- 
-- Suite completa de testes para o sistema de cache
-- Inclui testes de integridade, performance, edge cases
-- Validação sem impactos no sistema existente
--

-- ========================================
-- 1. FRAMEWORK DE TESTES
-- ========================================

-- Tabela para resultados dos testes
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_suite VARCHAR(50) NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    test_description TEXT,
    status VARCHAR(20) NOT NULL, -- PASSED, FAILED, SKIPPED, ERROR
    execution_time_ms INTEGER,
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função base para executar testes
CREATE OR REPLACE FUNCTION run_test(
    suite_name VARCHAR(50),
    test_name VARCHAR(100),
    test_description TEXT,
    test_function TEXT -- Nome da função a executar
) RETURNS BOOLEAN AS $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    execution_time INTEGER;
    test_result BOOLEAN := FALSE;
    error_msg TEXT := NULL;
    test_details JSONB := '{}'::JSONB;
BEGIN
    BEGIN
        -- Executar teste dinamicamente
        EXECUTE format('SELECT %s()', test_function) INTO test_result;
        
        IF test_result IS NULL THEN
            test_result := FALSE;
            error_msg := 'Test function returned NULL';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            test_result := FALSE;
            error_msg := SQLERRM;
    END;
    
    execution_time := EXTRACT(milliseconds FROM clock_timestamp() - start_time)::INTEGER;
    
    -- Registrar resultado
    INSERT INTO test_results (
        test_suite, test_name, test_description, status, 
        execution_time_ms, details, error_message
    ) VALUES (
        suite_name, test_name, test_description,
        CASE WHEN test_result THEN 'PASSED' ELSE 'FAILED' END,
        execution_time, test_details, error_msg
    );
    
    RETURN test_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. TESTES DE INTEGRIDADE BÁSICA
-- ========================================

-- Teste 1: Verificar estrutura das tabelas
CREATE OR REPLACE FUNCTION test_table_structure() RETURNS BOOLEAN AS $$
DECLARE
    required_tables TEXT[] := ARRAY[
        'portfolio_cache', 'asset_cache', 'cache_invalidation_log',
        'cache_performance_metrics', 'cache_recalc_queue', 'system_alerts'
    ];
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY required_tables LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            RAISE NOTICE 'Table % does not exist', table_name;
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Teste 2: Verificar constraints e índices
CREATE OR REPLACE FUNCTION test_constraints_and_indexes() RETURNS BOOLEAN AS $$
DECLARE
    constraint_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Verificar constraints principais
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
    AND table_name IN ('portfolio_cache', 'asset_cache');
    
    IF constraint_count < 4 THEN -- Mínimo esperado
        RAISE NOTICE 'Insufficient constraints found: %', constraint_count;
        RETURN FALSE;
    END IF;
    
    -- Verificar índices principais
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('portfolio_cache', 'asset_cache', 'cache_performance_metrics');
    
    IF index_count < 10 THEN -- Mínimo esperado
        RAISE NOTICE 'Insufficient indexes found: %', index_count;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Teste 3: Verificar funções críticas
CREATE OR REPLACE FUNCTION test_critical_functions() RETURNS BOOLEAN AS $$
DECLARE
    func_name TEXT;
    func_exists BOOLEAN;
    critical_functions TEXT[] := ARRAY[
        'recalculate_portfolio_cache', 'enqueue_portfolio_recalculation',
        'create_system_alert', 'process_recalc_queue'
    ];
BEGIN
    FOREACH func_name IN ARRAY critical_functions LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public' 
            AND routine_name = func_name
            AND routine_type = 'FUNCTION'
        ) INTO func_exists;
        
        IF NOT func_exists THEN
            RAISE NOTICE 'Function % does not exist', func_name;
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. TESTES DE FUNCIONALIDADE CACHE
-- ========================================

-- Teste 4: Cache básico (criação/leitura)
CREATE OR REPLACE FUNCTION test_basic_cache_operations() RETURNS BOOLEAN AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    cache_id UUID;
    cached_data RECORD;
BEGIN
    -- Limpar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    DELETE FROM asset_cache WHERE user_id = test_user_id;
    
    -- Inserir cache de teste
    INSERT INTO portfolio_cache (
        user_id, total_invested, total_dividends, total_assets, cache_version
    ) VALUES (
        test_user_id, 10000.00, 500.00, 5, 1
    ) RETURNING id INTO cache_id;
    
    -- Verificar leitura
    SELECT * INTO cached_data
    FROM portfolio_cache 
    WHERE user_id = test_user_id;
    
    IF cached_data IS NULL OR cached_data.total_invested != 10000.00 THEN
        RAISE NOTICE 'Cache read failed';
        RETURN FALSE;
    END IF;
    
    -- Limpar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Teste 5: Invalidação de cache
CREATE OR REPLACE FUNCTION test_cache_invalidation() RETURNS BOOLEAN AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000002';
    cache_valid BOOLEAN;
    invalidation_count INTEGER;
BEGIN
    -- Preparar cache de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    DELETE FROM cache_invalidation_log WHERE user_id = test_user_id;
    
    INSERT INTO portfolio_cache (
        user_id, total_invested, force_recalc_flag, cache_version
    ) VALUES (
        test_user_id, 5000.00, FALSE, 1
    );
    
    -- Testar invalidação manual
    PERFORM invalidate_user_cache(test_user_id, 'Test invalidation');
    
    -- Verificar se foi invalidado
    SELECT NOT force_recalc_flag INTO cache_valid
    FROM portfolio_cache 
    WHERE user_id = test_user_id;
    
    IF cache_valid THEN
        RAISE NOTICE 'Cache invalidation failed';
        RETURN FALSE;
    END IF;
    
    -- Verificar log de invalidação
    SELECT COUNT(*) INTO invalidation_count
    FROM cache_invalidation_log
    WHERE user_id = test_user_id;
    
    IF invalidation_count = 0 THEN
        RAISE NOTICE 'Invalidation not logged';
        RETURN FALSE;
    END IF;
    
    -- Limpar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    DELETE FROM cache_invalidation_log WHERE user_id = test_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. TESTES DE PERFORMANCE
-- ========================================

-- Teste 6: Performance de consulta ao cache
CREATE OR REPLACE FUNCTION test_cache_query_performance() RETURNS BOOLEAN AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTEGER;
    test_user_id UUID := '00000000-0000-0000-0000-000000000003';
    result RECORD;
BEGIN
    -- Preparar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    DELETE FROM asset_cache WHERE user_id = test_user_id;
    
    INSERT INTO portfolio_cache (
        user_id, total_invested, total_dividends, total_assets
    ) VALUES (
        test_user_id, 15000.00, 750.00, 8
    );
    
    -- Inserir alguns ativos de teste
    INSERT INTO asset_cache (user_id, ticker, current_position, total_invested)
    SELECT test_user_id, 'TEST' || generate_series, 100, 1000
    FROM generate_series(1, 5);
    
    -- Medir performance de consulta
    start_time := clock_timestamp();
    
    SELECT * INTO result
    FROM portfolio_cache pc
    LEFT JOIN (
        SELECT user_id, COUNT(*) as asset_count, SUM(total_invested) as total_asset_invested
        FROM asset_cache
        WHERE user_id = test_user_id
        GROUP BY user_id
    ) ac ON pc.user_id = ac.user_id
    WHERE pc.user_id = test_user_id;
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(milliseconds FROM end_time - start_time)::INTEGER;
    
    -- Verificar se consulta foi rápida (< 100ms)
    IF execution_time > 100 THEN
        RAISE NOTICE 'Query too slow: %ms', execution_time;
        RETURN FALSE;
    END IF;
    
    -- Limpar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    DELETE FROM asset_cache WHERE user_id = test_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. TESTES DE EDGE CASES
-- ========================================

-- Teste 7: Dados nulos e casos extremos
CREATE OR REPLACE FUNCTION test_null_and_edge_cases() RETURNS BOOLEAN AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000004';
    result BOOLEAN;
BEGIN
    -- Teste com valores nulos
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    
    INSERT INTO portfolio_cache (
        user_id, total_invested, total_dividends, total_assets
    ) VALUES (
        test_user_id, NULL, NULL, NULL
    );
    
    -- Verificar se funções lidam bem com NULLs
    SELECT is_cache_valid(test_user_id, 30) INTO result;
    
    -- Teste com valores zero
    UPDATE portfolio_cache 
    SET total_invested = 0, total_dividends = 0, total_assets = 0
    WHERE user_id = test_user_id;
    
    -- Verificar se ainda funciona
    SELECT is_cache_valid(test_user_id, 30) INTO result;
    
    -- Limpar dados de teste
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Teste 8: Concorrência (simulada)
CREATE OR REPLACE FUNCTION test_concurrent_operations() RETURNS BOOLEAN AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000005';
    queue_id1 UUID;
    queue_id2 UUID;
BEGIN
    -- Limpar dados de teste
    DELETE FROM cache_recalc_queue WHERE user_id = test_user_id;
    DELETE FROM portfolio_cache WHERE user_id = test_user_id;
    
    -- Simular múltiplas requisições de recálculo simultâneas
    SELECT enqueue_portfolio_recalculation(test_user_id, 'full_portfolio', 1) INTO queue_id1;
    SELECT enqueue_portfolio_recalculation(test_user_id, 'full_portfolio', 1) INTO queue_id2;
    
    -- Verificar se deduplicação funcionou (deve retornar o mesmo ID)
    IF queue_id1 != queue_id2 THEN
        RAISE NOTICE 'Deduplication failed: % != %', queue_id1, queue_id2;
        RETURN FALSE;
    END IF;
    
    -- Limpar dados de teste
    DELETE FROM cache_recalc_queue WHERE user_id = test_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. TESTES DE INTEGRIDADE DE DADOS
-- ========================================

-- Teste 9: Consistência entre tabelas
CREATE OR REPLACE FUNCTION test_data_consistency() RETURNS BOOLEAN AS $$
DECLARE
    inconsistent_users INTEGER;
    orphaned_assets INTEGER;
    orphaned_logs INTEGER;
BEGIN
    -- Verificar se todos os asset_cache têm portfolio_cache correspondente
    SELECT COUNT(*) INTO orphaned_assets
    FROM asset_cache ac
    LEFT JOIN portfolio_cache pc ON ac.user_id = pc.user_id
    WHERE pc.user_id IS NULL;
    
    IF orphaned_assets > 0 THEN
        RAISE NOTICE '% orphaned asset cache records found', orphaned_assets;
        RETURN FALSE;
    END IF;
    
    -- Verificar logs órfãos (mais de 30 dias sem usuário)
    SELECT COUNT(*) INTO orphaned_logs
    FROM cache_invalidation_log cil
    LEFT JOIN portfolio_cache pc ON cil.user_id = pc.user_id
    WHERE pc.user_id IS NULL 
    AND cil.created_at < NOW() - INTERVAL '30 days';
    
    -- Logs órfãos antigos são aceitáveis (usuários podem ter sido deletados)
    -- Apenas reportar, não falhar o teste
    IF orphaned_logs > 0 THEN
        RAISE NOTICE '% old orphaned log records found (acceptable)', orphaned_logs;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. SUITE DE TESTES PRINCIPAL
-- ========================================

-- Função para executar todos os testes
CREATE OR REPLACE FUNCTION run_complete_test_suite() RETURNS TABLE (
    test_suite VARCHAR(50),
    test_name VARCHAR(100),
    status VARCHAR(20),
    execution_time_ms INTEGER,
    error_message TEXT
) AS $$
BEGIN
    -- Limpar resultados anteriores
    DELETE FROM test_results WHERE created_at < NOW() - INTERVAL '1 day';
    
    -- Executar testes de integridade
    PERFORM run_test('integrity', 'table_structure', 'Verify all required tables exist', 'test_table_structure');
    PERFORM run_test('integrity', 'constraints_indexes', 'Verify constraints and indexes', 'test_constraints_and_indexes');
    PERFORM run_test('integrity', 'critical_functions', 'Verify critical functions exist', 'test_critical_functions');
    
    -- Executar testes de funcionalidade
    PERFORM run_test('functionality', 'basic_cache_ops', 'Basic cache create/read operations', 'test_basic_cache_operations');
    PERFORM run_test('functionality', 'cache_invalidation', 'Cache invalidation mechanism', 'test_cache_invalidation');
    
    -- Executar testes de performance
    PERFORM run_test('performance', 'cache_query_speed', 'Cache query performance', 'test_cache_query_performance');
    
    -- Executar testes de edge cases
    PERFORM run_test('edge_cases', 'null_handling', 'Handle null and extreme values', 'test_null_and_edge_cases');
    PERFORM run_test('edge_cases', 'concurrency', 'Concurrent operations handling', 'test_concurrent_operations');
    
    -- Executar testes de integridade de dados
    PERFORM run_test('data_integrity', 'consistency_check', 'Data consistency between tables', 'test_data_consistency');
    
    -- Retornar resultados
    RETURN QUERY
    SELECT 
        tr.test_suite,
        tr.test_name,
        tr.status,
        tr.execution_time_ms,
        tr.error_message
    FROM test_results tr
    WHERE tr.created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY tr.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. RELATÓRIO DE SAÚDE DO SISTEMA
-- ========================================

-- Função para gerar relatório completo de saúde
CREATE OR REPLACE FUNCTION generate_system_health_report() RETURNS TEXT AS $$
DECLARE
    report TEXT := '';
    test_summary RECORD;
    health_data RECORD;
    alert_count INTEGER;
    queue_size INTEGER;
    cache_stats RECORD;
BEGIN
    report := E'=== ERASMO INVEST CACHE SYSTEM HEALTH REPORT ===\n';
    report := report || 'Generated at: ' || NOW()::TEXT || E'\n\n';
    
    -- 1. Test Results Summary
    SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'PASSED' THEN 1 END) as passed_tests,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_tests,
        ROUND(AVG(execution_time_ms)::NUMERIC, 2) as avg_execution_time
    INTO test_summary
    FROM test_results 
    WHERE created_at > NOW() - INTERVAL '1 hour';
    
    report := report || E'📊 TEST SUMMARY (Last Hour):\n';
    report := report || format('- Total Tests: %s\n', COALESCE(test_summary.total_tests, 0));
    report := report || format('- Passed: %s\n', COALESCE(test_summary.passed_tests, 0));
    report := report || format('- Failed: %s\n', COALESCE(test_summary.failed_tests, 0));
    report := report || format('- Avg Execution Time: %sms\n', COALESCE(test_summary.avg_execution_time, 0));
    report := report || E'\n';
    
    -- 2. System Health Data
    SELECT * INTO health_data FROM system_health_dashboard LIMIT 1;
    
    report := report || E'💾 CACHE SYSTEM STATUS:\n';
    report := report || format('- Users with Cache: %s\n', COALESCE(health_data.users_with_cache, 0));
    report := report || format('- Users with Valid Cache: %s\n', COALESCE(health_data.users_with_valid_cache, 0));
    report := report || format('- Average Cache Age: %s minutes\n', COALESCE(health_data.avg_cache_age_minutes, 0));
    report := report || format('- Cache Hit Rate (24h): %s%%\n', COALESCE(health_data.cache_hit_rate_24h, 0));
    report := report || format('- Average Query Time: %sms\n', COALESCE(health_data.avg_query_time_24h, 0));
    report := report || E'\n';
    
    -- 3. Alerts and Issues
    SELECT COUNT(*) INTO alert_count 
    FROM system_alerts 
    WHERE status = 'active';
    
    report := report || E'🚨 ALERTS:\n';
    report := report || format('- Active Alerts: %s\n', alert_count);
    
    IF alert_count > 0 THEN
        report := report || E'   Recent Alerts:\n';
        FOR health_data IN 
            SELECT title, severity, created_at 
            FROM system_alerts 
            WHERE status = 'active' 
            ORDER BY created_at DESC 
            LIMIT 3
        LOOP
            report := report || format('   - [%s] %s (%s)\n', 
                health_data.severity, 
                health_data.title, 
                health_data.created_at::DATE);
        END LOOP;
    END IF;
    
    report := report || E'\n';
    
    -- 4. Queue Status
    SELECT COUNT(*) INTO queue_size 
    FROM cache_recalc_queue 
    WHERE status IN ('pending', 'processing');
    
    report := report || E'⏳ PROCESSING QUEUE:\n';
    report := report || format('- Queue Size: %s\n', queue_size);
    report := report || E'\n';
    
    -- 5. Performance Summary
    SELECT 
        COUNT(*) as total_operations,
        AVG(execution_time_ms) as avg_time,
        MAX(execution_time_ms) as max_time,
        COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits
    INTO cache_stats
    FROM cache_performance_metrics 
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    report := report || E'⚡ PERFORMANCE (24h):\n';
    report := report || format('- Total Operations: %s\n', COALESCE(cache_stats.total_operations, 0));
    report := report || format('- Cache Hits: %s\n', COALESCE(cache_stats.cache_hits, 0));
    report := report || format('- Average Time: %sms\n', COALESCE(ROUND(cache_stats.avg_time::NUMERIC, 2), 0));
    report := report || format('- Max Time: %sms\n', COALESCE(cache_stats.max_time, 0));
    report := report || E'\n';
    
    -- 6. Recommendations
    report := report || E'💡 RECOMMENDATIONS:\n';
    
    IF COALESCE(health_data.cache_hit_rate_24h, 0) < 70 THEN
        report := report || '- Cache hit rate is low, consider increasing TTL\n';
    END IF;
    
    IF COALESCE(health_data.avg_query_time_24h, 0) > 500 THEN
        report := report || '- Query performance is slow, check indexes\n';
    END IF;
    
    IF alert_count > 5 THEN
        report := report || '- Too many active alerts, investigate issues\n';
    END IF;
    
    IF queue_size > 10 THEN
        report := report || '- Large processing queue, consider increasing workers\n';
    END IF;
    
    report := report || E'\n=== END OF REPORT ===';
    
    RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON FUNCTION run_complete_test_suite() IS 'Suite completa de testes do sistema de cache - executa todos os testes sem impacto no sistema';
COMMENT ON FUNCTION generate_system_health_report() IS 'Gera relatório completo de saúde do sistema com métricas e recomendações';
COMMENT ON TABLE test_results IS 'Armazena resultados dos testes automatizados para auditoria e análise';