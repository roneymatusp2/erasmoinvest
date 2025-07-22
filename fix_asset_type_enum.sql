-- Fix para adicionar TESOURO_DIRETO ao enum asset_type
-- Este script corrige o problema das cores dos cards no modo grade

-- 1. Primeiro, adicionar o novo valor ao enum existente
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'TESOURO_DIRETO';

-- 2. Inserir metadados para Tesouro Direto se não existirem
INSERT INTO asset_metadata (ticker, nome, tipo, pais, moeda, setor, subsetor, segmento, liquidez, categoria_dy, benchmark, isin, cnpj, gestora, descricao, cor_tema) 
VALUES 
('TESOURO SELIC 2026', 'Tesouro Selic 2026', 'TESOURO_DIRETO', 'BRASIL', 'BRL', 'Renda Fixa', 'Títulos Públicos', 'Tesouro Direto', 'ALTA', 'RENDA_FIXA', 'Selic', 'BRSTNCLTN2E6', NULL, 'Tesouro Nacional', 'Título público federal indexado à taxa Selic, com vencimento em 2026', '#047857')
ON CONFLICT (ticker) DO NOTHING;

-- 3. Verificar se os dados foram inseridos corretamente
SELECT 'Tipos de ativos disponíveis:' as status;
SELECT DISTINCT tipo FROM asset_metadata ORDER BY tipo;

SELECT 'Total de metadados por tipo:' as status;
SELECT tipo, COUNT(*) as quantidade FROM asset_metadata GROUP BY tipo ORDER BY tipo;