// /supabase/functions/ingest-portfolio-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { generateEmbedding } from '../commons/embedding_service.ts';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  const payload = await req.json();
  console.log("Portfolio webhook acionado:", payload);

  // Processar cada operação alterada
  if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
    const record = payload.record;
    
    try {
      // Criar nó para a operação de portfolio
      const nodeText = `Investimento em ${record.ticker}: ${record.quantidade} unidades a R$ ${record.preco_medio}`;
      const embedding = await generateEmbedding(nodeText);

      await supabaseClient.from('nodes').upsert({
        id: `portfolio_operation:${record.id}`,
        type: 'portfolio_operation',
        label: `${record.ticker} - ${record.quantidade} unidades`,
        properties: {
          ticker: record.ticker,
          quantidade: record.quantidade,
          preco_medio: record.preco_medio,
          valor_total: record.valor_total,
          asset_type: record.asset_type,
          data_compra: record.data_compra,
          user_id: record.user_id
        },
        embedding: embedding,
        updated_at: new Date().toISOString()
      });

      // Garantir que existe um nó para o ticker
      await supabaseClient.from('nodes').upsert({
        id: `ticker:${record.ticker}`,
        type: 'ticker',
        label: record.ticker,
        updated_at: new Date().toISOString()
      });

      // Criar aresta entre a operação e o ticker
      await supabaseClient.from('edges').insert({
        source_id: `portfolio_operation:${record.id}`,
        target_id: `ticker:${record.ticker}`,
        label: 'refers_to'
      });

      console.log(`Operação ${record.id} processada e adicionada ao grafo.`);
    } catch (error) {
      console.error(`Erro ao processar operação ${record.id}:`, error);
    }
  }

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
});
