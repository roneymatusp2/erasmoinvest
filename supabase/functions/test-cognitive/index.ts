import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
      ErasmoInvest_NewsAPI: !!Deno.env.get('ErasmoInvest_NewsAPI')
    };

    console.log('Environment check:', envCheck);

    // Testar conexão com Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Testar query simples
    const { data: testData, error: testError } = await supabaseClient
      .from('investments')
      .select('ticker')
      .limit(1);

    if (testError) {
      console.error('Supabase test error:', testError);
    }

    // Testar OpenRouter
    let openRouterTest = false;
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('QWEN_OPENROUTER_API')}`,
        }
      });
      openRouterTest = response.ok;
    } catch (e) {
      console.error('OpenRouter test failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        envCheck,
        supabaseConnected: !testError,
        supabaseData: testData,
        openRouterConnected: openRouterTest,
        question
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});