import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const OPENROUTER_API_KEY = Deno.env.get('QWEN_OPENROUTER_API');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
Você é um especialista em processamento de linguagem natural para o sistema de investimentos ErasmoInvest.
Sua tarefa é analisar o texto do usuário e extrair a intenção e os parâmetros, retornando um objeto JSON estruturado.

Ações Suportadas e seus Parâmetros:

1.  **add_investment**: Adicionar uma nova compra de ativo.
    -   \`ticker\`: (string, obrigatório) O código do ativo (ex: "PETR4", "HGLG11").
    -   \`quantity\`: (number, obrigatório) A quantidade de cotas/ações compradas.
    -   \`price\`: (number, obrigatório) O preço de compra por unidade.
    -   \`date\`: (string, opcional) A data da compra no formato "YYYY-MM-DD". Se não informada, use a data de hoje.

2.  **sell_investment**: Registrar uma venda de ativo.
    -   \`ticker\`: (string, obrigatório) O código do ativo.
    -   \`quantity\`: (number, obrigatório) A quantidade vendida.
    -   \`price\`: (number, obrigatório) O preço de venda por unidade.
    -   \`date\`: (string, opcional) A data da venda no formato "YYYY-MM-DD".

3.  **add_dividend**: Registrar o recebimento de dividendos ou juros.
    -   \`ticker\`: (string, obrigatório) O código do ativo que pagou os proventos.
    -   \`amount\`: (number, obrigatório) O valor total recebido.
    -   \`date\`: (string, opcional) A data do recebimento no formato "YYYY-MM-DD".

4.  **consult_portfolio**: Consultar o resumo geral da carteira.
    -   Nenhum parâmetro necessário.

5.  **query_asset**: Consultar um ativo específico na carteira.
    -   \`ticker\`: (string, obrigatório) O código do ativo a ser consultado.

6.  **query_market_price**: Consultar a cotação de um ativo no mercado.
    -   \`ticker\`: (string, obrigatório) O código do ativo.

7.  **unsupported_action**: Se o comando não se encaixa em nenhuma das ações acima.
    -   \`original_text\`: (string) O texto original do usuário.

Regras:
-   Sempre retorne um JSON válido.
-   Se um parâmetro obrigatório não for encontrado, não o inclua no JSON.
-   Normalize os tickers para o formato "XXXX11" (ex: HGLG 11 -> HGLG11).
-   Converta valores monetários para números (ex: "R$ 28,50" -> 28.50).
-   A data de hoje é: ${new Date().toISOString().slice(0, 10)}.
-   Se o usuário apenas cumprimentar ou fizer uma pergunta genérica, use **unsupported_action**.

Exemplos:
-   Usuário: "adicione 100 ações de petr4 a 28.50"
    JSON: {"action": "add_investment", "parameters": {"ticker": "PETR4", "quantity": 100, "price": 28.50}}
-   Usuário: "vendi 50 itsa4 por 10 reais cada"
    JSON: {"action": "sell_investment", "parameters": {"ticker": "ITSA4", "quantity": 50, "price": 10.00}}
-   Usuário: "recebi 150 reais de dividendos do mxrf11 ontem"
    JSON: {"action": "add_dividend", "parameters": {"ticker": "MXRF11", "amount": 150.00, "date": "${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}"}}
-   Usuário: "como está minha carteira?"
    JSON: {"action": "consult_portfolio", "parameters": {}}
-   Usuário: "qual o preço da vale3?"
    JSON: {"action": "query_market_price", "parameters": {"ticker": "VALE3"}}
-   Usuário: "quanto eu tenho de tesouro selic 2026?"
    JSON: {"action": "get_ticker_balance", "parameters": {"ticker": "TESOURO SELIC 2026"}}
-   Usuário: "quanto vale a petrobras agora?"
    JSON: {"action": "query_market_price", "parameters": {"ticker": "PETR4"}}
`;

async function processWithQwen(text: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('QWEN_OPENROUTER_API não configurada.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://erasmoinvest.com',
      'X-Title': 'ErasmoInvest',
    },
    body: JSON.stringify({
            model: 'qwen/qwen3-32b-instruct', // Modelo intermediário poderoso para extração
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API do OpenRouter (Qwen): ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const { text, userId } = await req.json();
    if (!text) {
      throw new Error('Texto do comando é obrigatório');
    }

    console.log(`[process-command] User ${userId || 'anônimo'}: "${text.substring(0, 80)}..."`);

        const structuredCommand = await processWithQwen(text);

    const latency = Date.now() - t0;
    await supabaseClient.from('agent_logs').insert({
      function_name: 'process-command',
      latency_ms: latency,
      status_code: 200,
      metadata: { command: structuredCommand }
    });

    return new Response(JSON.stringify(structuredCommand), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-command] Erro fatal:', error);
    await supabaseClient.from('agent_logs').insert({
      function_name: 'process-command',
      latency_ms: Date.now() - t0,
      status_code: 500,
      error_message: error.message,
    });

    return new Response(
      JSON.stringify({
        error: error.message,
        response: '😔 Ops! Não consegui processar seu comando no momento. Por favor, tente novamente.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
