import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Configurações do circuit breaker
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenRequests: 3,
  errorRateThreshold: 0.5
};
// Cache simples em memória
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutos
// Verificar saúde do serviço
async function checkServiceHealth(serviceName) {
  try {
    const { data } = await supabaseClient.from('service_health').select('*').eq('service_name', serviceName).single();
    if (!data) {
      // Criar entrada se não existir
      await supabaseClient.from('service_health').insert({
        service_name: serviceName
      });
      return true;
    }
    // Verificar circuit breaker
    if (data.circuit_breaker_open) {
      const openedAt = new Date(data.circuit_breaker_opened_at).getTime();
      const now = Date.now();
      // Tentar half-open após timeout
      if (now - openedAt > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        console.log(`[resilience] Circuit breaker half-open para ${serviceName}`);
        return true; // Permitir tentativa
      }
      console.log(`[resilience] Circuit breaker OPEN para ${serviceName}`);
      return false;
    }
    return data.status !== 'unhealthy';
  } catch (error) {
    console.error('[resilience] Erro ao verificar saúde:', error);
    return true; // Fail open
  }
}
// Atualizar métricas de saúde
async function updateHealthMetrics(serviceName, success, latency) {
  try {
    const { data: current } = await supabaseClient.from('service_health').select('*').eq('service_name', serviceName).single();
    if (!current) return;
    const failures = success ? 0 : current.consecutive_failures + 1;
    const samples = 100; // Janela móvel de 100 requisições
    const errorRate = success ? Math.max(0, current.error_rate - 1 / samples) : Math.min(1, current.error_rate + 1 / samples);
    // Atualizar latência média
    const avgLatency = Math.round(current.avg_latency_ms * 0.9 + latency * 0.1);
    // Determinar se deve abrir circuit breaker
    const shouldOpenCircuitBreaker = failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold || errorRate >= CIRCUIT_BREAKER_CONFIG.errorRateThreshold;
    const updates = {
      consecutive_failures: failures,
      error_rate: errorRate,
      avg_latency_ms: avgLatency,
      last_check: new Date().toISOString(),
      status: errorRate > 0.3 ? 'degraded' : 'healthy'
    };
    if (shouldOpenCircuitBreaker && !current.circuit_breaker_open) {
      updates.circuit_breaker_open = true;
      updates.circuit_breaker_opened_at = new Date().toISOString();
      updates.status = 'unhealthy';
      console.error(`[resilience] Circuit breaker OPENED para ${serviceName}`);
    } else if (success && current.circuit_breaker_open) {
      // Fechar circuit breaker após sucesso
      updates.circuit_breaker_open = false;
      updates.circuit_breaker_opened_at = null;
      console.log(`[resilience] Circuit breaker CLOSED para ${serviceName}`);
    }
    await supabaseClient.from('service_health').update(updates).eq('service_name', serviceName);
  } catch (error) {
    console.error('[resilience] Erro ao atualizar métricas:', error);
  }
}
// Buscar resposta de fallback
async function getFallbackResponse(functionName, scenario = 'default_error') {
  try {
    const { data } = await supabaseClient.from('fallback_responses').select('response_template').eq('function_name', functionName).eq('scenario', scenario).eq('is_active', true).order('priority', {
      ascending: false
    }).limit(1).single();
    return data?.response_template || {
      response: 'Serviço temporariamente indisponível',
      fallback: true
    };
  } catch (error) {
    console.error('[resilience] Erro ao buscar fallback:', error);
    return {
      response: 'Serviço temporariamente indisponível',
      fallback: true
    };
  }
}
// Função principal com retry e fallback
async function executeWithResilience(functionName, payload, maxRetries = 3) {
  const cacheKey = `${functionName}:${JSON.stringify(payload)}`;
  // Verificar cache primeiro
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[resilience] Retornando resultado do cache para ${functionName}`);
    return {
      ...cached.data,
      from_cache: true
    };
  }
  // Verificar saúde do serviço
  const isHealthy = await checkServiceHealth(functionName);
  if (!isHealthy) {
    console.log(`[resilience] Serviço ${functionName} não está saudável, usando fallback`);
    return await getFallbackResponse(functionName, 'circuit_breaker_open');
  }
  let lastError;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    const t0 = Date.now();
    try {
      console.log(`[resilience] Tentativa ${attempt}/${maxRetries} para ${functionName}`);
      // Timeout adaptativo baseado na latência média
      const { data: health } = await supabaseClient.from('service_health').select('avg_latency_ms').eq('service_name', functionName).single();
      const timeout = Math.max(5000, Math.min(30000, (health?.avg_latency_ms || 5000) * 3));
      // Executar função com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(()=>controller.abort(), timeout);
      const { data, error } = await supabaseClient.functions.invoke(functionName, {
        body: payload,
        headers: {
          'x-retry-attempt': attempt.toString()
        }
      });
      clearTimeout(timeoutId);
      if (error) throw error;
      // Atualizar métricas de sucesso
      await updateHealthMetrics(functionName, true, Date.now() - t0);
      // Atualizar cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (error) {
      lastError = error;
      const latency = Date.now() - t0;
      console.error(`[resilience] Erro na tentativa ${attempt} para ${functionName}:`, error);
      // Atualizar métricas de falha
      await updateHealthMetrics(functionName, false, latency);
      // Delay exponencial entre tentativas
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve)=>setTimeout(resolve, delay));
      }
    }
  }
  // Todas as tentativas falharam - usar fallback
  console.error(`[resilience] Todas as tentativas falharam para ${functionName}, usando fallback`);
  const scenario = lastError?.message?.includes('timeout') ? 'timeout' : lastError?.message?.includes('API') ? 'api_error' : 'default_error';
  return await getFallbackResponse(functionName, scenario);
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { function: targetFunction, payload, options = {} } = await req.json();
    if (!targetFunction) {
      throw new Error('Nome da função é obrigatório');
    }
    const result = await executeWithResilience(targetFunction, payload, options.maxRetries || 3);
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[resilience] Erro fatal:', error);
    return new Response(JSON.stringify({
      error: error.message,
      fallback: true
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
