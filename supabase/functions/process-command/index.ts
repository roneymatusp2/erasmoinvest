import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Texto não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processando comando:', text);

    // Prompt para Mistral AI
    const prompt = `
Você é um assistente especializado em investimentos que analisa comandos de voz/texto e extrai informações estruturadas.

COMANDOS SUPORTADOS:
1. ADICIONAR INVESTIMENTO: "Adicione X ações da EMPRESA por Y reais", "Comprei X ações de TICKER a Y reais"
2. CONSULTAR PORTFÓLIO: "Como está meu portfólio?", "Qual o valor total investido?"
3. CONSULTAR ATIVO: "Quantas ações da EMPRESA eu tenho?", "Como está o TICKER?"

RESPONDA SEMPRE EM JSON NO FORMATO:
{
  "action": "add_investment" | "consult_portfolio" | "query_asset" | "error",
  "data": {
    "ticker": "TICKER_DA_EMPRESA",
    "quantidade": numero,
    "valor_unitario": numero,
    "tipo": "COMPRA" | "VENDA"
  },
  "confidence": 0.0-1.0,
  "confirmation": "Mensagem de confirmação em português"
}

COMANDO: "${text}"

ANÁLISE:`;

    // Chamar Mistral AI
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_MISTRAL_text')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Erro na Mistral AI:', errorText);
      throw new Error(`Mistral AI error: ${mistralResponse.status}`);
    }

    const mistralData = await mistralResponse.json();
    console.log('Resposta da Mistral AI:', mistralData);

    // Extrair e parsear a resposta
    const content = mistralData.choices[0]?.message?.content || '';
    
    // Tentar extrair JSON da resposta
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Formato JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      result = {
        action: 'error',
        data: {},
        confidence: 0,
        confirmation: 'Não consegui entender o comando. Tente reformular.'
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao processar comando:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno no processamento',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 