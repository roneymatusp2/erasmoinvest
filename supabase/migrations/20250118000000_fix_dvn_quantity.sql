-- 🔧 CORREÇÃO: Ajustar quantidade do DVN que está com valor errado (27.467930)
-- O valor correto provavelmente é 27 ou 28 ações

-- Primeiro, vamos verificar os dados atuais do DVN
DO $$
DECLARE
  v_user_id UUID := '4362da88-d01c-4ffe-a447-75751ea8e182';
  v_total_compra NUMERIC;
  v_total_venda NUMERIC;
  v_saldo_atual NUMERIC;
BEGIN
  -- Calcular totais atuais
  SELECT 
    COALESCE(SUM(compra), 0),
    COALESCE(SUM(venda), 0),
    COALESCE(SUM(compra), 0) - COALESCE(SUM(venda), 0)
  INTO v_total_compra, v_total_venda, v_saldo_atual
  FROM investments
  WHERE ticker = 'DVN' AND user_id = v_user_id;
  
  RAISE NOTICE 'DVN - Situação atual: Compras=%, Vendas=%, Saldo=%', 
    v_total_compra, v_total_venda, v_saldo_atual;
  
  -- Se o saldo está muito alto (mais de 1000 ações), provavelmente é erro de decimal
  IF v_saldo_atual > 1000 THEN
    RAISE NOTICE 'ERRO DETECTADO: Saldo muito alto para DVN (%). Corrigindo...', v_saldo_atual;
    
    -- Atualizar as compras dividindo por 1000 (erro de decimal)
    UPDATE investments
    SET 
      compra = ROUND(compra / 1000, 6),
      updated_at = NOW()
    WHERE 
      ticker = 'DVN' 
      AND user_id = v_user_id
      AND compra > 1000;
    
    -- Recalcular o saldo
    SELECT 
      COALESCE(SUM(compra), 0) - COALESCE(SUM(venda), 0)
    INTO v_saldo_atual
    FROM investments
    WHERE ticker = 'DVN' AND user_id = v_user_id;
    
    RAISE NOTICE 'DVN - Saldo corrigido: %', v_saldo_atual;
  END IF;
END $$;

-- Verificar e corrigir outros ativos com possíveis problemas de quantidade
-- (mais de 10.000 unidades, exceto Tesouro Direto)
UPDATE investments
SET 
  compra = CASE 
    WHEN compra > 10000 AND NOT ticker LIKE 'TESOURO_%' THEN ROUND(compra / 1000, 6)
    ELSE compra
  END,
  venda = CASE 
    WHEN venda > 10000 AND NOT ticker LIKE 'TESOURO_%' THEN ROUND(venda / 1000, 6)
    ELSE venda
  END,
  updated_at = NOW()
WHERE 
  user_id = '4362da88-d01c-4ffe-a447-75751ea8e182'
  AND (compra > 10000 OR venda > 10000)
  AND NOT ticker LIKE 'TESOURO_%';

-- Adicionar comentário para documentar a correção
COMMENT ON TABLE investments IS 'Tabela de investimentos - Correção aplicada em 18/01/2025 para ajustar quantidades com erro de decimal'; 