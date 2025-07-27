import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Função de embedding Gemini (copiada e adaptada para ser autónoma)
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const GEMINI_API_KEY = Deno.env.get('Gemini_Embedding');
    if (!GEMINI_API_KEY) {
      console.warn('[ingest-portfolio] Chave Gemini não encontrada, usando embedding zero');
      return Array(768).fill(0);
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768
      }),
    });
    if (!response.ok) {
      console.warn(`[ingest-portfolio] Gemini API error: ${response.status}, usando embedding zero`);
      return Array(768).fill(0);
    }
    const result = await response.json();
    const embedding = result.embedding?.values;
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[ingest-portfolio] Resposta inválida do Gemini, usando embedding zero');
      return Array(768).fill(0);
    }
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return Array(768).fill(0);
    const normalizedEmbedding = embedding.map((val) => val / norm);
    if (normalizedEmbedding.length !== 768) {
        return [...normalizedEmbedding, ...Array(768 - normalizedEmbedding.length).fill(0)];
    }
    return normalizedEmbedding;
  } catch (error) {
    console.error(`[ingest-portfolio] Erro no embedding Gemini:`, error);
    return Array(768).fill(0);
  }
}

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
      // Verifique se a tabela 'edges' existe e se a RLS permite a inserção
      const { error: edgeError } = await supabaseClient.from('edges').insert({
        source_id: `portfolio_operation:${record.id}`,
        target_id: `ticker:${record.ticker}`,
        label: 'refers_to'
      });

      if (edgeError) {
        console.error(`Erro ao inserir aresta em 'edges': ${edgeError.message}`);
        // Não lançar erro fatal aqui para não impedir o processamento do nó
      }

      console.log(`Operação ${record.id} processada e adicionada ao grafo.`);
    } catch (error) {
      console.error(`Erro ao processar operação ${record.id}:`, error);
    }
  }

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
});
