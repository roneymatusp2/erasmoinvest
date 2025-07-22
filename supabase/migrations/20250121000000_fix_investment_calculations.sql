-- Migration principal corrigida - adiciona cálculo automático de valor_total
-- Esta versão funciona com a estrutura existente (sem campo "tipo")

-- Função para calcular valor total baseado em compra/venda
CREATE OR REPLACE FUNCTION calculate_total_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular valor_total baseado em compra ou venda
  IF NEW.compra IS NOT NULL AND NEW.compra > 0 AND NEW.valor_unit IS NOT NULL AND NEW.valor_unit > 0 THEN
    -- É uma compra
    NEW.valor_total := NEW.compra * NEW.valor_unit;
  ELSIF NEW.venda IS NOT NULL AND NEW.venda > 0 AND NEW.valor_unit IS NOT NULL AND NEW.valor_unit > 0 THEN
    -- É uma venda
    NEW.valor_total := NEW.venda * NEW.valor_unit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS auto_calculate_total_trigger ON investments;

-- Criar novo trigger
CREATE TRIGGER auto_calculate_total_trigger
  BEFORE INSERT OR UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_value();

-- Adicionar coluna valor_total se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'investments' 
    AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE investments ADD COLUMN valor_total DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

-- Atualizar registros existentes
UPDATE investments
SET valor_total = compra * valor_unit
WHERE compra > 0 
  AND valor_unit > 0
  AND (valor_total IS NULL OR valor_total = 0);

UPDATE investments
SET valor_total = venda * valor_unit
WHERE venda > 0 
  AND valor_unit > 0
  AND (valor_total IS NULL OR valor_total = 0);

-- Verificação final
SELECT 
  ticker,
  COUNT(*) as total_registros,
  SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) as total_investido,
  SUM(dividendos) as total_dividendos,
  SUM(juros) as total_juros
FROM investments
GROUP BY ticker
ORDER BY ticker;
