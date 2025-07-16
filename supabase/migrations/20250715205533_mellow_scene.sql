/*
  # Perfil de Usuário Restrito

  1. Política de Segurança
    - Apenas o email erasmorusso@uol.com.br pode se registrar
    - Função para validar email durante signup

  2. Configuração
    - Desabilita confirmação de email
    - Configura políticas de acesso restrito
*/

-- Função para validar email autorizado
CREATE OR REPLACE FUNCTION is_authorized_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email = 'erasmorusso@uol.com.br';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para validar email durante signup
CREATE OR REPLACE FUNCTION validate_authorized_signup()
RETURNS trigger AS $$
BEGIN
  IF NOT is_authorized_email(NEW.email) THEN
    RAISE EXCEPTION 'Email não autorizado para acesso ao sistema';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger na tabela auth.users
CREATE TRIGGER ensure_authorized_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_authorized_signup();

-- Política adicional para garantir acesso apenas ao usuário autorizado
CREATE POLICY "Only authorized user can access"
  ON investments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = 'erasmorusso@uol.com.br'
    )
  );