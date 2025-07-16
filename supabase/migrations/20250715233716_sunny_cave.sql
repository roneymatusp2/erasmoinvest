/*
  # Setup completo e limpo para o sistema de investimentos
  
  1. Remove tudo que pode estar causando conflito
  2. Cria tabelas do zero
  3. Cria triggers sem conflitos
  4. RLS policies
*/

-- Limpar tudo primeiro (sem erros se não existir)
DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
DROP TRIGGER IF EXISTS update_asset_metadata_updated_at ON asset_metadata;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Remover tabelas se existirem para começar limpo
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS asset_metadata CASCADE;

-- Tipos ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
        CREATE TYPE asset_type AS ENUM ('FII', 'ACAO', 'ETF', 'REIT', 'STOCK');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'country_type') THEN
        CREATE TYPE country_type AS ENUM ('BRASIL', 'EUA', 'GLOBAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
        CREATE TYPE currency_type AS ENUM ('BRL', 'USD');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('COMPRA', 'VENDA', 'DIVIDENDO', 'JUROS', 'IMPOSTO', 'DESDOBRAMENTO');
    END IF;
END
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_ticker ON investments(ticker);
CREATE INDEX IF NOT EXISTS idx_investments_data ON investments(data);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_ticker ON asset_metadata(ticker);

-- Triggers para updated_at
CREATE TRIGGER update_asset_metadata_updated_at
    BEFORE UPDATE ON asset_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE asset_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Asset metadata - todos podem ler
CREATE POLICY "Public read access for asset metadata" ON asset_metadata
    FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert asset metadata" ON asset_metadata
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update asset metadata" ON asset_metadata
    FOR UPDATE TO authenticated USING (true);

-- Investments - usuários só veem seus próprios dados
CREATE POLICY "Users can read own investments" ON investments
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" ON investments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments" ON investments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments" ON investments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);