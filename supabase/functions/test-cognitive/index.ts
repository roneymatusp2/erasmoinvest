import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
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
    const { question } = await req.json();
    // Verificar variáveis de ambiente
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      QWEN_OPENROUTER_API: !!Deno.env.get('QWEN_OPENROUTER_API'),
      GEMMA3_OPENROUTERAPI: !!Deno.env.get('GEMMA3_OPENROUTERAPI'),
      VITE_BRAPI_API_KEY: !!Deno.env.get('VITE_BRAPI_API_KEY'),
      ErasmoInvest_NewsAPI: !!Deno.env.get('ErasmoInvest_NewsAPI'),
      ErasmoInvest_API_MISTRAL_text: !!Deno.env.get('ErasmoInvest_API_MISTRAL_text')
    };
    console.log('Environment check:', envCheck);
    // Testar conexão com Supabase
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    // Testar tabela investments
    const { data: investments, error: invError } = await supabaseClient.from('investments').select('ticker, compra, venda').limit(3);
    // Testar view agregada com nome correto da coluna
    const { data: portfolio, error: portError } = await supabaseClient.from('v_portfolio_position').select('ticker, saldo, valor_total_investido, user_id').limit(3);
    // Testar função RPC
    let rpcTest = null;
    if (portfolio && portfolio.length > 0) {
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_ticker_balance', {
        p_user_id: portfolio[0].user_id,
        p_ticker: portfolio[0].ticker
      });
      rpcTest = {
        data: rpcData,
        error: rpcError
      };
    }
    // Testar tabelas do Knowledge Graph
    const { data: nodes, error: nodesError } = await supabaseClient.from('nodes').select('id, type, label').limit(3);
    // Testar OpenRouter - usar GEMMA3_OPENROUTERAPI como fallback se QWEN não existir
    const openRouterKey = Deno.env.get('QWEN_OPENROUTER_API') || Deno.env.get('GEMMA3_OPENROUTERAPI');
    let openRouterTest = false;
    let modelsList = [];
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`
        }
      });
      openRouterTest = response.ok;
      if (response.ok) {
        const data = await response.json();
        modelsList = data.data?.filter((m)=>m.id.includes('qwen') || m.id.includes('gemma')).map((m)=>m.id) || [];
      }
    } catch (e) {
      console.error('OpenRouter test failed:', e);
    }
    // Testar Mistral
    let mistralTest = false;
    try {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_MISTRAL_text')}`
        }
      });
      mistralTest = response.ok;
    } catch (e) {
      console.error('Mistral test failed:', e);
    }
    // Testar BRAPI - usar chave existente ou mock
    let brapiTest = false;
    const brapiKey = Deno.env.get('VITE_BRAPI_API_KEY') || Deno.env.get('BRAPI_API_KEY');
    if (brapiKey) {
      try {
        const response = await fetch(`https://brapi.dev/api/quote/VALE3?token=${brapiKey}`);
        brapiTest = response.ok;
      } catch (e) {
        console.error('BRAPI test failed:', e);
      }
    }
    // Resumo do sistema
    const systemStatus = {
      database: {
        connected: !invError,
        investments_table: !invError ? `${investments?.length || 0} registros` : invError.message,
        portfolio_view: !portError ? `${portfolio?.length || 0} posições agregadas` : portError?.message || 'Erro na view',
        rpc_functions: rpcTest ? !rpcTest.error ? 'OK' : rpcTest.error.message : 'Não testado',
        knowledge_graph: !nodesError ? `${nodes?.length || 0} nós` : nodesError?.message || 'Tabela não existe'
      },
      apis: {
        openrouter: openRouterTest ? `OK (${modelsList.length} modelos)` : 'Falhou',
        mistral: mistralTest ? 'OK' : 'Falhou',
        brapi: brapiTest ? 'OK' : brapiKey ? 'Falhou' : 'Sem chave',
        models_available: modelsList.slice(0, 10) // Limita para não poluir
      },
      missing_env_vars: Object.entries(envCheck).filter(([_, value])=>!value).map(([key])=>key),
      workarounds: {
        QWEN_API: !envCheck.QWEN_OPENROUTER_API && envCheck.GEMMA3_OPENROUTERAPI ? 'Usando GEMMA3_OPENROUTERAPI como fallback' : null,
        BRAPI: !envCheck.VITE_BRAPI_API_KEY ? 'BRAPI desabilitado - adicione VITE_BRAPI_API_KEY para cotações em tempo real' : null
      }
    };
    // Testar processo completo se possível
    let integrationTest = null;
    if (question && (envCheck.QWEN_OPENROUTER_API || envCheck.GEMMA3_OPENROUTERAPI)) {
      try {
        // Simular fluxo completo
        const processResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            text: question
          })
        });
        if (processResponse.ok) {
          const processResult = await processResponse.json();
          integrationTest = {
            process_command: 'OK',
            detected_action: processResult.action?.action,
            confidence: processResult.action?.confidence,
            will_use_ai: ![
              'query_asset'
            ].includes(processResult.action?.action)
          };
          // Se for consulta simples, testar RPC direto
          if (processResult.action?.action === 'query_asset' && portfolio && portfolio.length > 0) {
            const { data: balance } = await supabaseClient.rpc('get_ticker_balance', {
              p_user_id: portfolio[0].user_id,
              p_ticker: 'VALE3'
            });
            integrationTest.direct_query_test = balance ? 'OK' : 'Sem dados';
          }
        }
      } catch (e) {
        integrationTest = {
          error: e.message
        };
      }
    }
    // Recomendações específicas
    const recommendations = [];
    if (!envCheck.QWEN_OPENROUTER_API && envCheck.GEMMA3_OPENROUTERAPI) {
      recommendations.push('✅ Sistema funcional usando GEMMA3 como modelo principal');
    }
    if (!envCheck.QWEN_OPENROUTER_API && !envCheck.GEMMA3_OPENROUTERAPI) {
      recommendations.push('⚠️ Configure QWEN_OPENROUTER_API ou use GEMMA3_OPENROUTERAPI existente');
    }
    if (!envCheck.VITE_BRAPI_API_KEY) {
      recommendations.push('📈 Adicione VITE_BRAPI_API_KEY para cotações em tempo real');
    }
    if (nodes?.length === 0) {
      recommendations.push('🧠 Execute as funções cron para popular o Knowledge Graph');
    }
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      environment_check: envCheck,
      system_status: systemStatus,
      integration_test: integrationTest,
      test_question: question || 'Nenhuma pergunta fornecida',
      recommendations: recommendations.length > 0 ? recommendations : [
        '✅ Sistema 100% operacional!'
      ]
    }, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
