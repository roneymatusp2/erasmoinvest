-- SCRIPT DE DIAGNÓSTICO DO PROBLEMA SQL

-- 1. Verificar se a função existe
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_investments_by_user_id';

-- 2. Testar a função diretamente
SELECT * FROM get_investments_by_user_id('4362da88-d01c-4ffe-a447-75751ea8e182');

-- 3. Se a função acima falhar, tente esta versão simplificada
SELECT * FROM get_investments_by_user_id('4362da88-d01c-4ffe-a447-75751ea8e182'::uuid);

-- 4. Verificar a estrutura da tabela investments
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'investments' 
ORDER BY ordinal_position;

-- 5. Verificar se existem dados para o usuário
SELECT COUNT(*), COUNT(DISTINCT ticker) as tickers
FROM investments 
WHERE user_id = '4362da88-d01c-4ffe-a447-75751ea8e182';

-- 6. Ver amostra dos dados
SELECT ticker, date, compra, venda, valor_unit, dividendos
FROM investments 
WHERE user_id = '4362da88-d01c-4ffe-a447-75751ea8e182'
LIMIT 10;