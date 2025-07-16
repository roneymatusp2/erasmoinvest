/*
  # Configuração de Autenticação para Erasmo Russo

  1. Configurações de Segurança
    - Permite apenas o email erasmorusso@uol.com.br
    - Configura RLS adequadamente
    - Cria triggers para validação
  
  2. Tabelas necessárias
    - Profiles com validação de email
    - Investments com RLS
    - Configurações de segurança
*/

-- Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para profiles - apenas o usuário autorizado
CREATE POLICY "Apenas Erasmo pode acessar profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (email = 'erasmorusso@uol.com.br')
  WITH CHECK (email = 'erasmorusso@uol.com.br');

-- Criar tabela investments se não existir
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Habilitar RLS para investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Política para investments - apenas o usuário autorizado
CREATE POLICY "Apenas Erasmo pode acessar investments"
  ON investments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'erasmorusso@uol.com.br'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'erasmorusso@uol.com.br'
    )
  );

-- Função para validar email autorizado
CREATE OR REPLACE FUNCTION validate_authorized_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email != 'erasmorusso@uol.com.br' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas erasmorusso@uol.com.br pode usar este sistema.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar email no signup
CREATE OR REPLACE TRIGGER validate_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_authorized_email();

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em investments
CREATE OR REPLACE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_ticker ON investments(ticker);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'erasmorusso@uol.com.br' THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, 'Erasmo Russo', 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Permitir acesso anônimo para verificação de conexão
CREATE POLICY "Permitir verificação de conexão"
  ON investments
  FOR SELECT
  TO anon
  USING (false);