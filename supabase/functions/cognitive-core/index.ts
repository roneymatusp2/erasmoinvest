// /supabase/functions/cognitive-core/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { qwenClient } from '../commons/openrouter_client.ts';
import { getPortfolioData, getMarketData, queryKnowledgeGraph } from '../commons/tools.ts';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const SYSTEM_PROMPT_ORCHESTRATOR = `Você é um co-piloto financeiro de elite, objetivo e factual. Sua função é receber uma pergunta do usuário e um conjunto de dados brutos ("CONTEXT_DATA") coletados por agentes especialistas. Você NUNCA responde com base no seu conhecimento prévio, apenas com os dados fornecidos no contexto.

Sua tarefa é seguir 3 passos:
1.  **Analisar a pergunta do usuário.**
2.  **Examinar cuidadosamente os dados fornecidos em \`CONTEXT_DATA\`.**
3.  **Sintetizar os dados em uma resposta final, completa e bem escrita em português.** A resposta deve ser direta, profissional e integrar as informações de forma coerente. Para cada fato ou número apresentado, você DEVE citar sua fonte usando o formato \`[fonte: NOME_DA_FONTE]\`.

Exemplo de resposta:
"O seu preço médio em PETR4 é de R$ 32,50 [fonte: portfolio_data]. Atualmente, a cotação está em R$ 35,80 [fonte: market_data]. Uma notícia recente indica um sentimento positivo para o setor de energia [fonte: knowledge_graph]."`;

serve(async (req) => {
  try {
    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "A pergunta é obrigatória." }), { status: 400 });
    }

    console.log(`Recebida pergunta: "${question}"`);

    // ETAPA DE COLETA DE DADOS (Execução das Ferramentas)
    const [portfolioData, graphData] = await Promise.all([
      getPortfolioData(supabaseClient).catch(err => {
        console.error("Erro ao buscar portfólio:", err);
        return [];
      }),
      queryKnowledgeGraph(supabaseClient, question).catch(err => {
        console.error("Erro ao buscar no grafo:", err);
        return [];
      })
    ]);

  // Extrai tickers do portfólio e do grafo para buscar dados de mercado
  const portfolioTickers = Array.isArray(portfolioData) ? portfolioData.map(item => item.ticker) : [];
  const graphTickers = Array.isArray(graphData) ? graphData.filter(item => item.type === 'ticker').map(item => item.label) : [];
  const allTickers = [...new Set([...portfolioTickers, ...graphTickers])].filter(Boolean);

  const marketData = allTickers.length > 0 ? await getMarketData(allTickers) : [];

  // Construção do contexto para o Orquestrador
  const contextData = {
    portfolio_data: portfolioData,
    market_data: marketData,
    knowledge_graph: graphData,
  };

  console.log("Contexto montado. Enviando para o Orquestrador Qwen3...");

  // ETAPA DE SÍNTESE com o Orquestrador Qwen3 235B
  console.log("Chamando Qwen3 com contexto:", JSON.stringify(contextData).substring(0, 200) + "...");

  const completion = await qwenClient.chat.completions.create({
    model: "qwen/qwen-2.5-72b-instruct", // Modelo atualizado e disponível
    messages: [
      { role: "system", content: SYSTEM_PROMPT_ORCHESTRATOR },
      {
        role: "user",
        content: `PERGUNTA DO USUÁRIO: "${question}"\n\nCONTEXT_DATA:\n${JSON.stringify(contextData, null, 2)}`
      }
    ],
    temperature: 0.1,
  }).catch(err => {
    console.error("Erro ao chamar Qwen:", err);
    throw new Error(`Erro ao chamar modelo de IA: ${err.message}`);
  });

  if (!completion?.choices?.[0]?.message?.content) {
    throw new Error("Resposta vazia do modelo de IA");
  }

  const finalResponse = completion.choices[0].message.content;
  console.log("Resposta final recebida do Orquestrador.");

  return new Response(JSON.stringify({ response: finalResponse }), {
    headers: { "Content-Type": "application/json" }
  });

  } catch (error) {
    console.error("Erro no cognitive-core:", error);
    return new Response(JSON.stringify({
      error: "Erro ao processar análise",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
