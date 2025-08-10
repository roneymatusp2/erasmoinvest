import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Client com chave de serviço para orquestrar chamadas internas entre funções
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// ID único e fixo usado em todo o sistema (origem: tabela investments)
const FIXED_USER_ID = '4362da88-d01c-4ffe-a447-75751ea8e182';

// Mapeia ações semânticas do parser para ações do executor
function mapActionToExecutor(action: string): { action: string; paramsPassthrough: boolean } {
  switch (action) {
    case 'consult_portfolio':
      return { action: 'get_portfolio_overview', paramsPassthrough: false };
    case 'get_ticker_balance':
    case 'query_asset':
      return { action: 'get_ticker_balance', paramsPassthrough: true };
    case 'get_ticker_transactions':
      return { action: 'get_ticker_transactions', paramsPassthrough: true };
    case 'add_investment':
      return { action: 'add_investment', paramsPassthrough: true };
    case 'sell_investment':
      return { action: 'sell_investment', paramsPassthrough: true };
    case 'add_dividend':
      return { action: 'add_dividend', paramsPassthrough: true };
    default:
      return { action, paramsPassthrough: true };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    // Não exigimos JWT de sessão; o roteador opera com service role internamente
    const { command, isVoice = false } = await req.json();
    if (!command || typeof command !== 'string') {
      throw new Error('Comando ausente');
    }

    // 1) Parsear o comando em ação estruturada usando a função de NLP
    const parsed = await supabaseClient.functions.invoke('process-command', {
      body: { text: command, userId: FIXED_USER_ID, isVoice, routed_from: 'master-router' }
    });
    if (parsed.error) throw parsed.error;

    const structured = parsed.data || {};
    const action = structured.action;
    const parameters = structured.parameters || structured.params || {};

    if (!action) {
      throw new Error('Não foi possível identificar uma ação a partir do comando.');
    }

    // 2) Se for uma análise livre/consulta de mercado, roteia para o cognitive-core
    if (action === 'unsupported_action' || action === 'query_market_price') {
      const cognitive = await supabaseClient.functions.invoke('cognitive-core', {
        body: { query: command, user_id: FIXED_USER_ID }
      });
      if (cognitive.error) throw cognitive.error;

      await supabaseClient.from('agent_logs').insert({
        function_name: 'master-router',
        latency_ms: Date.now() - t0,
        status_code: 200,
        metadata: { action: 'cognitive-core' }
      });

      return new Response(JSON.stringify(cognitive.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3) Mapear e chamar o executor com o user fixo
    const mapped = mapActionToExecutor(action);
    const execBody = {
      action: mapped.action,
      params: mapped.paramsPassthrough ? parameters : {},
      userId: FIXED_USER_ID
    };

    // Modo dry-run/confirm para ações que alteram dados
    const mutatingActions = new Set(['add_investment','sell_investment','add_dividend']);
    if (mutatingActions.has(mapped.action)) {
      const preview = {
        will_execute: mapped.action,
        params: execBody.params,
        user_id: FIXED_USER_ID,
        confirmation_required: true,
        hint: 'Envie novamente com { "confirm": true } para executar'
      };
      const wantsConfirm = (parameters && parameters.confirm === true) || false;
      if (!wantsConfirm) {
        return new Response(JSON.stringify({ preview }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const executed = await supabaseClient.functions.invoke('execute-command', {
      body: execBody
    });
    if (executed.error) throw executed.error;

    // Telemetria
    await supabaseClient.from('agent_logs').insert({
      function_name: 'master-router',
      latency_ms: Date.now() - t0,
      status_code: 200,
      metadata: { action: mapped.action }
    });

    return new Response(JSON.stringify(executed.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[master-router] Erro:', error);
    await supabaseClient.from('agent_logs').insert({
      function_name: 'master-router',
      latency_ms: Date.now() - t0,
      status_code: 500,
      error_message: String(error?.message || error)
    });
    return new Response(
      JSON.stringify({ error: String(error?.message || error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
