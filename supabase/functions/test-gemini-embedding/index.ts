import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  const t0 = Date.now();
  try {
    // Verificar se a chave existe
    const GEMINI_API_KEY = Deno.env.get('Gemini-Embedding');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Variável Gemini-Embedding não encontrada no ambiente',
        suggestion: 'Configure a variável no Supabase Dashboard > Settings > Environment Variables'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[test-gemini] Chave encontrada, tamanho: ${GEMINI_API_KEY.length} caracteres`);
    console.log(`[test-gemini] Primeiros caracteres: ${GEMINI_API_KEY.substring(0, 10)}...`);
    // Teste real com a API Gemini
    const testText = "Este é um teste para verificar se o embedding Gemini está funcionando corretamente.";
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
              text: testText
            }
          ]
        },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768
      })
    });
    const latency = Date.now() - t0;
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[test-gemini] API Error ${response.status}:`, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Gemini API retornou erro ${response.status}`,
        details: errorText,
        latency_ms: latency,
        suggestions: [
          'Verifique se a chave API está correta',
          'Confirme se a chave tem permissões para Embedding API',
          'Teste a chave diretamente no Google AI Studio'
        ]
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const result = await response.json();
    const embedding = result.embedding?.values;
    if (!embedding || !Array.isArray(embedding)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Resposta inválida da API Gemini',
        response_received: result,
        latency_ms: latency
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validar dimensionalidade
    const dimensions = embedding.length;
    const norm = Math.sqrt(embedding.reduce((sum, val)=>sum + val * val, 0));
    // Testar alguns valores para verificar se não é embedding zero
    const nonZeroValues = embedding.filter((val)=>Math.abs(val) > 0.001).length;
    const maxValue = Math.max(...embedding.map(Math.abs));
    return new Response(JSON.stringify({
      success: true,
      message: '🎉 Gemini Embedding funcionando perfeitamente!',
      test_results: {
        api_key_length: GEMINI_API_KEY.length,
        api_key_prefix: GEMINI_API_KEY.substring(0, 10) + '...',
        latency_ms: latency,
        embedding_dimensions: dimensions,
        expected_dimensions: 768,
        dimensions_match: dimensions === 768,
        embedding_norm: norm.toFixed(6),
        non_zero_values: nonZeroValues,
        max_absolute_value: maxValue.toFixed(6),
        sample_values: embedding.slice(0, 5).map((v)=>v.toFixed(6)),
        quality_check: {
          has_non_zero_values: nonZeroValues > 0,
          reasonable_norm: norm > 0.5 && norm < 2.0,
          reasonable_max: maxValue > 0.01 && maxValue < 1.0,
          overall_quality: nonZeroValues > 100 && norm > 0.5 ? 'EXCELLENT' : 'POOR'
        }
      },
      validation: {
        api_accessible: true,
        correct_model: true,
        correct_dimensions: dimensions === 768,
        embedding_quality: nonZeroValues > 100 ? 'HIGH' : 'LOW',
        ready_for_production: dimensions === 768 && nonZeroValues > 100
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[test-gemini] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno ao testar Gemini',
      details: error.message,
      latency_ms: Date.now() - t0
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
