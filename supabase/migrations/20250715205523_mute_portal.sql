/*
  # Sistema de Investimentos - Tabela Principal

  1. Nova Tabela
    - `investments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `ticker` (text, código do ativo)
      - `date` (date, data da operação)
      - `compra` (integer, quantidade comprada)
      - `venda` (integer, quantidade vendida)
      - `valor_unit` (decimal, valor unitário)
      - `dividendos` (decimal, valor dos dividendos)
      - `juros` (decimal, valor dos juros)
      - `observacoes` (text, observações)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilita RLS na tabela investments
    - Adiciona política para usuários autenticados acessarem apenas seus dados

  3. Índices
    - Índice composto para user_id e ticker para otimizar consultas
    - Índice para data para ordenação eficiente
*/

CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  date date NOT NULL,
  compra integer DEFAULT 0,
  venda integer DEFAULT 0,
  valor_unit decimal(10,2) DEFAULT 0,
  dividendos decimal(10,2) DEFAULT 0,
  juros decimal(10,2) DEFAULT 0,
  observacoes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados acessarem apenas seus dados
CREATE POLICY "Users can manage their own investments"
  ON investments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_investments_user_ticker ON investments(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();