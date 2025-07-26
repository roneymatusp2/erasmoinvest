import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const QWEN_THINKING_API_KEY = Deno.env.get('QWEN_OPENROUTER_API_THINKING');

serve(async (_req)=>{
  const t0 = Date.now();
  try {
    // Buscar o prompt mais recente do banco de dados
    const { data: promptData, error: promptError } = await supabaseClient.from('prompts').select('content, version').eq('name', 'sentinel_system_prompt').order('version', {
      ascending: false
    }).limit(1).single();
    if (promptError || !promptData) {
      throw new Error(`Falha ao buscar prompt do sentinela: ${promptError?.message}`);
    }
    const SYSTEM_PROMPT_SENTINEL = promptData.content;
    const promptVersion = promptData.version;
    console.log(`[sentinel-agent] Usando prompt versão ${promptVersion}`);
    // Coletar dados do portfólio
    const { data: portfolio, error: portfolioError } = await supabaseClient.from('investments').select('*').eq('is_active', true);
    if (portfolioError) throw portfolioError;
    // Coletar dados de mercado recentes
    const { data: marketData, error: marketError } = await supabaseClient.from('market_data').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', {
      ascending: false
    });
    if (marketError) throw marketError;
    // Coletar notícias recentes
    const { data: news, error: newsError } = await supabaseClient.from('news').select('*').gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('published_at', {
      ascending: false
    }).limit(10);
    if (newsError) throw newsError;
    // Preparar contexto para o LLM
    const context = {
      portfolio: portfolio || [],
      marketData: marketData || [],
      recentNews: news || []
    };
    // Chamar o LLM para análise
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_THINKING_API_KEY}`,
        'HTTP-Referer': 'https://erasmoinvest.com',
        'X-Title': 'ErasmoInvest',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b-thinking-2507',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT_SENTINEL
          },
          {
            role: 'user',
            content: `Analise os seguintes dados e forneça insights:\n\n${JSON.stringify(context, null, 2)}`
          }
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const llmResponse = await response.json();
    const insights = JSON.parse(llmResponse.choices[0].message.content);
    // Salvar insights no banco
    if (insights.insights && Array.isArray(insights.insights)) {
      for (const insight of insights.insights){
        await supabaseClient.from('insights').insert({
          type: insight.type,
          ticker: insight.ticker,
          title: insight.title,
          description: insight.description,
          priority: insight.priority,
          action_required: insight.action_required,
          source: 'sentinel-agent'
        });
      }
    }
    // Registrar telemetria
    const latency = Date.now() - t0;
    const tokensUsed = llmResponse.usage?.total_tokens || 0;
    const estimatedCost = tokensUsed / 1000 * 0.01;
    await supabaseClient.from('agent_logs').insert({
      function_name: 'sentinel-agent-cron',
      latency_ms: latency,
      prompt_version: promptVersion,
      tokens_used: tokensUsed,
      estimated_cost: estimatedCost,
      status_code: 200
    });
    console.log(`[sentinel-agent] Executado com sucesso em ${latency}ms`);
    return new Response(JSON.stringify({
      success: true,
      insights_count: insights.insights?.length || 0,
      latency_ms: latency
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("[sentinel-agent] Erro:", error);
    // Registrar erro na telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'sentinel-agent-cron',
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
