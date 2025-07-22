// /supabase/functions/sentinel-agent-cron/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { qwenClient } from '../commons/openrouter_client.ts';
import { generateEmbedding } from '../commons/embedding_service.ts';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const SYSTEM_PROMPT_SENTINEL = `Você é um analista financeiro sênior especializado em detectar oportunidades e riscos no mercado brasileiro. Você recebe dados sobre o portfólio atual, preços de mercado e notícias recentes.

Sua tarefa é:
1. Analisar os dados fornecidos
2. Identificar pelo menos 3 insights importantes (oportunidades, riscos, ou recomendações)
3. Retornar um objeto JSON com a seguinte estrutura:
{
  "insights": [
    {
      "type": "opportunity" | "risk" | "recommendation",
      "ticker": "TICKER_RELACIONADO" (se aplicável),
      "title": "Título conciso do insight",
      "description": "Descrição detalhada em português",
      "priority": "high" | "medium" | "low",
      "action_required": true | false
    }
  ]
}`;

serve(async (_req) => {
  console.log("Sentinel Agent iniciando análise proativa...");
  
  try {
    // 1. Coletar dados recentes do grafo
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Buscar notícias recentes
    const { data: recentNews } = await supabaseClient
      .from('nodes')
      .select('*')
      .eq('type', 'news_article')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    // Buscar dados de mercado atualizados
    const { data: marketData } = await supabaseClient
      .from('nodes')
      .select('*')
      .eq('type', 'ticker')
      .not('properties->regularMarketPrice', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20);

    // Buscar operações do portfólio
    const { data: portfolioOperations } = await supabaseClient
      .from('nodes')
      .select('*')
      .eq('type', 'portfolio_operation')
      .order('created_at', { ascending: false })
      .limit(20);

    // 2. Preparar contexto para o Sentinel
    const context = {
      recent_news: recentNews || [],
      market_data: marketData || [],
      portfolio_operations: portfolioOperations || [],
      analysis_timestamp: new Date().toISOString()
    };

    console.log("Contexto preparado. Enviando para análise do Sentinel...");

    // 3. Executar análise com o Sentinel
    const completion = await qwenClient.chat.completions.create({
      model: "qwen/qwen3-235b-a22b-07-25:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_SENTINEL },
        { role: "user", content: `Analise os seguintes dados e gere insights:\n\n${JSON.stringify(context, null, 2)}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const sentinelResponse = JSON.parse(completion.choices[0].message.content);
    console.log(`Sentinel gerou ${sentinelResponse.insights.length} insights`);

    // 4. Armazenar insights como nós no grafo
    for (const insight of sentinelResponse.insights) {
      try {
        const insightId = `insight:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const nodeText = `${insight.title}. ${insight.description}`;
        const embedding = await generateEmbedding(nodeText);

        await supabaseClient.from('nodes').insert({
          id: insightId,
          type: 'insight',
          label: insight.title,
          properties: {
            ...insight,
            generated_at: new Date().toISOString(),
            generated_by: 'sentinel-agent'
          },
          embedding: embedding,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Se o insight está relacionado a um ticker específico, criar aresta
        if (insight.ticker) {
          await supabaseClient.from('edges').insert({
            source_id: insightId,
            target_id: `ticker:${insight.ticker}`,
            label: 'relates_to'
          });
        }
      } catch (error) {
        console.error(`Erro ao salvar insight:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      insights_generated: sentinelResponse.insights.length,
      insights: sentinelResponse.insights
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Erro no Sentinel Agent:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});