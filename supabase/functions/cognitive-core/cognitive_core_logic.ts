import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenRouter } from 'https://deno.land/x/openrouter/mod.ts';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenRouter (Qwen) client
const openRouter = new OpenRouter(Deno.env.get('OPENROUTER_API_KEY'));

// Função para gerar a explicação do gráfico
async function getChartExplanation(title: string, data: any) {
  const systemPrompt = `
    Você é o "Erasmo", um co-piloto financeiro especialista em análise de investimentos para um investidor brasileiro.
    Sua tarefa é analisar os dados de um gráfico e fornecer uma explicação clara, concisa e valiosa em português do Brasil.

    **Instruções:**
    1.  **Contexto:** O gráfico se chama "${title}".
    2.  **Dados:** Os dados do gráfico estão no seguinte formato JSON: ${JSON.stringify(data, null, 2)}
    3.  **Análise:** Analise os dados para identificar a tendência principal, pontos de alta e baixa, e qualquer padrão significativo.
    4.  **Linguagem:** Use uma linguagem acessível, mas com termos financeiros corretos. Seja direto e evite jargões desnecessários.
    5.  **Formato:** A resposta deve ser um único parágrafo de texto.
    6.  **Foco:** Concentre-se em insights que ajudem o investidor a entender a performance de seus ativos ou patrimônio.
  `;

  const chatCompletion = await openRouter.chat.completions.create({
    model: 'qwen/qwen-110b-chat',
    messages: [{ role: 'system', content: systemPrompt }],
  });

  return chatCompletion.choices[0].message.content;
}

// Função para gerar o áudio da explicação
async function getTextToSpeech(text: string, supabaseClient: any) {
    const { data, error } = await supabaseClient.functions.invoke('text-to-speech', {
        body: { text },
    });
    if (error) {
        throw new Error(`Text-to-Speech function failed: ${error.message}`);
    }
    return data.audioUrl; // Assumindo que a função retorna a URL do áudio
}

// Servidor principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, payload, userId } = await req.json();

    // Roteamento de Ações
    if (action === 'explain_chart') {
      const { title, data } = payload;
      
      if (!title || !data) {
        throw new Error('Título e dados do gráfico são obrigatórios para a explicação.');
      }

      // 1. Gerar texto da IA
      const explanationText = await getChartExplanation(title, data);

      // 2. Gerar áudio (simulado, pois não tenho o Supabase client aqui)
      // Em um cenário real, você passaria o `supabaseClient` para a função TTS
      const audioUrl = `https://example.com/audio-for-${encodeURIComponent(title)}.mp3`; // Placeholder

      return new Response(
        JSON.stringify({ explanationText, audioUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Adicione outras ações do cognitive-core aqui (ex: process_command)
    // if (action === 'process_command') { ... }

    // Ação não encontrada
    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
