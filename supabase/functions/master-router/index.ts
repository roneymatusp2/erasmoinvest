import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Classificador de complexidade de comandos
function classifyCommand(command) {
  const complexKeywords = /analise|compare|risco|explique|por que|me diga sobre|contexto|histórico/i;
  const marketKeywords = /mercado|cotação|preço|valor|ação|ações|bovespa|b3/i;
  const portfolioKeywords = /portfolio|carteira|investimento|saldo|patrimônio|lucro|prejuízo/i;
  if (complexKeywords.test(command)) return 'complex';
  if (marketKeywords.test(command) && !portfolioKeywords.test(command)) return 'market';
  if (portfolioKeywords.test(command)) return 'portfolio';
  return 'simple';
}
// Mapeamento de rotas
const routeMap = {
  'complex': 'cognitive-core',
  'simple': 'process-command',
  'market': 'process-command',
  'portfolio': 'execute-command'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const t0 = Date.now();
  let route = 'process-command';
  let tokensUsed = 0;
  try {
    const { command, userId, isVoice = false } = await req.json();
    if (!command) {
      throw new Error("Comando ausente");
    }
    // Classificar o comando
    const commandType = classifyCommand(command);
    route = routeMap[commandType];
    console.log(`[master-router] Comando: "${command.substring(0, 50)}..." → Tipo: ${commandType} → Rota: ${route}`);
    // Invocar a função apropriada
    const { data, error } = await supabaseClient.functions.invoke(route, {
      body: {
        text: command,
        userId,
        isVoice,
        metadata: {
          routed_from: 'master-router',
          command_type: commandType
        }
      }
    });
    if (error) throw error;
    // Extrair métricas se disponíveis
    if (data?.metrics) {
      tokensUsed = data.metrics.tokens_used || 0;
    }
    // Registrar telemetria de sucesso
    await supabaseClient.from('agent_logs').insert({
      function_name: 'master-router',
      latency_ms: Date.now() - t0,
      status_code: 200,
      tokens_used: tokensUsed,
      estimated_cost: tokensUsed > 0 ? tokensUsed / 1000 * 0.002 : 0
    });
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Route-Used': route,
        'X-Command-Type': commandType
      }
    });
  } catch (error) {
    console.error('[master-router] Erro:', error);
    // Registrar telemetria de erro
    await supabaseClient.from('agent_logs').insert({
      function_name: 'master-router',
      latency_ms: Date.now() - t0,
      status_code: 500,
      error_message: error.message
    });
    return new Response(JSON.stringify({
      error: error.message,
      fallback: 'Desculpe, ocorreu um erro ao processar seu comando. Por favor, tente novamente.'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
