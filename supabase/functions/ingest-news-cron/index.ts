// /supabase/functions/ingest-news-cron/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { gemmaClient } from '../commons/openrouter_client.ts';
import { generateEmbedding } from '../commons/embedding_service.ts';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const SYSTEM_PROMPT_NER = `Você é um especialista em análise do mercado financeiro brasileiro. Sua tarefa é extrair entidades de um texto de notícia e retornar APENAS um objeto JSON. O JSON deve ter as chaves "tickers" (um array de strings com os tickers B3 mencionados), "sentiment" (uma string: "positivo", "negativo" ou "neutro") e "summary" (um resumo conciso de uma frase em português).`;

serve(async (_req) => {
  console.log("Iniciando ingestão de notícias...");
  
  // 1. Buscar notícias (ex: NewsAPI)
  const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=ibovespa&language=pt&apiKey=${Deno.env.get('ErasmoInvest_NewsAPI')}`);
  const newsData = await newsResponse.json();
  const articles = newsData.articles.slice(0, 5); // Limita a 5 artigos por execução

  for (const article of articles) {
    try {
      // 2. Usar Gemma 27B para extrair entidades
      const completion = await gemmaClient.chat.completions.create({
        model: "google/gemma-3-27b-it:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_NER },
          { role: "user", content: `${article.title}\n\n${article.content || article.description}` }
        ],
        temperature: 0.0,
        response_format: { type: "json_object" }
      });

      const entities = JSON.parse(completion.choices[0].message.content);
      console.log(`Entidades extraídas para "${article.title}":`, entities);

      // 3. Salvar a notícia como um nó no grafo
      const nodeText = `${article.title}. ${entities.summary}`;
      const embedding = await generateEmbedding(nodeText);

      await supabaseClient.from('nodes').upsert({
        id: `news:${article.url}`,
        type: 'news_article',
        label: article.title,
        properties: { ...article, ...entities },
        embedding: embedding,
        updated_at: new Date().toISOString()
      });

      // 4. Criar arestas entre a notícia e os tickers
      for (const ticker of entities.tickers) {
        await supabaseClient.from('nodes').upsert({ id: `ticker:${ticker}`, type: 'ticker', label: ticker, updated_at: new Date().toISOString() });
        await supabaseClient.from('edges').insert({
          source_id: `news:${article.url}`,
          target_id: `ticker:${ticker}`,
          label: 'mentions'
        });
      }
    } catch (error) {
      console.error(`Erro ao processar o artigo "${article.title}":`, error);
    }
  }

  return new Response(JSON.stringify({ success: true, message: `${articles.length} artigos processados.` }), { headers: { "Content-Type": "application/json" } });
});
