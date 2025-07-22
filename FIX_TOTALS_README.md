# Correção dos Totais de Investimento

## Problema
Os totais (Total Investido e Yield Total) aparecem como R$ 0,00 porque o campo `valor_total` não está sendo calculado corretamente no banco de dados.

## Estrutura Atual do Banco
A tabela `investments` usa a seguinte estrutura:
- `compra` (quantidade de cotas compradas)
- `venda` (quantidade de cotas vendidas)
- `valor_unit` (valor unitário da cota)
- `dividendos` (valor dos dividendos recebidos)
- `juros` (valor dos juros recebidos)

## Soluções

### Solução 1: Migration Automática
Execute a migration que adiciona o campo `valor_total` e cria trigger para cálculo automático:

```bash
supabase db push
```

Se der erro, tente a solução 2.

### Solução 2: Correção Manual via SQL Editor
1. Acesse o SQL Editor do Supabase
2. Execute primeiro o script de verificação (`check_investments_structure.sql`) para entender a estrutura atual
3. Execute a migration alternativa (`20250121000002_alternative_fix.sql`) que cria funções auxiliares

### Solução 3: Cálculo Direto (Sem Alteração de Estrutura)
Se preferir não alterar a estrutura do banco, o frontend já está configurado para calcular os valores dinamicamente. Esta solução funciona imediatamente sem necessidade de migrations.

### Solução 4: Atualização Manual dos Dados
Se as soluções anteriores não funcionarem, primeiro adicione a coluna:

```sql
-- Adicionar coluna se não existir
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(15,2) DEFAULT 0;

-- Atualizar registros de COMPRA
UPDATE investments
SET valor_total = compra * valor_unit
WHERE compra > 0 AND valor_unit > 0;

-- Atualizar registros de VENDA
UPDATE investments
SET valor_total = venda * valor_unit
WHERE venda > 0 AND valor_unit > 0;
```

## Verificação
Para verificar se funcionou, execute:

```sql
SELECT 
  ticker,
  SUM(CASE WHEN compra > 0 THEN compra * valor_unit ELSE 0 END) as total_investido,
  SUM(dividendos + juros) as total_proventos
FROM investments
WHERE user_id = auth.uid()
GROUP BY ticker;
```

## Correção Frontend
O frontend já foi corrigido para:
1. Sempre recalcular `valor_total` quando estiver 0
2. Converter corretamente entre a estrutura do banco e a estrutura de exibição
3. Manter alta precisão nos cálculos (7-10 casas decimais internamente)
4. Exibir sempre com 2 casas decimais para o usuário

## Resultado Esperado
Após as correções:
- **Total Investido**: Soma de (quantidade × valor_unitário) para todas as compras
- **Yield Total**: (Total de Proventos ÷ Total Investido) × 100
- **Total Proventos**: Soma de dividendos + juros
- **Posição Atual**: Soma de compras - vendas
