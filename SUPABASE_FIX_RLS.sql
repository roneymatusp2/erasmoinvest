-- ===================================================
-- SCRIPT PARA DESABILITAR RLS - ERASMO INVEST
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ===================================================

-- 1. Ver políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'investments';

-- 2. Remover todas as políticas RLS da tabela investments
DROP POLICY IF EXISTS "Users can manage own investments" ON investments;
DROP POLICY IF EXISTS "Public read access for investments" ON investments;
DROP POLICY IF EXISTS "Authenticated users can manage investments" ON investments;

-- 3. Desabilitar RLS completamente
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;

-- 4. Garantir permissões públicas
GRANT ALL ON investments TO public;
GRANT ALL ON investments TO anon;
GRANT ALL ON investments TO authenticated;

-- 5. Verificar se RLS foi desabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasoids
FROM pg_tables 
WHERE tablename = 'investments';

-- 6. Testar exclusão (opcional - descomente para testar)
-- DELETE FROM investments WHERE ticker = 'BBAS3' AND quantidade = 1 LIMIT 1;

-- 7. Verificar total de registros
SELECT 
    ticker,
    COUNT(*) as total_registros,
    SUM(quantidade) as total_cotas
FROM investments 
WHERE ticker = 'BBAS3'
GROUP BY ticker;

COMMENT ON TABLE investments IS 'RLS DESABILITADO - Permite exclusões livres - ' || now(); 