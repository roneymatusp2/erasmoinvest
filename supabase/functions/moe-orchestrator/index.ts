import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const QWEN_ROUTER_API_KEY = Deno.env.get('QWEN_OPENROUTER_API');
const QWEN_THINKING_API_KEY = Deno.env.get('QWEN_OPENROUTER_API_THINKING');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Função para classificar a query e selecionar o expert
async function selectExpert(query, context) {
  try {
    // Buscar experts ativos
    const { data: experts } = await supabaseClient.from('moe_experts').select('*').eq('is_active', true).order('performance_score', {
      ascending: false
    });
    if (!experts || experts.length === 0) {
      throw new Error('Nenhum expert disponível');
    }
    // Prompt para o modelo de roteamento
    const routingPrompt = `
Você é um roteador inteligente que seleciona o melhor especialista para responder uma pergunta.

Especialistas disponíveis:
${experts.map((e)=>`- ${e.name}: ${e.description}`).join('\n')}

Contexto do usuário:
- Tem portfólio: ${context.hasPortfolio}
- Tipo de conta: ${context.accountType || 'padrão'}
- Histórico: ${context.queryHistory || 'primeira consulta'}

Pergunta: "${query}"

Selecione o especialista mais adequado e forneça uma confiança de 0 a 100.
Retorne um JSON no formato: {"expert": "nome_do_expert", "confidence": 85, "alternatives": ["expert2", "expert3"]}
`;
    const routingApiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_ROUTER_API_KEY}`,
        'HTTP-Referer': 'https://erasmoinvest.com',
        'X-Title': 'ErasmoInvest',
      },
      body: JSON.stringify({
                model: "qwen/qwen3-32b-instruct",
        messages: [
          { role: "system", content: "Você é um roteador de IA que seleciona especialistas." },
          { role: "user", content: routingPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });
    if (!routingApiResponse.ok) {
        throw new Error(`OpenRouter API error (routing): ${routingApiResponse.statusText}`);
    }
    const routingResponse = await routingApiResponse.json();
    const decision = JSON.parse(routingResponse.choices[0].message?.content || '{}');
    // Validar a decisão
    const validExperts = experts.map((e)=>e.name);
    if (!validExperts.includes(decision.expert)) {
      // Fallback para o expert com melhor performance
      decision.expert = experts[0].name;
      decision.confidence = 60;
    }
    return {
      expert: decision.expert,
      confidence: decision.confidence || 70,
      alternatives: decision.alternatives || []
    };
  } catch (error) {
    console.error('[moe] Erro ao selecionar expert:', error);
    // Fallback determinístico baseado em palavras-chave
    const query_lower = query.toLowerCase();
    if (query_lower.includes('imposto') || query_lower.includes('tribut')) {
      return {
        expert: 'tax_specialist',
        confidence: 80,
        alternatives: []
      };
    } else if (query_lower.includes('notícia') || query_lower.includes('mercado')) {
      return {
        expert: 'news_interpreter',
        confidence: 75,
        alternatives: [
          'market_analyst'
        ]
      };
    } else if (query_lower.includes('carteira') || query_lower.includes('portfólio')) {
      return {
        expert: 'portfolio_advisor',
        confidence: 85,
        alternatives: []
      };
    } else if (query_lower.includes('preço') || query_lower.includes('cotação')) {
      return {
        expert: 'market_analyst',
        confidence: 90,
        alternatives: []
      };
    }
    return {
      expert: 'portfolio_advisor',
      confidence: 50,
      alternatives: [
        'market_analyst'
      ]
    };
  }
}
// Função para executar o expert selecionado
async function executeExpert(expertName, query, context) {
  const t0 = Date.now();
  try {
    // Buscar configuração do expert
    const { data: expert } = await supabaseClient.from('moe_experts').select('*').eq('name', expertName).single();
    if (!expert) throw new Error(`Expert ${expertName} não encontrado`);
    const modelConfig = expert.model_config;
    // Preparar prompt especializado
    const systemPrompt = `
Você é ${expert.description}.
Suas capacidades incluem: ${JSON.stringify(expert.capabilities)}.
Responda de forma ${modelConfig.response_style || 'profissional'} e focada.
`;
    // Coletar contexto relevante para o expert
    let expertContext = {
      ...context
    };
    // Adicionar contexto específico baseado no tipo de expert
    if (expertName === 'portfolio_advisor' && context.portfolioData) {
      expertContext.portfolio = context.portfolioData;
    } else if (expertName === 'market_analyst' && context.marketData) {
      expertContext.market = context.marketData;
    }
    // Executar o expert
    const expertApiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_THINKING_API_KEY}`,
          'HTTP-Referer': 'https://erasmoinvest.com',
          'X-Title': 'ErasmoInvest',
        },
        body: JSON.stringify({
          model: modelConfig.model || "qwen/qwen3-235b-a22b-thinking-2507",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Contexto: ${JSON.stringify(expertContext)}\n\nPergunta: ${query}` }
          ],
          temperature: modelConfig.temperature || 0.5,
          max_tokens: modelConfig.max_tokens || 1000
        })
    });
    if (!expertApiResponse.ok) {
        throw new Error(`OpenRouter API error (expert execution): ${expertApiResponse.statusText}`);
    }
    const completion = await expertApiResponse.json();
    const response = completion.choices[0].message?.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const latency = Date.now() - t0;
    return {
      response,
      expert: expertName,
      metadata: {
        model: modelConfig.model,
        tokens_used: tokensUsed,
        latency_ms: latency,
        confidence: expert.performance_score
      }
    };
  } catch (error) {
    console.error(`[moe] Erro ao executar expert ${expertName}:`, error);
    throw error;
  }
}
// Função para atualizar performance do expert
async function updateExpertPerformance(expertName, feedback) {
  try {
    const { data: expert } = await supabaseClient.from('moe_experts').select('performance_score').eq('name', expertName).single();
    if (!expert) return;
    // Calcular novo score baseado em feedback
    const qualityWeight = 0.4;
    const speedWeight = 0.3;
    const efficiencyWeight = 0.3;
    const qualityScore = (feedback.response_quality || 3) * 20;
    const speedScore = Math.max(0, 100 - feedback.response_time_ms / 50);
    const efficiencyScore = Math.max(0, 100 - feedback.tokens_used / 50);
    const newMetric = qualityScore * qualityWeight + speedScore * speedWeight + efficiencyScore * efficiencyWeight;
    // Média móvel exponencial
    const alpha = 0.1; // Fator de suavização
    const newScore = expert.performance_score * (1 - alpha) + newMetric * alpha;
    await supabaseClient.from('moe_experts').update({
      performance_score: Math.round(newScore * 100) / 100,
      updated_at: new Date().toISOString()
    }).eq('name', expertName);
  } catch (error) {
    console.error('[moe] Erro ao atualizar performance:', error);
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  try {
    const { query, userId, context = {} } = await req.json();
    if (!query) {
      throw new Error('Query é obrigatória');
    }

    // Usar user_id correto do sistema
    const fixedUserId = '4362da88-d01c-4ffe-a447-75751ea8e182';
    console.log(`[moe] Nova requisição ${requestId}: "${query.substring(0, 50)}..."`);
    // Selecionar o expert apropriado
    const routing = await selectExpert(query, context);
    console.log(`[moe] Expert selecionado: ${routing.expert} (confiança: ${routing.confidence}%)`);
    // Registrar decisão de roteamento
    await supabaseClient.from('moe_routing_decisions').insert({
      request_id: requestId,
      query: query,
      query_type: context.queryType || 'general',
      selected_expert: routing.expert,
      confidence_score: routing.confidence,
      alternative_experts: routing.alternatives
    });
    // Executar o expert
    let result;
    try {
      result = await executeExpert(routing.expert, query, context);
    } catch (expertError) {
      // Tentar expert alternativo se o principal falhar
      if (routing.alternatives.length > 0) {
        console.log(`[moe] Tentando expert alternativo: ${routing.alternatives[0]}`);
        result = await executeExpert(routing.alternatives[0], query, context);
        result.metadata.fallback_used = true;
      } else {
        throw expertError;
      }
    }
    // Registrar feedback inicial
    const feedback = {
      response_quality: null,
      response_time_ms: Date.now() - t0,
      tokens_used: result.metadata.tokens_used,
      user_satisfaction: null // Será preenchido pelo usuário
    };
    const { data: feedbackRecord } = await supabaseClient.from('moe_feedback').insert({
      routing_decision_id: requestId,
      expert_name: result.expert,
      ...feedback
    }).select().single();
    // Registrar telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'moe-orchestrator',
      latency_ms: Date.now() - t0,
      tokens_used: result.metadata.tokens_used,
      estimated_cost: result.metadata.tokens_used / 1000 * 0.002,
      status_code: 200
    });
    return new Response(JSON.stringify({
      ...result,
      request_id: requestId,
      feedback_id: feedbackRecord?.id,
      routing_info: {
        expert_used: result.expert,
        confidence: routing.confidence,
        alternatives: routing.alternatives
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[moe] Erro:', error);
    // Registrar erro na telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'moe-orchestrator',
      latency_ms: Date.now() - t0,
      status_code: 500,
      error_message: error.message
    });
    return new Response(JSON.stringify({
      error: error.message,
      request_id: requestId,
      fallback_response: 'Desculpe, não consegui processar sua solicitação no momento.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
