# Scripts de Diagnóstico e Correção

## Ordem de Execução

### 1. Diagnóstico Inicial
Execute primeiro o `check_investments_structure.sql` para entender a estrutura atual da tabela.

### 2. Teste de Cálculos
Execute `test_calculations.sql` para ver se os totais estão sendo calculados corretamente.

### 3. Debug Específico
Se um ticker específico está com problema (como BRBI11), execute `debug_brbi11.sql`.

### 4. Aplicar Correções
Escolha uma das migrations:
- `20250121000001_fix_valor_total.sql` - Principal, adiciona trigger
- `20250121000002_alternative_fix.sql` - Alternativa com views
- `20250121000003_simple_fix.sql` - Mais simples, sem alterar estrutura

## Problema Comum: valor_unit zerado

Se encontrar registros com `valor_unit = 0`, isso precisa ser corrigido manualmente:

```sql
-- Verificar registros com problema
SELECT ticker, date, compra, valor_unit, observacoes
FROM investments
WHERE compra > 0 AND (valor_unit IS NULL OR valor_unit = 0)
ORDER BY ticker, date;

-- Corrigir manualmente cada registro
UPDATE investments
SET valor_unit = 16.16  -- Substitua pelo valor correto
WHERE id = 'id-do-registro-aqui';
```

## Solução Temporária

Enquanto não corrige o banco, o frontend já está preparado para:
1. Detectar quando valor_total está zerado
2. Recalcular dinamicamente usando compra/venda × valor_unit
3. Exibir os valores corretos mesmo sem alteração no banco

## Verificação Final

Após aplicar as correções, verifique se funcionou:

```sql
SELECT 
    ticker,
    SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) as total_investido,
    SUM(dividendos + juros) as total_proventos,
    ROUND((SUM(dividendos + juros) / NULLIF(SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END), 0) * 100)::numeric, 2) as yield_percent
FROM investments
WHERE user_id = auth.uid()
GROUP BY ticker
HAVING SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) > 0
ORDER BY ticker;
```
