-- ========================================
-- ERASMO INVEST - PORTFOLIO CACHE SYSTEM
-- ========================================
-- 
-- Sistema de cache elegante e completo para cálculos de portfólio
-- Preserva valores já calculados do frontend evitando recálculos
-- Implementa cache inteligente com invalidação automática
-- Inclui sistema de logs e monitoramento completo
-- 

-- ========================================
-- 1. PORTFOLIO CACHE TABLE (CACHE PRINCIPAL)
-- ========================================

CREATE TABLE IF NOT EXISTS portfolio_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificação e versionamento
    cache_version INTEGER NOT NULL DEFAULT 1,
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Resumo Geral do Portfólio
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_dividends DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_interest DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_taxes DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_profit_loss_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
    
    -- Métricas de Rentabilidade
    yield_on_cost DECIMAL(8,4) NOT NULL DEFAULT 0,
    dividend_yield DECIMAL(8,4) NOT NULL DEFAULT 0,
    monthly_income DECIMAL(15,2) NOT NULL DEFAULT 0,
    annual_income DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Diversificação
    total_assets INTEGER NOT NULL DEFAULT 0,
    total_br_assets INTEGER NOT NULL DEFAULT 0,
    total_us_assets INTEGER NOT NULL DEFAULT 0,
    total_crypto_assets INTEGER NOT NULL DEFAULT 0,
    total_fiis INTEGER NOT NULL DEFAULT 0,
    total_stocks INTEGER NOT NULL DEFAULT 0,
    total_reits INTEGER NOT NULL DEFAULT 0,
    
    -- Concentração
    top_asset_ticker VARCHAR(20),
    top_asset_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
    concentration_risk_score INTEGER NOT NULL DEFAULT 0,
    
    -- Dados do Mercado
    last_market_sync TIMESTAMP WITH TIME ZONE,
    market_data_source VARCHAR(50),
    usd_brl_rate DECIMAL(8,4),
    
    -- Metadados
    calculation_source VARCHAR(50) NOT NULL DEFAULT 'frontend',
    calculation_method VARCHAR(100),
    data_integrity_hash VARCHAR(256),
    
    -- Configurações de Cache
    cache_ttl_minutes INTEGER NOT NULL DEFAULT 30,
    force_recalc_flag BOOLEAN DEFAULT FALSE,
    
    UNIQUE(user_id)
);

-- ========================================
-- 2. ASSET CACHE TABLE (CACHE POR ATIVO)
-- ========================================

CREATE TABLE IF NOT EXISTS asset_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    
    -- Identificação
    cache_version INTEGER NOT NULL DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Posição do Ativo
    current_position DECIMAL(15,6) NOT NULL DEFAULT 0,
    total_bought DECIMAL(15,6) NOT NULL DEFAULT 0,
    total_sold DECIMAL(15,6) NOT NULL DEFAULT 0,
    
    -- Valores Investidos
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    average_price DECIMAL(15,6) NOT NULL DEFAULT 0,
    current_market_price DECIMAL(15,6) NOT NULL DEFAULT 0,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Rentabilidade
    profit_loss DECIMAL(15,2) NOT NULL DEFAULT 0,
    profit_loss_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
    total_dividends DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_interest DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_taxes DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Métricas do Ativo
    yield_on_cost DECIMAL(8,4) NOT NULL DEFAULT 0,
    dividend_yield DECIMAL(8,4) NOT NULL DEFAULT 0,
    last_dividend_date DATE,
    last_dividend_amount DECIMAL(15,6),
    
    -- Classificação
    asset_type VARCHAR(50),
    market VARCHAR(10), -- BR, US, CRYPTO
    sector VARCHAR(100),
    
    -- Market Data
    last_price_update TIMESTAMP WITH TIME ZONE,
    price_source VARCHAR(50),
    currency VARCHAR(5),
    
    -- Performance
    performance_1d DECIMAL(8,4),
    performance_7d DECIMAL(8,4),
    performance_30d DECIMAL(8,4),
    performance_ytd DECIMAL(8,4),
    
    UNIQUE(user_id, ticker)
);

-- ========================================
-- 3. CACHE INVALIDATION LOG
-- ========================================

CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    trigger_reason VARCHAR(200),
    old_values JSONB,
    new_values JSONB,
    cache_version_before INTEGER,
    cache_version_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER
);

-- ========================================
-- 4. CACHE PERFORMANCE METRICS
-- ========================================

CREATE TABLE IF NOT EXISTS cache_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    operation VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    data_source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- ========================================
-- 5. ÍNDICES PARA PERFORMANCE OTIMIZADA
-- ========================================

-- Índices principais
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_user_id ON portfolio_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_updated ON portfolio_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_asset_cache_user_ticker ON asset_cache(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_asset_cache_updated ON asset_cache(last_updated);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_cache_log_user_created ON cache_invalidation_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_user_created ON cache_performance_metrics(user_id, created_at);

-- Índices para queries específicas
CREATE INDEX IF NOT EXISTS idx_asset_cache_type_market ON asset_cache(asset_type, market);
CREATE INDEX IF NOT EXISTS idx_portfolio_cache_force_recalc ON portfolio_cache(force_recalc_flag) WHERE force_recalc_flag = TRUE;

-- ========================================
-- 6. RLS POLICIES (ROW LEVEL SECURITY)
-- ========================================

-- Portfolio Cache Policies
ALTER TABLE portfolio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio cache" ON portfolio_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio cache" ON portfolio_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio cache" ON portfolio_cache
    FOR UPDATE USING (auth.uid() = user_id);

-- Asset Cache Policies
ALTER TABLE asset_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own asset cache" ON asset_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own asset cache" ON asset_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own asset cache" ON asset_cache
    FOR UPDATE USING (auth.uid() = user_id);

-- Log Tables - Admin only (opcional, pode ser ajustado)
ALTER TABLE cache_invalidation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_performance_metrics ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. FUNÇÕES AUXILIARES PARA CACHE
-- ========================================

-- Função para verificar se cache está válido
CREATE OR REPLACE FUNCTION is_cache_valid(
    user_id_param UUID,
    ttl_minutes INTEGER DEFAULT 30
) RETURNS BOOLEAN AS $$
DECLARE
    last_update TIMESTAMP WITH TIME ZONE;
    force_recalc BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT last_updated, force_recalc_flag 
    INTO last_update, force_recalc
    FROM portfolio_cache 
    WHERE user_id = user_id_param;
    
    -- Se não existe cache ou está marcado para recálculo forçado
    IF last_update IS NULL OR force_recalc = TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar TTL
    IF last_update + INTERVAL '1 minute' * ttl_minutes < NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para invalidar cache
CREATE OR REPLACE FUNCTION invalidate_user_cache(
    user_id_param UUID,
    reason TEXT DEFAULT 'Manual invalidation'
) RETURNS VOID AS $$
BEGIN
    -- Marcar para recálculo forçado
    UPDATE portfolio_cache 
    SET force_recalc_flag = TRUE,
        cache_version = cache_version + 1
    WHERE user_id = user_id_param;
    
    -- Log da invalidação
    INSERT INTO cache_invalidation_log (
        user_id, table_name, operation, trigger_reason
    ) VALUES (
        user_id_param, 'portfolio_cache', 'INVALIDATE', reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar cache antigo
CREATE OR REPLACE FUNCTION cleanup_old_cache() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Limpar logs antigos (>30 dias)
    DELETE FROM cache_invalidation_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Limpar métricas antigas (>7 dias)
    DELETE FROM cache_performance_metrics 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE portfolio_cache IS 'Cache inteligente para cálculos de portfólio - preserva valores já calculados do frontend';
COMMENT ON TABLE asset_cache IS 'Cache detalhado por ativo individual com métricas completas';
COMMENT ON TABLE cache_invalidation_log IS 'Log de invalidações de cache para debugging e auditoria';
COMMENT ON TABLE cache_performance_metrics IS 'Métricas de performance do sistema de cache';

COMMENT ON COLUMN portfolio_cache.calculation_source IS 'Fonte do cálculo: frontend, backend, manual, api';
COMMENT ON COLUMN portfolio_cache.data_integrity_hash IS 'Hash para verificar integridade dos dados';
COMMENT ON COLUMN portfolio_cache.force_recalc_flag IS 'Flag para forçar recálculo na próxima consulta';