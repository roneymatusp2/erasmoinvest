import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Verifica rate limiting
async function checkRateLimit(userId, endpoint) {
  try {
    // Buscar política de rate limit
    const { data: policy } = await supabaseClient.from('governance_policies').select('config').eq('type', 'rate_limit').eq('is_active', true).single();
    if (!policy) return {
      allowed: true
    };
    const limits = policy.config;
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);
    // Verificar limites por minuto
    const { count: minuteCount } = await supabaseClient.from('rate_limits').select('*', {
      count: 'exact',
      head: true
    }).eq('user_id', userId).eq('endpoint', endpoint).gte('window_start', minuteAgo.toISOString());
    if (minuteCount >= limits.requests_per_minute) {
      return {
        allowed: false,
        reason: `Limite de ${limits.requests_per_minute} requisições por minuto excedido`
      };
    }
    // Verificar limites por hora
    const { count: hourCount } = await supabaseClient.from('rate_limits').select('*', {
      count: 'exact',
      head: true
    }).eq('user_id', userId).eq('endpoint', endpoint).gte('window_start', hourAgo.toISOString());
    if (hourCount >= limits.requests_per_hour) {
      return {
        allowed: false,
        reason: `Limite de ${limits.requests_per_hour} requisições por hora excedido`
      };
    }
    // Registrar nova requisição
    await supabaseClient.from('rate_limits').insert({
      user_id: userId,
      endpoint: endpoint,
      requests_count: 1,
      window_start: now.toISOString()
    });
    return {
      allowed: true,
      remainingQuota: {
        per_minute: limits.requests_per_minute - minuteCount - 1,
        per_hour: limits.requests_per_hour - hourCount - 1
      }
    };
  } catch (error) {
    console.error('[governor] Erro ao verificar rate limit:', error);
    return {
      allowed: true
    }; // Fail open em caso de erro
  }
}
// Verifica orçamento mensal
async function checkBudget(userId) {
  try {
    const { data: policy } = await supabaseClient.from('governance_policies').select('config').eq('type', 'budget').eq('is_active', true).single();
    if (!policy) return {
      allowed: true
    };
    const budget = policy.config;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    // Calcular custo total do mês
    const { data: logs } = await supabaseClient.from('agent_logs').select('estimated_cost').gte('created_at', startOfMonth.toISOString()).eq('function_name', userId); // Assumindo que user_id é armazenado em function_name
    const totalCost = logs?.reduce((sum, log)=>sum + (log.estimated_cost || 0), 0) || 0;
    if (totalCost >= budget.max_cost_per_user_per_month) {
      return {
        allowed: false,
        reason: `Orçamento mensal de $${budget.max_cost_per_user_per_month} excedido`
      };
    }
    // Alertar se próximo do limite
    if (totalCost >= budget.max_cost_per_user_per_month * budget.alert_threshold) {
      console.warn(`[governor] Usuário ${userId} atingiu ${Math.round(totalCost / budget.max_cost_per_user_per_month * 100)}% do orçamento mensal`);
    }
    return {
      allowed: true,
      remainingQuota: {
        monthly_budget: budget.max_cost_per_user_per_month - totalCost,
        percentage_used: Math.round(totalCost / budget.max_cost_per_user_per_month * 100)
      }
    };
  } catch (error) {
    console.error('[governor] Erro ao verificar orçamento:', error);
    return {
      allowed: true
    };
  }
}
// Verifica conteúdo sensível
function checkContent(text) {
  try {
    const { data: policy } = await supabaseClient.from('governance_policies').select('config').eq('type', 'content_filter').eq('is_active', true).single();
    if (!policy) return {
      allowed: true
    };
    const filter = policy.config;
    const lowerText = text.toLowerCase();
    // Verificar padrões bloqueados
    for (const pattern of filter.block_patterns){
      if (lowerText.includes(pattern)) {
        return {
          allowed: false,
          reason: `Conteúdo sensível detectado: ${pattern}`
        };
      }
    }
    // Verificar padrões de dados sensíveis
    if (filter.sensitive_data_check) {
      const sensitivePatterns = [
        /\b\d{11}\b/,
        /\b\d{14}\b/,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ // Cartão de crédito
      ];
      for (const pattern of sensitivePatterns){
        if (pattern.test(text)) {
          return {
            allowed: false,
            reason: 'Dados pessoais sensíveis detectados'
          };
        }
      }
    }
    return {
      allowed: true
    };
  } catch (error) {
    console.error('[governor] Erro ao verificar conteúdo:', error);
    return {
      allowed: true
    };
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const t0 = Date.now();
  try {
    const { userId, endpoint, text, action = 'check' } = await req.json();
    if (!userId || !endpoint) {
      throw new Error('userId e endpoint são obrigatórios');
    }
    console.log(`[governor] Verificando governança para ${userId} em ${endpoint}`);
    // Executar verificações em paralelo
    const checks = await Promise.all([
      checkRateLimit(userId, endpoint),
      checkBudget(userId),
      text ? checkContent(text) : {
        allowed: true
      }
    ]);
    // Consolidar resultados
    const allowed = checks.every((check)=>check.allowed);
    const reasons = checks.filter((check)=>!check.allowed).map((check)=>check.reason);
    const quotas = checks.map((check)=>check.remainingQuota).filter(Boolean);
    // Registrar telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'governor-agent',
      latency_ms: Date.now() - t0,
      status_code: allowed ? 200 : 403
    });
    const response = {
      allowed,
      reasons,
      quotas: Object.assign({}, ...quotas),
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(response), {
      status: allowed ? 200 : 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[governor] Erro:', error);
    await supabaseClient.from('agent_logs').insert({
      function_name: 'governor-agent',
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
