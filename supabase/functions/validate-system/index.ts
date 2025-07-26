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
    const validationResults = {
      timestamp: new Date().toISOString(),
      system_status: 'checking...',
      checks: {}
    };
    // 1. Verificar variável Gemini
    const GEMINI_API_KEY = Deno.env.get('Gemini-Embedding');
    validationResults.checks.gemini_key = {
      exists: !!GEMINI_API_KEY,
      length: GEMINI_API_KEY?.length || 0,
      prefix: GEMINI_API_KEY?.substring(0, 10) + '...' || 'N/A',
      status: GEMINI_API_KEY ? 'OK' : 'ERROR'
    };
    // 2. Testar Gemini API diretamente
    if (GEMINI_API_KEY) {
      try {
        const t0 = Date.now();
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [
                {
                  text: "Teste de validação do sistema ErasmoInvest"
                }
              ]
            },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768
          })
        });
        const latency = Date.now() - t0;
        if (response.ok) {
          const result = await response.json();
          const embedding = result.embedding?.values;
          validationResults.checks.gemini_api = {
            status: 'OK',
            latency_ms: latency,
            dimensions: embedding?.length || 0,
            expected_dimensions: 768,
            dimensions_ok: embedding?.length === 768,
            non_zero_values: embedding ? embedding.filter((v)=>Math.abs(v) > 0.001).length : 0
          };
        } else {
          const error = await response.text();
          validationResults.checks.gemini_api = {
            status: 'ERROR',
            error_code: response.status,
            error_message: error,
            latency_ms: latency
          };
        }
      } catch (error) {
        validationResults.checks.gemini_api = {
          status: 'ERROR',
          error: error.message
        };
      }
    } else {
      validationResults.checks.gemini_api = {
        status: 'SKIPPED',
        reason: 'API key not found'
      };
    }
    // 3. Verificar banco de dados
    try {
      const { data: nodesCount, error } = await supabaseClient.from('nodes').select('id', {
        count: 'exact',
        head: true
      });
      validationResults.checks.database = {
        status: error ? 'ERROR' : 'OK',
        nodes_count: nodesCount || 'unknown',
        error: error?.message
      };
    } catch (error) {
      validationResults.checks.database = {
        status: 'ERROR',
        error: error.message
      };
    }
    // 4. Verificar função hybrid_search
    try {
      const { data, error } = await supabaseClient.rpc('hybrid_search', {
        query_text: 'teste',
        query_embedding: Array(768).fill(0),
        match_count: 1
      });
      validationResults.checks.hybrid_search = {
        status: error ? 'ERROR' : 'OK',
        results_count: data?.length || 0,
        error: error?.message
      };
    } catch (error) {
      validationResults.checks.hybrid_search = {
        status: 'ERROR',
        error: error.message
      };
    }
    // 5. Verificar portfólio do usuário teste
    try {
      const { data, error } = await supabaseClient.rpc('get_portfolio_summary', {
        p_user_id: '4362da88-d01c-4ffe-a447-75751ea8e182'
      });
      validationResults.checks.portfolio_function = {
        status: error ? 'ERROR' : 'OK',
        has_data: !!data,
        total_invested: data?.total_invested || 0,
        error: error?.message
      };
    } catch (error) {
      validationResults.checks.portfolio_function = {
        status: 'ERROR',
        error: error.message
      };
    }
    // 6. Testar cognitive-core
    try {
      const { data, error } = await supabaseClient.functions.invoke('cognitive-core', {
        body: {
          text: 'Como está meu portfólio?',
          userId: '4362da88-d01c-4ffe-a447-75751ea8e182'
        }
      });
      validationResults.checks.cognitive_core = {
        status: error ? 'ERROR' : 'OK',
        has_response: !!data?.response,
        embedding_engine: data?.metadata?.embedding_engine,
        error: error?.message
      };
    } catch (error) {
      validationResults.checks.cognitive_core = {
        status: 'ERROR',
        error: error.message
      };
    }
    // Determinar status geral
    const allChecks = Object.values(validationResults.checks);
    const errorCount = allChecks.filter((check)=>check.status === 'ERROR').length;
    const okCount = allChecks.filter((check)=>check.status === 'OK').length;
    if (errorCount === 0) {
      validationResults.system_status = 'HEALTHY';
    } else if (okCount > errorCount) {
      validationResults.system_status = 'DEGRADED';
    } else {
      validationResults.system_status = 'UNHEALTHY';
    }
    // Sumário
    validationResults.summary = {
      total_checks: allChecks.length,
      passed: okCount,
      failed: errorCount,
      skipped: allChecks.filter((check)=>check.status === 'SKIPPED').length,
      health_score: Math.round(okCount / allChecks.length * 100),
      ready_for_production: errorCount === 0 && validationResults.checks.gemini_api?.status === 'OK'
    };
    return new Response(JSON.stringify(validationResults, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Validation failed',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
