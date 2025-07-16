/*
  # Setup completo do sistema de investimentos

  1. Tabelas principais
    - investments: armazena todas as operações de investimento
    - users: dados dos usuários (já existe no Supabase)
    
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas restritivas para acesso exclusivo
    - Validações de email autorizado
    
  3. Funções auxiliares
    - Validação de email autorizado
    - Criação automática de tabelas se necessário
*/

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de investimentos
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  date date NOT NULL,
  compra integer DEFAULT 0,
  venda integer DEFAULT 0,
  valor_unit numeric(10,2) DEFAULT 0,
  dividendos numeric(10,2) DEFAULT 0,
  juros numeric(10,2) DEFAULT 0,
  observacoes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_ticker ON investments(ticker);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);
CREATE INDEX IF NOT EXISTS idx_investments_user_ticker ON investments(user_id, ticker);

-- Habilitar RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Função para verificar email autorizado
CREATE OR REPLACE FUNCTION is_authorized_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email = 'erasmorusso@uol.com.br';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter email do usuário atual
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS text AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para investments
DROP POLICY IF EXISTS "Users can only access their own investments" ON investments;
CREATE POLICY "Users can only access their own investments"
ON investments FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND 
  is_authorized_email(current_user_email())
)
WITH CHECK (
  user_id = auth.uid() AND 
  is_authorized_email(current_user_email())
);

-- Política para permitir acesso anônimo apenas para usuário autorizado
DROP POLICY IF EXISTS "Allow authorized user access" ON investments;
CREATE POLICY "Allow authorized user access"
ON investments FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Função para criar tabela de investimentos se não existir
CREATE OR REPLACE FUNCTION create_investments_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Esta função é chamada pelo cliente se a tabela não existir
  -- Não faz nada porque a tabela já deve existir
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para o usuário autorizado (apenas se não existirem)
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Verificar se existe um usuário com email autorizado
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'erasmorusso@uol.com.br' LIMIT 1;
  
  -- Se usuário existe e não tem dados, inserir exemplos
  IF user_uuid IS NOT NULL THEN
    -- Verificar se já tem investimentos
    IF NOT EXISTS (SELECT 1 FROM investments WHERE user_id = user_uuid LIMIT 1) THEN
      -- Inserir alguns dados de exemplo
      INSERT INTO investments (user_id, ticker, date, compra, venda, valor_unit, dividendos, juros, observacoes)
      VALUES
        (user_uuid, 'ALZR11', '2023-01-15', 100, 0, 98.50, 14.85, 0, 'Compra inicial'),
        (user_uuid, 'ALZR11', '2023-02-20', 50, 0, 97.20, 23.10, 0, 'Aumento posição'),
        (user_uuid, 'ALZR11', '2023-03-18', 0, 0, 0, 22.50, 0, 'Dividendos mensais'),
        (user_uuid, 'BCIA11', '2023-01-10', 80, 0, 125.00, 0, 0, 'Compra inicial'),
        (user_uuid, 'BCIA11', '2023-02-15', 0, 0, 0, 90.00, 0, 'Dividendos'),
        (user_uuid, 'VALE3', '2023-01-08', 100, 0, 87.45, 0, 0, 'Posição inicial'),
        (user_uuid, 'VALE3', '2023-03-15', 0, 0, 0, 345.60, 0, 'Dividendos trimestrais');
    END IF;
  END IF;
END $$;