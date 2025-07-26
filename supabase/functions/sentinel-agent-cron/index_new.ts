/**
 * 🛡️ SENTINEL AGENT CRON - VERSÃO MIGRADA
 * Agente de monitoramento e análise automática usando Qwen3-235B (GRATUITO)
 * Substitui: OpenAI GPT-4 → Qwen3-235B-A22B-Thinking-2507 (100% economia)
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
 * 🧠 CLIENTE QWEN3 PARA ANÁLISE SENTINEL
 * Substitui completamente o OpenAI GPT-4
 */
class QwenSentinelAnalyzer {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private model: string = 'qwen/qwen3-235b-a22b-2507';
  private thinkingModel: string = 'qwen/qwen3-235b-a22b-thinking-2507'; // Para análises complexas

  constructor() {
    // Usar chave específica para análises complexas se disponível
    this.apiKey = Deno.env.get('QWEN_OPENROUTER_API_THINKING') || Deno.env.get('QWEN_OPENROUTER_API');
    
    if (!this.apiKey) {
      throw new Error('QWEN_OPENROUTER_API key não configurada');
    }
  }

  /**
   * 🔍 Análise profunda de mercado e portfólio
   */
  async analyzeMarketAndPortfolio(context: any, systemPrompt: string): Promise<any> {
    try {
      // Preparar prompt otimizado para análise financeira brasileira
      const analysisPrompt = `
CONTEXTO DE ANÁLISE SENTINEL - MERCADO BRASILEIRO:

PORTFÓLIO ATUAL:
${JSON.stringify(context.portfolio, null, 2)}

DADOS DE MERCADO (24h):
${JSON.stringify(context.marketData, null, 2)}

NOTÍCIAS RELEVANTES (24h):
${JSON.stringify(context.recentNews, null, 2)}

DATA/HORA ANÁLISE: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

INSTRUÇÃO ESPECÍFICA:
Execute uma análise profunda considerando:

1. ANÁLISE DE PORTFÓLIO:
   - Performance de cada ativo
   - Diversificação setorial
   - Concentração de risco
   - Oportunidades de rebalanceamento

2. ANÁLISE DE MERCADO:
   - Tendências do Ibovespa
   - Setores em alta/baixa
   - Correlações entre ativos
   - Indicadores técnicos

3. ANÁLISE DE NOTÍCIAS:
   - Impacto no portfólio
   - Oportunidades/ameaças
   - Sentimento de mercado
   - Fatores macroeconômicos

4. INSIGHTS ACIONÁVEIS:
   - Recomendações específicas
   - Alertas de risco
   - Oportunidades de entrada/saída
   - Ações prioritárias

RESPONDA EM JSON VÁLIDO seguindo esta estrutura:
{
  "analysis_timestamp": "2025-01-25T10:30:00Z",
  "market_sentiment": "bullish|bearish|neutral",
  "portfolio_health_score": 85,
  "insights": [
    {
      "type": "opportunity|warning|recommendation|alert",
      "ticker": "PETR4|VALE3|etc",
      "title": "Título do insight",
      "description": "Descrição detalhada",
      "priority": "high|medium|low",
      "action_required": true/false,
      "impact_score": 1-10,
      "timeframe": "immediate|short_term|long_term",
      "category": "portfolio|market|news|risk"
    }
  ],
  "key_metrics": {
    "portfolio_volatility": 0.15,
    "beta_vs_ibov": 1.2,
    "diversification_score": 75,
    "risk_concentration": "low|medium|high"
  },
  "recommended_actions": [
    "Ação específica a ser tomada"
  ],
  "market_outlook": {
    "short_term": "Perspectiva 1-3 meses",
    "medium_term": "Perspectiva 3-12 meses",
    "key_factors": ["Fator 1", "Fator 2"]
  }
}`;

      // Usar modelo de thinking para análises complexas
      const modelToUse = context.portfolio?.length > 5 || context.recentNews?.length > 5 
        ? this.thinkingModel 
        : this.model;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://erasmoinvest.com',
          'X-Title': 'ErasmoInvest Sentinel Analysis'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3, // Baixa para análises precisas
          max_tokens: 4000,
          response_format: { type: "json_object" },
          top_p: 0.9,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen3 API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta vazia do Qwen3');
      }

      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error('Erro ao parsear JSON do Qwen3:', content);
        throw new Error('Resposta inválida do modelo');
      }

      // Validar estrutura da análise
      if (!analysis.insights || !Array.isArray(analysis.insights)) {
        analysis.insights = [];
      }

      // Adicionar metadados da análise
      analysis.model_used = modelToUse;
      analysis.tokens_used = data.usage?.total_tokens || 0;
      analysis.cost_usd = 0; // Qwen3 é gratuito!
      analysis.analysis_version = '2.0-qwen3';

      return analysis;

    } catch (error) {
      console.error('[sentinel-analyzer] Erro Qwen3:', error);
      
      // Fallback para análise básica
      return this.createFallbackAnalysis(context, error.message);
    }
  }

  /**
   * 🔄 Análise de fallback quando o modelo principal falha
   */
  private createFallbackAnalysis(context: any, errorMessage: string): any {
    const portfolioCount = context.portfolio?.length || 0;
    const newsCount = context.recentNews?.length || 0;
    const marketDataCount = context.marketData?.length || 0;

    // Análise básica baseada em regras
    const insights = [];

    // Insight sobre diversificação
    if (portfolioCount > 0) {
      const diversificationScore = Math.min(portfolioCount * 10, 100);
      
      if (portfolioCount < 5) {
        insights.push({
          type: 'recommendation',
          ticker: 'PORTFOLIO',
          title: 'Portfólio pouco diversificado',
          description: `Seu portfólio tem apenas ${portfolioCount} ativo(s). Considere diversificar para reduzir riscos.`,
          priority: 'medium',
          action_required: true,
          impact_score: 7,
          timeframe: 'short_term',
          category: 'portfolio'
        });
      }
    }

    // Insight sobre atividade de mercado
    if (marketDataCount > 0) {
      insights.push({
        type: 'alert',
        ticker: 'MARKET',
        title: 'Dados de mercado atualizados',
        description: `${marketDataCount} atualizações de mercado nas últimas 24h. Monitore movimentos.`,
        priority: 'low',
        action_required: false,
        impact_score: 5,
        timeframe: 'immediate',
        category: 'market'
      });
    }

    // Insight sobre notícias
    if (newsCount > 0) {
      insights.push({
        type: 'opportunity',
        ticker: 'NEWS',
        title: 'Notícias relevantes disponíveis',
        description: `${newsCount} notícias podem impactar seus investimentos. Revise para oportunidades.`,
        priority: 'medium',
        action_required: true,
        impact_score: 6,
        timeframe: 'immediate',
        category: 'news'
      });
    }

    return {
      analysis_timestamp: new Date().toISOString(),
      market_sentiment: 'neutral',
      portfolio_health_score: Math.max(50, 100 - portfolioCount * 5), // Score básico
      insights,
      key_metrics: {
        portfolio_volatility: 0.12,
        beta_vs_ibov: 1.0,
        diversification_score: Math.min(portfolioCount * 15, 100),
        risk_concentration: portfolioCount < 3 ? 'high' : portfolioCount < 8 ? 'medium' : 'low'
      },
      recommended_actions: [
        'Revisar notícias recentes',
        'Monitorar performance do portfólio',
        'Considerar rebalanceamento se necessário'
      ],
      market_outlook: {
        short_term: 'Aguardando análise detalhada',
        medium_term: 'Requer dados mais recentes',
        key_factors: ['Política monetária', 'Cenário global', 'Setor específico']
      },
      model_used: 'fallback-rules',
      tokens_used: 0,
      cost_usd: 0,
      error: errorMessage,
      analysis_version: '2.0-fallback'
    };
  }
}

/**
 * 🚀 FUNÇÃO PRINCIPAL DO SENTINEL AGENT
 */
serve(async (_req) => {
  const t0 = Date.now();

  try {
    console.log('[sentinel-agent] Iniciando análise automática...');

    // Buscar prompt mais recente do banco
    const { data: promptData, error: promptError } = await supabaseClient
      .from('prompts')
      .select('content, version')
      .eq('name', 'sentinel_system_prompt')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (promptError || !promptData) {
      console.warn(`Prompt não encontrado, usando padrão: ${promptError?.message}`);
      
      // Prompt padrão otimizado para mercado brasileiro
      promptData = {
        content: `
Você é o Sentinel, um agente de análise financeira especializado no mercado brasileiro.

ESPECIALIDADES:
- Análise de portfólios de investimento
- Monitoramento de ativos da B3 (Bovespa)
- Interpretação de notícias econômicas
- Avaliação de riscos e oportunidades
- Recomendações acionáveis

DIRETRIZES:
1. Foque em ativos e índices brasileiros (Ibovespa, IFIX, etc.)
2. Considere fatores macroeconômicos nacionais (Selic, IPCA, câmbio)
3. Interprete notícias com impacto no mercado local
4. Priorize insights acionáveis e práticos
5. Seja preciso mas acessível na linguagem
6. Considere perfis de risco conservador a arrojado

FORMATO DE SAÍDA:
Sempre responda em JSON válido com insights estruturados, métricas quantitativas e recomendações específicas.`,
        version: 1
      };
    }

    const systemPrompt = promptData.content;
    const promptVersion = promptData.version;
    console.log(`[sentinel-agent] Usando prompt versão ${promptVersion}`);

    // Coletar dados do portfólio ativo
    const { data: portfolio, error: portfolioError } = await supabaseClient
      .from('investments')
      .select('*')
      .eq('is_active', true);

    if (portfolioError) {
      console.error('Erro ao buscar portfólio:', portfolioError);
    }

    // Coletar dados de mercado recentes (24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: marketData, error: marketError } = await supabaseClient
      .from('market_data')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (marketError) {
      console.error('Erro ao buscar dados de mercado:', marketError);
    }

    // Coletar notícias recentes (24h)
    const { data: news, error: newsError } = await supabaseClient
      .from('news')
      .select('*')
      .gte('published_at', yesterday.toISOString())
      .order('published_at', { ascending: false })
      .limit(10);

    if (newsError) {
      console.error('Erro ao buscar notícias:', newsError);
    }

    // Preparar contexto para análise
    const context = {
      portfolio: portfolio || [],
      marketData: marketData || [],
      recentNews: news || [],
      timestamp: new Date().toISOString(),
      market: 'BR', // Mercado brasileiro
      timezone: 'America/Sao_Paulo'
    };

    console.log(`[sentinel-agent] Analisando: ${context.portfolio.length} ativos, ${context.marketData.length} dados de mercado, ${context.recentNews.length} notícias`);

    // Inicializar analisador Qwen3
    const qwenAnalyzer = new QwenSentinelAnalyzer();

    // Executar análise com Qwen3
    const analysis = await qwenAnalyzer.analyzeMarketAndPortfolio(context, systemPrompt);

    // Salvar insights no banco de dados
    let insightsCreated = 0;
    if (analysis.insights && Array.isArray(analysis.insights)) {
      for (const insight of analysis.insights) {
        try {
          await supabaseClient
            .from('insights')
            .insert({
              type: insight.type,
              ticker: insight.ticker,
              title: insight.title,
              description: insight.description,
              priority: insight.priority,
              action_required: insight.action_required || false,
              impact_score: insight.impact_score || 5,
              timeframe: insight.timeframe || 'short_term',
              category: insight.category || 'general',
              source: 'sentinel-agent',
              model_used: analysis.model_used,
              analysis_version: analysis.analysis_version
            });
          
          insightsCreated++;
        } catch (insertError) {
          console.error('Erro ao inserir insight:', insertError);
        }
      }
    }

    // Salvar análise completa para histórico
    await supabaseClient
      .from('sentinel_analyses')
      .insert({
        analysis_timestamp: analysis.analysis_timestamp,
        market_sentiment: analysis.market_sentiment,
        portfolio_health_score: analysis.portfolio_health_score,
        key_metrics: analysis.key_metrics,
        market_outlook: analysis.market_outlook,
        insights_count: insightsCreated,
        model_used: analysis.model_used,
        tokens_used: analysis.tokens_used,
        cost_usd: analysis.cost_usd
      })
      .select()
      .single();

    // Registrar telemetria
    const latency = Date.now() - t0;
    
    await supabaseClient
      .from('agent_logs')
      .insert({
        function_name: 'sentinel-agent-cron',
        latency_ms: latency,
        prompt_version: promptVersion,
        tokens_used: analysis.tokens_used || 0,
        estimated_cost: 0, // Qwen3 é gratuito!
        status_code: 200,
        model_used: analysis.model_used,
        insights_generated: insightsCreated
      });

    console.log(`[sentinel-agent] ✅ Análise concluída: ${insightsCreated} insights em ${latency}ms`);

    // Resposta de sucesso
    return new Response(JSON.stringify({
      success: true,
      insights_count: insightsCreated,
      latency_ms: latency,
      analysis_summary: {
        market_sentiment: analysis.market_sentiment,
        portfolio_health_score: analysis.portfolio_health_score,
        model_used: analysis.model_used,
        tokens_used: analysis.tokens_used,
        cost_usd: 0 // 100% gratuito!
      },
      recommended_actions: analysis.recommended_actions?.slice(0, 3) || [], // Top 3
      execution_info: {
        timestamp: new Date().toISOString(),
        version: '2.0-qwen3',
        data_processed: {
          portfolio_items: context.portfolio.length,
          market_data_points: context.marketData.length,
          news_articles: context.recentNews.length
        }
      }
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("[sentinel-agent] Erro crítico:", error);

    // Registrar erro na telemetria
    await supabaseClient
      .from('agent_logs')
      .insert({
        function_name: 'sentinel-agent-cron',
        latency_ms: Date.now() - t0,
        status_code: 500,
        error_message: error.message,
        estimated_cost: 0
      });

    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      fallback_executed: true,
      execution_info: {
        timestamp: new Date().toISOString(),
        version: '2.0-qwen3-error',
        latency_ms: Date.now() - t0
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});