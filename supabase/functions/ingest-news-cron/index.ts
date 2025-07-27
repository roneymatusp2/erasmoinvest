import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função de embedding Gemini para documentos inline
async function generateDocumentEmbedding(text: string): Promise<number[]> {
  try {
    const GEMINI_API_KEY = Deno.env.get('Gemini_Embedding');
    if (!GEMINI_API_KEY) {
      console.warn('[ingest-news] Chave Gemini não encontrada, usando embedding zero');
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
      console.warn(`[ingest-news] Gemini API error: ${response.status}, usando embedding zero`);
      return Array(768).fill(0);
    }
    const result = await response.json();
    const embedding = result.embedding?.values;
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[ingest-news] Resposta inválida do Gemini, usando embedding zero');
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
    console.error(`[ingest-news] Erro no embedding Gemini:`, error);
    return Array(768).fill(0);
  }
}

const NEWS_API_KEY = Deno.env.get('ErasmoInvest_NewsAPI');
const QWEN_API_KEY = Deno.env.get('QWEN_OPENROUTER_API');
const NEWS_API_URL = `https://newsapi.org/v2/everything?q=economia%20OR%20investimentos%20OR%20finan%C3%A7as&language=pt&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function getRealNews() {
  console.log('Buscando notícias reais da NewsAPI com query robusta...');
  const response = await fetch(NEWS_API_URL);
  if (!response.ok) {
    throw new Error(`Erro ao buscar notícias: ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`Encontrados ${data.articles.length} artigos.`);
  return data.articles.slice(0, 5); // Limitar a 5 notícias por execução
}

// FUNÇÃO CORRIGIDA E ROBUSTA
async function analyzeNewsWithAI(article: any) {
  console.log(`Analisando: "${article.title}"`);
  // 1. Limpar e preparar o conteúdo para evitar erros de JSON
  const cleanContent = (article.content || article.description || '').replace(/["\n\r]/g, ' ').substring(0, 500);

  // 2. Prompt mais claro e explícito
  const analysisPrompt = `
    Analyze the following news article content. Respond with ONLY a valid JSON object.
    Content: "${cleanContent}"
    
    Provide this exact JSON structure:
    {
      "sentiment": "<Positive, Negative, or Neutral>",
      "entities": ["<Company or Ticker 1>", "<Company or Ticker 2>"],
      "summary": "<A concise one-sentence summary>"
    }
  `;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
      body: JSON.stringify({
        model: 'qwen/qwen3-30b-a3b', // MODELO CORRIGIDO AQUI
        messages: [{ role: 'user', content: analysisPrompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`AI analysis failed with status ${response.status}. Using fallback.`);
      throw new Error('AI analysis failed');
    }
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    // 3. Fallback de segurança: se a IA falhar, não interrompe o processo
    console.error('AI analysis fallback triggered:', error.message);
    return {
      sentiment: 'Neutral',
      entities: [],
      summary: 'AI analysis was not available for this article.'
    };
  }
}

serve(async (_req) => {
  const t0 = Date.now();
  try {
    const newsItems = await getRealNews();

    if (newsItems.length === 0) {
        console.log('[ingest-news] Nenhum artigo encontrado. Encerrando a execução.');
        return new Response(JSON.stringify({ success: true, message: "No new articles to process." }), { headers: corsHeaders });
    }

    const newsEntries: any[] = [];
    const nodeEntries: any[] = [];

    for (const newsItem of newsItems) {
      if (!newsItem.content) {
        console.log(`Pulando notícia sem conteúdo: "${newsItem.title}"`);
        continue;
      }

      console.log(`📰 Processando notícia: "${newsItem.title}"`);
      const analysis = await analyzeNewsWithAI(newsItem);
      const embedding = await generateDocumentEmbedding(`${newsItem.title} - ${newsItem.content}`);

      newsEntries.push({
        title: newsItem.title,
        source: newsItem.source.name,
        url: newsItem.url,
        content: newsItem.content,
        published_at: newsItem.publishedAt,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
      });

      nodeEntries.push({
        id: `news_${new Date(newsItem.publishedAt).getTime()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'news',
        label: `Notícia: ${newsItem.title.substring(0, 60)}...`,
        properties: { ...analysis, source: newsItem.source.name, url: newsItem.url },
        embedding: embedding,
      });
    }

    if (newsEntries.length > 0) {
      const { error } = await supabaseClient.from('news').insert(newsEntries);
      if (error) throw new Error(`DB insert (news) error: ${error.message}`);
    }

    if (nodeEntries.length > 0) {
      const { error } = await supabaseClient.from('nodes').insert(nodeEntries);
      if (error) throw new Error(`DB insert (nodes) error: ${error.message}`);
    }

    await supabaseClient.from('agent_logs').insert({ function_name: 'ingest-news-cron', latency_ms: Date.now() - t0, status_code: 200 });

    return new Response(JSON.stringify({ success: true, news_inserted: newsEntries.length, nodes_inserted: nodeEntries.length }), { headers: corsHeaders });

  } catch (error) {
    console.error('[ingest-news] CRITICAL ERROR:', error);
    await supabaseClient.from('agent_logs').insert({ function_name: 'ingest-news-cron', latency_ms: Date.now() - t0, status_code: 500, error_message: error.message });
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});