import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    if (endpoint === 'summary') {
      // Obter resumo do sistema
      const { data, error } = await supabaseClient.rpc('get_system_summary');
      if (error) throw error;
      return new Response(JSON.stringify({
        status: 'healthy',
        summary: data,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (endpoint === 'dashboard') {
      // Obter dados do dashboard
      const { data, error } = await supabaseClient.from('system_health_dashboard').select('*').order('time_window', {
        ascending: false
      }).limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({
        dashboard_data: data,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (endpoint === 'functions') {
      // Status das funções
      const { data: logs, error } = await supabaseClient.from('agent_logs').select('function_name, status_code, latency_ms, created_at').gte('created_at', new Date(Date.now() - 60000).toISOString()).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      // Agrupar por função
      const functionStatus = {};
      logs?.forEach((log)=>{
        if (!functionStatus[log.function_name]) {
          functionStatus[log.function_name] = {
            name: log.function_name,
            status: 'healthy',
            last_seen: log.created_at,
            avg_latency: 0,
            success_rate: 100,
            request_count: 0
          };
        }
        const func = functionStatus[log.function_name];
        func.request_count++;
        func.avg_latency = (func.avg_latency + log.latency_ms) / 2;
        if (log.status_code >= 400) {
          func.status = 'unhealthy';
          func.success_rate = Math.max(0, func.success_rate - 10);
        }
      });
      return new Response(JSON.stringify({
        functions: Object.values(functionStatus),
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (endpoint === 'experts') {
      // Status dos experts MoE
      const { data: experts, error } = await supabaseClient.from('moe_experts').select('*').eq('is_active', true);
      if (error) throw error;
      // Buscar feedback recente
      const { data: recentFeedback } = await supabaseClient.from('moe_feedback').select('expert_name, response_quality, user_satisfaction').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      // Enriquecer experts com feedback
      const expertsWithFeedback = experts?.map((expert)=>{
        const feedback = recentFeedback?.filter((f)=>f.expert_name === expert.name) || [];
        const avgQuality = feedback.length > 0 ? feedback.reduce((sum, f)=>sum + (f.response_quality || 0), 0) / feedback.length : null;
        const avgSatisfaction = feedback.length > 0 ? feedback.reduce((sum, f)=>sum + (f.user_satisfaction || 0), 0) / feedback.length : null;
        return {
          ...expert,
          recent_usage: feedback.length,
          avg_quality_24h: avgQuality,
          avg_satisfaction_24h: avgSatisfaction
        };
      });
      return new Response(JSON.stringify({
        experts: expertsWithFeedback,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Health check padrão
    const { data: recentLogs } = await supabaseClient.from('agent_logs').select('status_code').gte('created_at', new Date(Date.now() - 300000).toISOString()); // Últimos 5 minutos
    const totalRequests = recentLogs?.length || 0;
    const successfulRequests = recentLogs?.filter((log)=>log.status_code === 200).length || 0;
    const healthScore = totalRequests > 0 ? successfulRequests / totalRequests * 100 : 100;
    const status = healthScore >= 95 ? 'healthy' : healthScore >= 80 ? 'degraded' : 'unhealthy';
    return new Response(JSON.stringify({
      status,
      health_score: Math.round(healthScore),
      requests_5min: totalRequests,
      success_rate: Math.round(healthScore),
      timestamp: new Date().toISOString()
    }), {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[system-health] Erro:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
