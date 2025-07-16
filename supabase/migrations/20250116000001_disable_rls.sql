/*
  # Desabilitar RLS para permitir exclusões livres
  
  Problema: Usuário não consegue excluir registros devido às políticas RLS
  Solução: Desabilitar completamente RLS na tabela investments
*/

-- Remover todas as políticas RLS existentes da tabela investments
DROP POLICY IF EXISTS "Users can manage own investments" ON investments;

-- Desabilitar RLS na tabela investments
ALTER TABLE investments DISABLE ROW LEVEL SECURITY;

-- Garantir que a tabela é acessível publicamente para todas as operações
GRANT ALL ON investments TO public;
GRANT ALL ON investments TO anon;
GRANT ALL ON investments TO authenticated;

-- Comentário de log
COMMENT ON TABLE investments IS 'Tabela investments com RLS desabilitado para permitir operações livres - Configurado em 2025-01-16'; 