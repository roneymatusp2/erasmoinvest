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
      console.warn('[ingest-news] Chave Gemini não encontrada, usando embedding zero');
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
      console.warn(`[ingest-news] Gemini API error: ${response.status}, usando embedding zero`);
      return Array(768).fill(0);
    }
    const result = await response.json();
    const embedding = result.embedding.values;
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[ingest-news] Resposta inválida do Gemini, usando embedding zero');
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
    console.error(`[ingest-news] Erro no embedding Gemini:`, error);
    return Array(768).fill(0);
  }
}

const GEMINI_API_KEY = Deno.env.get('Gemini-Embedding');
const NEWS_API_KEY = Deno.env.get('ErasmoInvest_NewsAPI');
const QWEN_API_KEY = Deno.env.get('QWEN_OPENROUTER_API');

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
const NEWS_API_URL = `https://newsapi.org/v2/top-headlines?country=br&category=business&apiKey=${NEWS_API_KEY}`;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function getRealNews() {
  console.log('Buscando notícias reais da NewsAPI...');
  const response = await fetch(NEWS_API_URL);
  if (!response.ok) {
    throw new Error(`Erro ao buscar notícias: ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`Encontrados ${data.articles.length} artigos.`);
  return data.articles.slice(0, 5); // Limitar a 5 notícias por execução para não exceder limites
}

async function analyzeNewsWithAI(article: any) {
  console.log(`Analisando notícia: "${article.title}"`);
  const analysisPrompt = `
    Analise o seguinte artigo de notícia e extraia as informações em formato JSON.

    Artigo:
    - Título: ${article.title}
    - Conteúdo: ${article.content || article.description}

    Extraia:
    1.  "sentiment": O sentimento geral do artigo (Positivo, Negativo, Neutro).
    2.  "entities": Uma lista de empresas, pessoas ou tickers mencionados (ex: ["Petrobras", "PETR4"]).
    3.  "summary": Um resumo conciso do artigo em uma frase.

    Retorne APENAS o objeto JSON.
  `;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({
            model: 'qwen/qwen3-32b-instruct',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro na análise de IA: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (_req)=>{
  const t0 = Date.now();
  try {
    console.log('[ingest-news] Iniciando coleta de notícias com embeddings Gemini...');
    // 1. Obter notícias reais
    const newsItems = await getRealNews();

    for (const newsItem of newsItems) {
      if (!newsItem.content) {
        console.log(`Pulando notícia sem conteúdo: "${newsItem.title}"`);
        continue;
      }

      console.log(`📰 Processando notícia real: "${newsItem.title}"`);

      // 2. Analisar notícia com IA
      const analysis = await analyzeNewsWithAI(newsItem);

      // 3. Gerar embedding para o conteúdo da notícia
      const embedding = await generateDocumentEmbedding(`${newsItem.title} - ${newsItem.content}`);

      // 4. Inserir a notícia e o embedding como nós no banco de dados
      const nodeId = `news_${new Date(newsItem.publishedAt).getTime()}`;
      const { data: newsNode, error: newsError } = await supabaseClient
        .from('knowledge_graph')
        .insert({
          node_id: nodeId,
          type: 'news_article',
          content: newsItem.title,
          metadata: {
            source: newsItem.source.name,
            url: newsItem.url,
            full_content: newsItem.content,
            published_at: newsItem.publishedAt,
            ...analysis, // Adiciona sentiment, entities, summary
          },
        })
        .select()
        .single();

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    // Inserir notícias no banco
    if (newsEntries.length > 0) {
      const { error: newsError } = await supabaseClient.from('news').insert(newsEntries);
      if (newsError) {
        console.error('[ingest-news] Erro ao inserir notícias:', newsError);
      } else {
        console.log(`[ingest-news] ${newsEntries.length} notícias inseridas com sucesso`);
      }
    }
    // Inserir nós no grafo
    if (nodeEntries.length > 0) {
      const { error: nodesError } = await supabaseClient.from('nodes').insert(nodeEntries);
      if (nodesError) {
        console.error('[ingest-news] Erro ao inserir nós:', nodesError);
      } else {
        console.log(`[ingest-news] ${nodeEntries.length} nós inseridos com embeddings Gemini`);
      }
    }
    // Limpar notícias antigas (manter apenas últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await supabaseClient.from('news').delete().lt('published_at', sevenDaysAgo.toISOString());
    // Limpar nós antigos de notícias
    await supabaseClient.from('nodes').delete().eq('type', 'news').lt('created_at', sevenDaysAgo.toISOString());
    // Registrar telemetria
    const latency = Date.now() - t0;
    await supabaseClient.from('agent_logs').insert({
      function_name: 'ingest-news-cron',
      latency_ms: latency,
      status_code: 200
    });
    return new Response(JSON.stringify({
      success: true,
      news_inserted: newsEntries.length,
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
    console.error('[ingest-news] Erro:', error);
    // Registrar erro na telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'ingest-news-cron',
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
