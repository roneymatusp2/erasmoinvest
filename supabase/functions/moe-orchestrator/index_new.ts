/**
 * 🤖 MOE ORCHESTRATOR - VERSÃO MIGRADA
 * Orquestrador de Mixture of Experts usando Qwen3-30B (GRATUITO)
 * Substitui: OpenAI GPT-3.5 → Qwen3-30B-A3B (100% economia)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Cliente Supabase
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL'), 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * 🧠 CLIENTE QWEN3 PARA ROTEAMENTO DE EXPERTS
 * Substitui completamente o OpenAI GPT-3.5
 */
class QwenMoERouter {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private model: string = 'qwen/qwen3-30b-a3b'; // MoE: 30B parâmetros, 3B ativo

  constructor() {
    this.apiKey = Deno.env.get('QWEN_OPENROUTER_API');
    if (!this.apiKey) {
      throw new Error('QWEN_OPENROUTER_API key não configurada');
    }
  }

  /**
   * Selecionar expert usando Qwen3-30B
   */
  async selectExpert(query: string, experts: any[], context: any = {}): Promise<any> {
    try {
      const routingPrompt = `
Você é um roteador inteligente especializado em investimentos brasileiros.
Selecione o melhor especialista para responder a pergunta do usuário.

ESPECIALISTAS DISPONÍVEIS:
${experts.map(e => `- ${e.name}: ${e.description} (score: ${e.performance_score})`).join('\n')}

CONTEXTO DO USUÁRIO:
- Tem portfólio: ${context.hasPortfolio || false}
- Tipo de conta: ${context.accountType || 'padrão'}
- Histórico: ${context.queryHistory || 'primeira consulta'}
- Experiência: ${context.experience || 'iniciante'}

PERGUNTA: "${query}"

INSTRUÇÕES:
1. Analise a pergunta e o contexto
2. Considere a expertise e performance de cada especialista
3. Selecione o mais adequado com confiança de 0-100
4. Sugira 2 alternativas se aplicável

RESPONDA EM JSON VÁLIDO:
{
  "expert": "nome_do_expert_selecionado",
  "confidence": 85,
  "reasoning": "Explicação da escolha",
  "alternatives": ["expert2", "expert3"],
  "query_type": "portfolio|market|tax|news|general"
}`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://erasmoinvest.com',
          'X-Title': 'ErasmoInvest MoE Router'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um roteador de especialistas em investimentos. Responda SEMPRE em JSON válido.'
            },
            {
              role: 'user', 
              content: routingPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`Qwen3 API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta vazia do Qwen3');
      }

      let decision;
      try {
        decision = JSON.parse(content);
      } catch (parseError) {
        console.error('Erro ao parsear JSON do Qwen3:', content);
        throw new Error('Resposta inválida do modelo');
      }

      // Validar decisão
      const validExperts = experts.map(e => e.name);
      if (!validExperts.includes(decision.expert)) {
        // Fallback para o expert com melhor performance
        decision.expert = experts[0]?.name || 'portfolio_advisor';
        decision.confidence = 60;
        decision.reasoning = 'Fallback para expert com melhor performance';
      }

      return {
        expert: decision.expert,
        confidence: decision.confidence || 70,
        reasoning: decision.reasoning || 'Seleção automática',
        alternatives: decision.alternatives || [],
        query_type: decision.query_type || 'general',
        model_used: this.model,
        tokens_used: data.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error('[moe-router] Erro Qwen3:', error);
      
      // Fallback determinístico robusto
      return this.deterministicFallback(query, experts);
    }
  }

  /**
   * 🔄 Fallback determinístico baseado em palavras-chave
   */
  private deterministicFallback(query: string, experts: any[]): any {
    const queryLower = query.toLowerCase();
    const keywords = {
      tax_specialist: ['imposto', 'tribut', 'ir', 'taxa', 'deduç'],
      news_interpreter: ['notícia', 'news', 'mercado', 'economia', 'política'],
      portfolio_advisor: ['carteira', 'portfólio', 'investir', 'aplicar', 'diversificar'],
      market_analyst: ['preço', 'cotação', 'ação', 'fundo', 'vale', 'petr', 'itub'],
      risk_assessor: ['risco', 'volatilidade', 'perda', 'segur', 'conservador']
    };

    let bestMatch = { expert: 'portfolio_advisor', confidence: 50, matches: 0 };

    // Verificar correspondências de palavras-chave
    for (const [expertType, words] of Object.entries(keywords)) {
      const matches = words.filter(word => queryLower.includes(word)).length;
      if (matches > bestMatch.matches) {
        bestMatch = { expert: expertType, confidence: 60 + matches * 10, matches };
      }
    }

    // Verificar se o expert existe na lista
    const validExperts = experts.map(e => e.name);
    if (!validExperts.includes(bestMatch.expert)) {
      bestMatch.expert = experts[0]?.name || 'portfolio_advisor';
    }

    return {
      expert: bestMatch.expert,
      confidence: Math.min(bestMatch.confidence, 85),
      reasoning: 'Seleção por palavras-chave (fallback)',
      alternatives: validExperts.filter(e => e !== bestMatch.expert).slice(0, 2),
      query_type: 'general',
      model_used: 'fallback-deterministic',
      tokens_used: 0
    };
  }

  /**
   * 🎯 Executar expert selecionado usando Qwen3
   */
  async executeExpert(expertName: string, query: string, context: any = {}): Promise<any> {
    const t0 = Date.now();

    try {
      // Buscar configuração do expert
      const { data: expert } = await supabaseClient
        .from('moe_experts')
        .select('*')
        .eq('name', expertName)
        .single();

      if (!expert) {
        throw new Error(`Expert ${expertName} não encontrado`);
      }

      // Preparar prompt especializado para o expert
      const systemPrompt = `
Você é ${expert.description} especializado no mercado financeiro brasileiro.

SUAS CAPACIDADES:
${JSON.stringify(expert.capabilities, null, 2)}

ESTILO DE RESPOSTA: ${(expert.model_config as any)?.response_style || 'profissional e didático'}

INSTRUÇÕES ESPECÍFICAS:
- Foque no mercado brasileiro (B3, Bovespa, tickers nacionais)
- Use terminologia em português
- Seja prático e acionável
- Cite fontes quando relevante
- Considere o perfil de risco do usuário

CONTEXTO ADICIONAL:
${JSON.stringify(context, null, 2)}`;

      const userPrompt = `
PERGUNTA DO USUÁRIO: "${query}"

Por favor, forneça uma resposta completa, precisa e útil considerando:
1. Especificidades do mercado brasileiro
2. Contexto atual econômico
3. Perfil do usuário fornecido
4. Melhores práticas de investimento
`;

      // Chamar Qwen3 para executar o expert
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://erasmoinvest.com',
          'X-Title': `ErasmoInvest Expert: ${expertName}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: (expert.model_config as any)?.temperature || 0.5,
          max_tokens: (expert.model_config as any)?.max_tokens || 1500,
          top_p: 0.9,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Qwen3 Expert error: ${response.status}`);
      }

      const data = await response.json();
      const expertResponse = data.choices[0]?.message?.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      const latency = Date.now() - t0;

      if (!expertResponse) {
        throw new Error('Resposta vazia do expert');
      }

      return {
        response: expertResponse,
        expert: expertName,
        metadata: {
          model: this.model,
          tokens_used: tokensUsed,
          latency_ms: latency,
          confidence: expert.performance_score,
          cost_usd: 0, // Qwen3 é gratuito!
          expert_config: expert.model_config
        }
      };

    } catch (error) {
      console.error(`[moe-executor] Erro ao executar expert ${expertName}:`, error);
      
      // Fallback para resposta genérica
      return {
        response: `Desculpe, encontrei dificuldades técnicas ao processar sua consulta sobre "${query}". Por favor, tente reformular sua pergunta ou entre em contato com o suporte.`,
        expert: expertName,
        metadata: {
          model: 'fallback',
          tokens_used: 0,
          latency_ms: Date.now() - t0,
          confidence: 30,
          cost_usd: 0,
          error: error.message
        }
      };
    }
  }
}

/**
 * 📊 Atualizar performance do expert baseado em feedback
 */
async function updateExpertPerformance(expertName: string, feedback: any): Promise<void> {
  try {
    const { data: expert } = await supabaseClient
      .from('moe_experts')
      .select('performance_score')
      .eq('name', expertName)  
      .single();

    if (!expert) return;

    // Calcular novo score com pesos otimizados
    const weights = {
      quality: 0.4,    // Qualidade da resposta
      speed: 0.3,      // Velocidade de resposta  
      efficiency: 0.2, // Eficiência de tokens
      satisfaction: 0.1 // Satisfação do usuário
    };

    const qualityScore = (feedback.response_quality || 3) * 20; // 0-100
    const speedScore = Math.max(0, 100 - (feedback.response_time_ms || 2000) / 50);
    const efficiencyScore = Math.max(0, 100 - (feedback.tokens_used || 500) / 20);
    const satisfactionScore = (feedback.user_satisfaction || 3) * 20;

    const newMetric = 
      qualityScore * weights.quality +
      speedScore * weights.speed + 
      efficiencyScore * weights.efficiency +
      satisfactionScore * weights.satisfaction;

    // Média móvel exponencial (suavização)
    const alpha = 0.15; // Fator de aprendizado
    const newScore = expert.performance_score * (1 - alpha) + newMetric * alpha;

    await supabaseClient
      .from('moe_experts')
      .update({
        performance_score: Math.round(newScore * 100) / 100,
        updated_at: new Date().toISOString()
      })
      .eq('name', expertName);

    console.log(`[moe] Performance atualizada para ${expertName}: ${newScore.toFixed(2)}`);

  } catch (error) {
    console.error('[moe] Erro ao atualizar performance:', error);
  }
}

/**
 * 🚀 FUNÇÃO PRINCIPAL DO MOE ORCHESTRATOR
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const { query, userId, context = {} } = await req.json();

    if (!query) {
      throw new Error('Query é obrigatória');
    }

    console.log(`[moe] Nova requisição ${requestId}: "${query.substring(0, 50)}..."`);

    // Inicializar cliente Qwen3
    const qwenRouter = new QwenMoERouter();

    // Buscar experts ativos
    const { data: experts } = await supabaseClient
      .from('moe_experts')
      .select('*')
      .eq('is_active', true)
      .order('performance_score', { ascending: false });

    if (!experts || experts.length === 0) {
      throw new Error('Nenhum expert disponível');
    }

    // Selecionar expert usando Qwen3
    const routing = await qwenRouter.selectExpert(query, experts, context);
    console.log(`[moe] Expert selecionado: ${routing.expert} (confiança: ${routing.confidence}%)`);

    // Registrar decisão de roteamento
    await supabaseClient
      .from('moe_routing_decisions')
      .insert({
        request_id: requestId,
        query: query,
        query_type: routing.query_type,
        selected_expert: routing.expert,
        confidence_score: routing.confidence,
        alternative_experts: routing.alternatives,
        reasoning: routing.reasoning,
        model_used: routing.model_used
      });

    // Executar o expert selecionado
    let result;
    try {
      result = await qwenRouter.executeExpert(routing.expert, query, context);
    } catch (expertError) {
      // Tentar expert alternativo se disponível
      if (routing.alternatives.length > 0) {
        console.log(`[moe] Tentando expert alternativo: ${routing.alternatives[0]}`);
        result = await qwenRouter.executeExpert(routing.alternatives[0], query, context);
        result.metadata.fallback_used = true;
        result.metadata.fallback_reason = expertError.message;
      } else {
        throw expertError;
      }
    }

    // Registrar telemetria
    const totalLatency = Date.now() - t0;
    const totalTokens = (routing.tokens_used || 0) + (result.metadata.tokens_used || 0);

    await supabaseClient
      .from('agent_logs')
      .insert({
        function_name: 'moe-orchestrator',
        latency_ms: totalLatency,
        tokens_used: totalTokens,
        estimated_cost: 0, // Qwen3 é gratuito!
        status_code: 200,
        model_used: routing.model_used,
        expert_used: result.expert
      });

    // Registrar feedback inicial (será atualizado pelo usuário)
    const feedback = {
      response_quality: null,
      response_time_ms: totalLatency,
      tokens_used: totalTokens,
      user_satisfaction: null
    };

    const { data: feedbackRecord } = await supabaseClient
      .from('moe_feedback')
      .insert({
        routing_decision_id: requestId,
        expert_name: result.expert,
        ...feedback
      })
      .select()
      .single();

    // Resposta final
    const finalResponse = {
      ...result,
      request_id: requestId,
      feedback_id: feedbackRecord?.id,
      routing_info: {
        expert_used: result.expert,
        confidence: routing.confidence,
        alternatives: routing.alternatives,
        reasoning: routing.reasoning,
        query_type: routing.query_type
      },
      performance: {
        total_latency_ms: totalLatency,
        total_tokens: totalTokens,
        cost_usd: 0, // 100% gratuito!
        model_used: routing.model_used
      }
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[moe] Erro:', error);

    // Registrar erro na telemetria
    await supabaseClient
      .from('agent_logs')
      .insert({
        function_name: 'moe-orchestrator',
        latency_ms: Date.now() - t0,
        status_code: 500,
        error_message: error.message,
        estimated_cost: 0
      });

    return new Response(JSON.stringify({
      error: error.message,
      request_id: requestId,
      fallback_response: 'Desculpe, não consegui processar sua solicitação no momento. Nossa equipe foi notificada.',
      performance: {
        total_latency_ms: Date.now() - t0,
        total_tokens: 0,
        cost_usd: 0,
        model_used: 'error-fallback'
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});