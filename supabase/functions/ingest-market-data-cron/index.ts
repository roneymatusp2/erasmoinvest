import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Função de embedding Gemini para documentos inline
async function generateDocumentEmbedding(text) {
  try {
    const GEMINI_API_KEY = Deno.env.get('Gemini-Embedding');
    if (!GEMINI_API_KEY) {
      console.warn('[ingest-market] Chave Gemini não encontrada, usando embedding zero');
      return Array(768).fill(0);
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: {
          parts: [
            {
              text
            }
          ]
        },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768
      })
    });
    if (!response.ok) {
      console.warn(`[ingest-market] Gemini API error: ${response.status}, usando embedding zero`);
      return Array(768).fill(0);
    }
    const result = await response.json();
    const embedding = result.embedding.values;
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[ingest-market] Resposta inválida do Gemini, usando embedding zero');
      return Array(768).fill(0);
    }
    // Normalização
    const norm = Math.sqrt(embedding.reduce((sum, val)=>sum + val * val, 0));
    if (norm === 0) return Array(768).fill(0);
    const normalizedEmbedding = embedding.map((val)=>val / norm);
    // Garantir 768 dimensões
    if (normalizedEmbedding.length !== 768) {
      if (normalizedEmbedding.length > 768) {
        return normalizedEmbedding.slice(0, 768);
      } else {
        return [
          ...normalizedEmbedding,
          ...Array(768 - normalizedEmbedding.length).fill(0)
        ];
      }
    }
    return normalizedEmbedding;
  } catch (error) {
    console.error(`[ingest-market] Erro no embedding Gemini:`, error);
    return Array(768).fill(0);
  }
}
// Tickers principais do mercado brasileiro
const MAIN_TICKERS = [
  'PETR4',
  'VALE3',
  'ITUB4',
  'BBDC4',
  'ABEV3',
  'BBAS3',
  'WEGE3',
  'RENT3',
  'SUZB3',
  'LREN3',
  'MGLU3',
  'JBSS3',
  'B3SA3',
  'HAPV3',
  'RAIL3',
  'CCRO3'
];
// Simular dados de mercado (em produção, usar API real como Alpha Vantage, Yahoo Finance, etc.)
function generateMarketData(ticker) {
  const basePrice = Math.random() * 100 + 10;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = change / basePrice * 100;
  return {
    ticker,
    price: Number((basePrice + change).toFixed(2)),
    volume: Math.floor(Math.random() * 10000000) + 100000,
    market_cap: Number((basePrice * Math.random() * 1000000000).toFixed(2)),
    pe_ratio: Number((Math.random() * 25 + 5).toFixed(2)),
    dividend_yield: Number((Math.random() * 0.08).toFixed(4)),
    price_change_24h: Number(change.toFixed(4)),
    price_change_percent_24h: Number(changePercent.toFixed(2)),
    data_source: 'simulated'
  };
}
serve(async (_req)=>{
  const t0 = Date.now();
  try {
    console.log('[ingest-market] Iniciando coleta de dados de mercado com embeddings Gemini...');
    // Coletar dados únicos do portfólio
    const { data: investments } = await supabaseClient.from('investments').select('ticker').eq('is_active', true);
    const portfolioTickers = [
      ...new Set(investments?.map((inv)=>inv.ticker.replace('.SA', '')) || [])
    ];
    // Combinar com tickers principais
    const allTickers = [
      ...new Set([
        ...MAIN_TICKERS,
        ...portfolioTickers
      ])
    ];
    console.log(`[ingest-market] Coletando dados para ${allTickers.length} tickers`);
    const marketDataEntries = [];
    const nodeEntries = [];
    // Gerar/coletar dados para cada ticker
    for (const ticker of allTickers){
      try {
        const marketData = generateMarketData(ticker);
        marketDataEntries.push(marketData);
        // Criar nó no grafo de conhecimento com embedding Gemini
        const nodeText = `Ação ${ticker} está cotada a R$ ${marketData.price} com variação de ${marketData.price_change_percent_24h}% nas últimas 24 horas. Volume negociado: ${marketData.volume.toLocaleString()} ações. Market cap: R$ ${marketData.market_cap.toLocaleString()}. P/E ratio: ${marketData.pe_ratio}. Dividend yield: ${(marketData.dividend_yield * 100).toFixed(2)}%.`;
        console.log(`[ingest-market] Gerando embedding para: ${ticker}`);
        const embedding = await generateDocumentEmbedding(nodeText);
        const nodeId = `market_${ticker}_${Date.now()}`;
        nodeEntries.push({
          id: nodeId,
          type: 'market_data',
          label: `Cotação ${ticker}`,
          properties: {
            ticker: ticker,
            price: marketData.price,
            volume: marketData.volume,
            market_cap: marketData.market_cap,
            pe_ratio: marketData.pe_ratio,
            dividend_yield: marketData.dividend_yield,
            price_change_24h: marketData.price_change_24h,
            price_change_percent_24h: marketData.price_change_percent_24h,
            data_source: marketData.data_source,
            embedding_model: 'gemini-embedding-001',
            node_type: 'financial_ticker'
          },
          embedding: embedding,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (error) {
        console.error(`[ingest-market] Erro ao coletar ${ticker}:`, error);
      }
    }
    // Inserir dados no banco
    if (marketDataEntries.length > 0) {
      const { error: marketError } = await supabaseClient.from('market_data').insert(marketDataEntries);
      if (marketError) {
        console.error('[ingest-market] Erro ao inserir dados de mercado:', marketError);
      } else {
        console.log(`[ingest-market] ${marketDataEntries.length} entradas de mercado inseridas`);
      }
    }
    // Inserir nós no grafo
    if (nodeEntries.length > 0) {
      const { error: nodesError } = await supabaseClient.from('nodes').insert(nodeEntries);
      if (nodesError) {
        console.error('[ingest-market] Erro ao inserir nós:', nodesError);
      } else {
        console.log(`[ingest-market] ${nodeEntries.length} nós inseridos com embeddings Gemini`);
      }
    }
    // Limpar dados antigos (manter apenas últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await supabaseClient.from('market_data').delete().lt('created_at', thirtyDaysAgo.toISOString());
    // Limpar nós antigos de market data
    await supabaseClient.from('nodes').delete().eq('type', 'market_data').lt('created_at', thirtyDaysAgo.toISOString());
    // Registrar telemetria
    const latency = Date.now() - t0;
    await supabaseClient.from('agent_logs').insert({
      function_name: 'ingest-market-data-cron',
      latency_ms: latency,
      status_code: 200
    });
    return new Response(JSON.stringify({
      success: true,
      tickers_processed: allTickers.length,
      market_entries_inserted: marketDataEntries.length,
      nodes_inserted: nodeEntries.length,
      embedding_engine: 'gemini-embedding-001',
      latency_ms: latency
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[ingest-market] Erro:', error);
    // Registrar erro na telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'ingest-market-data-cron',
      latency_ms: Date.now() - t0,
      status_code: 500,
      error_message: error.message
    });
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
