/*
  # Fix completo do sistema de investimentos
  
  1. Remove todas as tabelas existentes
  2. Remove triggers e funções conflitantes  
  3. Cria estrutura limpa e funcional
  4. Configura RLS corretamente
  5. Popula dados iniciais
*/

-- === LIMPEZA COMPLETA ===

-- Remover triggers existentes
DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
DROP TRIGGER IF EXISTS update_asset_metadata_updated_at ON asset_metadata;
DROP TRIGGER IF EXISTS validate_email_on_signup ON auth.users;
DROP TRIGGER IF EXISTS ensure_authorized_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover funções
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS validate_authorized_email() CASCADE;
DROP FUNCTION IF EXISTS validate_authorized_signup() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_authorized_email(text) CASCADE;
DROP FUNCTION IF EXISTS current_user_email() CASCADE;
DROP FUNCTION IF EXISTS create_investments_table_if_not_exists() CASCADE;

-- Remover tabelas
DROP TABLE IF EXISTS user_portfolios CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS asset_metadata CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Remover tipos enum existentes
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS asset_type CASCADE;
DROP TYPE IF EXISTS country_type CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;

-- === CRIAÇÃO DOS TIPOS ENUM ===

CREATE TYPE asset_type AS ENUM ('FII', 'ACAO', 'ETF', 'REIT', 'STOCK');
CREATE TYPE country_type AS ENUM ('BRASIL', 'EUA', 'GLOBAL');  
CREATE TYPE currency_type AS ENUM ('BRL', 'USD');
CREATE TYPE transaction_type AS ENUM ('COMPRA', 'VENDA', 'DIVIDENDO', 'JUROS', 'IMPOSTO', 'DESDOBRAMENTO');

-- === FUNÇÕES AUXILIARES ===

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para verificar se usuário é o Erasmo
CREATE OR REPLACE FUNCTION is_erasmo_user()
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT email FROM auth.users 
        WHERE id = auth.uid() 
        AND email = 'erasmorusso@uol.com.br'
    ) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- === TABELAS ===

-- Tabela: asset_metadata
CREATE TABLE asset_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    tipo asset_type NOT NULL,
    pais country_type DEFAULT 'BRASIL',
    moeda currency_type DEFAULT 'BRL',
    setor TEXT,
    subsetor TEXT,
    segmento TEXT,
    liquidez TEXT,
    categoria_dy TEXT,
    benchmark TEXT,
    isin TEXT,
    cnpj TEXT,
    gestora TEXT,
    descricao TEXT,
    site_oficial TEXT,
    cor_tema TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: investments
CREATE TABLE investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    data DATE NOT NULL,
    tipo transaction_type NOT NULL,
    quantidade DECIMAL(15,8) DEFAULT 0,
    valor_unitario DECIMAL(15,4) DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    dividendos DECIMAL(15,2) DEFAULT 0,
    juros DECIMAL(15,2) DEFAULT 0,
    impostos DECIMAL(15,2) DEFAULT 0,
    observacoes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: user_portfolios (para controle futuro)
CREATE TABLE user_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- === ÍNDICES ===

CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_ticker ON investments(ticker);
CREATE INDEX idx_investments_data ON investments(data);
CREATE INDEX idx_investments_user_ticker ON investments(user_id, ticker);
CREATE INDEX idx_asset_metadata_ticker ON asset_metadata(ticker);
CREATE INDEX idx_user_portfolios_user_id ON user_portfolios(user_id);

-- === TRIGGERS ===

CREATE TRIGGER update_asset_metadata_updated_at
    BEFORE UPDATE ON asset_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_portfolios_updated_at
    BEFORE UPDATE ON user_portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- === RLS POLICIES ===

-- Asset metadata - acesso público para leitura, autenticado para escrita
ALTER TABLE asset_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for asset metadata" ON asset_metadata
    FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can manage asset metadata" ON asset_metadata
    FOR ALL TO authenticated USING (true);

-- Investments - apenas dados próprios
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own investments" ON investments
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User portfolios - apenas dados próprios
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolios" ON user_portfolios
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- === DADOS INICIAIS - ASSET METADATA ===

INSERT INTO asset_metadata (ticker, nome, tipo, pais, moeda, setor, subsetor, segmento, liquidez, categoria_dy, benchmark, isin, cnpj, gestora, descricao, cor_tema) VALUES
-- FIIs Brasileiros
('ALZR11', 'Alianza Trust Renda Imobiliária', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Lajes Corporativas', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRALZRCTF009', '28.767.076/0001-46', 'Alianza Trust', 'Fundo de investimento imobiliário focado em lajes corporativas de alto padrão', '#1e40af'),
('BCIA11', 'BTG Pactual Corporate Office', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Lajes Corporativas', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRBCFICTF004', '34.868.445/0001-44', 'BTG Pactual', 'Fundo especializado em edifícios corporativos de alta qualidade', '#059669'),
('BRCO11', 'Bresco Logística FII', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Logística', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRBRCO11F009', '20.748.515/0001-81', 'Bresco', 'Portfólio de galpões logísticos de alto padrão em regiões estratégicas', '#155e75'),
('BTLG11', 'BTG Pactual Logística', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Logística', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRBTLGCTF002', '37.086.421/0001-15', 'BTG Pactual', 'Fundo especializado em galpões logísticos e industriais', '#7c3aed'),
('HGBS11', 'Hedge Brasil Shopping', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Shopping Centers', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRHGBSCTF001', '08.431.747/0001-06', 'Hedge Investments', 'Fundo focado em participação em shopping centers pelo Brasil', '#be185d'),
('HGCR11', 'CSHG Recebíveis Imobiliários', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Recebíveis', 'Papel', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRHGCRCTF000', '11.160.521/0001-22', 'Credit Suisse Hedging-Griffo', 'Fundo de recebíveis imobiliários com foco em CRIs de alta qualidade', '#065f46'),
('HGFF11', 'CSHG FOF', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Fundo de Fundos', 'Fundos', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRHGFFCTF001', '18.307.582/0001-19', 'Credit Suisse Hedging-Griffo', 'Fundo de fundos imobiliários com diversificação em vários segmentos', '#4338ca'),
('HGLG11', 'CSHG Logística', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Logística', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRHGLGCTF004', '11.728.688/0001-47', 'Credit Suisse Hedging-Griffo', 'Fundo com foco em galpões logísticos de alto padrão em localizações estratégicas', '#155e75'),
('KFOF11', 'Kinea Índice de Preços FoF', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Fundo de Fundos', 'Fundos', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRKFOFC11000', '30.091.444/0001-40', 'Kinea Investimentos', 'Fundo de fundos imobiliários com foco em proteção à inflação', '#6b21a8'),
('KNCR11', 'Kinea Rendimentos Imobiliários', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Recebíveis', 'Papel', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRKNCRC11005', '16.706.958/0001-32', 'Kinea Investimentos', 'Fundo de recebíveis imobiliários com foco em CRIs de alta qualidade', '#5b21b6'),
('KNRI11', 'Kinea Renda Imobiliária', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Híbrido', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRKNRIC11001', '12.005.956/0001-65', 'Kinea Investimentos', 'Fundo diversificado com foco em imóveis corporativos e logísticos', '#4f46e5'),
('KNSC11', 'Kinea Securities', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Recebíveis', 'Papel', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRKNSCCTF009', '35.864.448/0001-38', 'Kinea Investimentos', 'Fundo de recebíveis imobiliários com foco em CRIs de alta qualidade', '#6366f1'),
('RCRB11', 'Rio Bravo Renda Corporativa', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Lajes Corporativas', 'Tijolo', 'MEDIA', 'RENDA_FIXA', 'IFIX', 'BRRCRBC11003', '03.683.056/0001-86', 'Rio Bravo', 'Fundo com foco em edifícios corporativos de alto padrão em São Paulo', '#047857'),
('XPLG11', 'XP Log', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Logística', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRXPLGC11008', '26.502.794/0001-85', 'XP Asset Management', 'Fundo com foco em galpões logísticos de alto padrão', '#0e7490'),
('XPML11', 'XP Malls', 'FII', 'BRASIL', 'BRL', 'Fundos Imobiliários', 'Shopping Centers', 'Tijolo', 'ALTA', 'RENDA_FIXA', 'IFIX', 'BRXPMLC11007', '28.757.546/0001-00', 'XP Asset Management', 'Fundo com foco em participação em shopping centers pelo Brasil', '#be185d'),

-- Ações Brasileiras
('BBAS3', 'Banco do Brasil', 'ACAO', 'BRASIL', 'BRL', 'Financeiro', 'Bancos', 'Banco Comercial', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRBBASACNOR3', NULL, NULL, 'Maior banco público do Brasil, com forte atuação no crédito agrícola e varejo', '#fbbf24'),
('BBSE3', 'BB Seguridade', 'ACAO', 'BRASIL', 'BRL', 'Financeiro', 'Seguros', 'Seguradoras', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRBBSEACNOR5', NULL, NULL, 'Empresa de seguros, previdência e capitalização do grupo Banco do Brasil', '#eab308'),
('B3SA3', 'B3 - Brasil, Bolsa, Balcão', 'ACAO', 'BRASIL', 'BRL', 'Financeiro', 'Serviços Financeiros', 'Bolsa de Valores', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRBBDCACNOR2', NULL, NULL, 'Maior bolsa de valores e infraestrutura de mercado da América Latina', '#0284c7'),
('BBDC4', 'Bradesco', 'ACAO', 'BRASIL', 'BRL', 'Financeiro', 'Bancos', 'Banco Comercial', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRBBDCACNPR8', NULL, NULL, 'Um dos maiores bancos privados do Brasil, com forte presença no varejo bancário', '#b91c1c'),
('CPFE3', 'CPFL Energia', 'ACAO', 'BRASIL', 'BRL', 'Utilities', 'Energia Elétrica', 'Geração e Distribuição', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRCPFEACNOR0', NULL, NULL, 'Uma das maiores empresas do setor elétrico brasileiro', '#0891b2'),
('EGIE3', 'ENGIE Brasil Energia', 'ACAO', 'BRASIL', 'BRL', 'Utilities', 'Energia Elétrica', 'Geração', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BREGIECNOR9', NULL, NULL, 'Uma das maiores geradoras privadas de energia do Brasil, com foco em renováveis', '#0e7490'),
('FLRY3', 'Fleury S.A.', 'ACAO', 'BRASIL', 'BRL', 'Saúde', 'Serviços Médicos', 'Diagnósticos', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRFLRYACNOR4', NULL, NULL, 'Empresa líder em medicina diagnóstica e serviços de saúde no Brasil', '#0284c7'),
('ODPV3', 'Odontoprev', 'ACAO', 'BRASIL', 'BRL', 'Saúde', 'Serviços Médicos', 'Planos de Saúde', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRODPVACNOR5', NULL, NULL, 'Maior operadora de planos odontológicos da América Latina', '#0369a1'),
('PSSA3', 'Porto Seguro', 'ACAO', 'BRASIL', 'BRL', 'Financeiro', 'Seguros', 'Seguradoras', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRPSSAACNOR7', NULL, NULL, 'Uma das maiores seguradoras do Brasil, com amplo portfólio de produtos', '#b45309'),
('RADL3', 'Raia Drogasil', 'ACAO', 'BRASIL', 'BRL', 'Consumo', 'Comércio e Distribuição', 'Medicamentos e Outros Produtos', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRRADLACNOR0', NULL, NULL, 'Maior rede de farmácias do Brasil, resultado da fusão entre Droga Raia e Drogasil', '#be123c'),
('VALE3', 'Vale S.A.', 'ACAO', 'BRASIL', 'BRL', 'Mineração', 'Mineração', 'Minério de Ferro', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRVALEACNOR6', NULL, NULL, 'Maior mineradora do Brasil, líder mundial em minério de ferro', '#16a34a'),
('WEGE3', 'WEG S.A.', 'ACAO', 'BRASIL', 'BRL', 'Industrial', 'Máquinas e Equipamentos', 'Motores Elétricos', 'ALTA', 'RENDA_VARIAVEL', 'IBOVESPA', 'BRWEGEACNOR0', NULL, NULL, 'Fabricante de motores elétricos e equipamentos industriais', '#059669'),

-- ETFs e Ativos Americanos
('VNQ', 'Vanguard Real Estate ETF', 'ETF', 'EUA', 'USD', 'Real Estate', 'REITs', 'Diversificado', 'ALTA', 'RENDA_FIXA', 'MSCI US REIT Index', 'US9229083632', NULL, NULL, 'ETF que replica o desempenho do mercado imobiliário americano', '#dc2626'),
('VOO', 'Vanguard S&P 500 ETF', 'ETF', 'EUA', 'USD', 'Diversificado', 'Large Cap', 'Ações', 'ALTA', 'RENDA_VARIAVEL', 'S&P 500', 'US9229087690', NULL, NULL, 'ETF que replica o desempenho do índice S&P 500', '#0369a1'),
('DVN', 'Devon Energy Corporation', 'STOCK', 'EUA', 'USD', 'Energia', 'Petróleo e Gás', 'Exploração e Produção', 'ALTA', 'RENDA_VARIAVEL', 'S&P 500', 'US25179M1036', NULL, NULL, 'Empresa de exploração e produção de petróleo e gás natural', '#7c2d12'),
('EVEX', 'Eve Holding Inc.', 'STOCK', 'EUA', 'USD', 'Aeroespacial', 'Aviação', 'eVTOL', 'MEDIA', 'RENDA_VARIAVEL', 'NASDAQ', 'US30063P1057', NULL, NULL, 'Empresa de mobilidade aérea urbana desenvolvendo aeronaves eVTOL', '#9333ea'),
('O', 'Realty Income Corporation', 'REIT', 'EUA', 'USD', 'Real Estate', 'REITs', 'Varejo', 'ALTA', 'RENDA_FIXA', 'MSCI US REIT Index', 'US7561091049', NULL, NULL, 'REIT focado em propriedades comerciais com contratos de longo prazo', '#ca8a04');

-- === CONFIRMAÇÃO ===
-- Verificar se as tabelas foram criadas
DO $$
BEGIN
    RAISE NOTICE 'Tabelas criadas com sucesso:';
    RAISE NOTICE '- asset_metadata: % registros', (SELECT COUNT(*) FROM asset_metadata);
    RAISE NOTICE '- investments: % registros', (SELECT COUNT(*) FROM investments);
    RAISE NOTICE '- user_portfolios: % registros', (SELECT COUNT(*) FROM user_portfolios);
END $$; 