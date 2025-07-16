const { Mistral } = require('@mistralai/mistralai');

// Inicializar Mistral com chave da variável de ambiente
const mistral = new Mistral({
  apiKey: process.env.ErasmoInvest_API_MISTRAL,
});

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Responder a preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    console.log('Iniciando processamento de comando...');

    // Parse do body para obter o texto transcrito
    let transcribedText;
    
    try {
      const body = JSON.parse(event.body);
      transcribedText = body.text;
    } catch (parseError) {
      console.error('Erro ao fazer parse do body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato de dados inválido' })
      };
    }

    if (!transcribedText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Texto não encontrado no request' })
      };
    }

    console.log('Texto para processar:', transcribedText);

    // Processar com Mistral AI usando function calling
    const chatResponse = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'system',
          content: `Você é o assistente de IA do ErasmoInvest, um sistema profissional de controle de investimentos.

OBJETIVO: Analise comandos de voz em português brasileiro e extraia informações precisas para executar ações no sistema de investimentos.

TIPOS DE COMANDO SUPORTADOS:
1. ADICIONAR INVESTIMENTO: "Adicione/Comprei [quantidade] [ações/cotas] [do/da] [nome da empresa/ticker] [por/a] [preço] [reais] [na data] [data]"
2. CONSULTAR PORTFOLIO: "Mostra/Como está meu portfólio", "Qual o valor total", "Como estão minhas ações"
3. CONSULTAR ATIVO: "Como está [ticker/nome]", "Preço [da/do] [nome]"

REGRAS PARA EXTRAÇÃO:
- Preços podem ser "25 e 50 centavos" = 25.50, "trinta e cinco" = 35.00
- Datas: "hoje" = data atual, "ontem" = data anterior, "15 de julho" = 2025-07-15
- Tickers: "Banco do Brasil" = BBAS3, "Petrobras" = PETR4, "Vale" = VALE3
- Quantidades: "cinco" = 5, "dez" = 10, "vinte" = 20

EXEMPLO DE RESPOSTA JSON:
{
  "action": "add_investment",
  "data": {
    "ticker": "BBAS3",
    "nome": "Banco do Brasil",
    "quantity": 5,
    "price": 25.50,
    "date": "2025-01-16",
    "type": "acao",
    "total": 127.50
  },
  "confidence": 0.95,
  "confirmation": "Adicionando 5 ações do Banco do Brasil (BBAS3) a R$ 25,50 cada, totalizando R$ 127,50"
}

Responda SEMPRE em JSON válido.`
        },
        {
          role: 'user',
          content: transcribedText
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'add_investment',
            description: 'Adiciona um novo investimento ao portfólio do usuário',
            parameters: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'Código do ticker da ação/FII (ex: BBAS3, ALZR11)'
                },
                nome: {
                  type: 'string',
                  description: 'Nome completo da empresa/fundo'
                },
                quantity: {
                  type: 'number',
                  description: 'Quantidade de ações/cotas compradas'
                },
                price: {
                  type: 'number',
                  description: 'Preço unitário da ação/cota'
                },
                date: {
                  type: 'string',
                  format: 'date',
                  description: 'Data da operação no formato YYYY-MM-DD'
                },
                type: {
                  type: 'string',
                  enum: ['acao', 'fii', 'tesouro_direto', 'etf'],
                  description: 'Tipo do investimento'
                },
                total: {
                  type: 'number',
                  description: 'Valor total da operação (quantity * price)'
                }
              },
              required: ['ticker', 'quantity', 'price', 'date', 'type']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'query_portfolio',
            description: 'Consulta informações do portfólio do usuário',
            parameters: {
              type: 'object',
              properties: {
                query_type: {
                  type: 'string',
                  enum: ['total_value', 'performance', 'assets', 'summary'],
                  description: 'Tipo de consulta desejada'
                }
              },
              required: ['query_type']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'query_asset',
            description: 'Consulta informações de um ativo específico',
            parameters: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'Código do ticker para consulta'
                }
              },
              required: ['ticker']
            }
          }
        }
      ],
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 800
    });

    const assistantMessage = chatResponse.choices[0].message;
    console.log('Resposta do Mistral:', assistantMessage);

    // Processar resposta
    let result;
    
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Se há function calls, processar
      const toolCall = assistantMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      result = {
        action: functionName,
        data: functionArgs,
        confidence: 0.9,
        confirmation: generateConfirmation(functionName, functionArgs),
        raw_response: assistantMessage.content
      };
    } else {
      // Se não há function calls, tentar parsear o conteúdo como JSON
      try {
        result = JSON.parse(assistantMessage.content);
      } catch {
        result = {
          action: 'unknown',
          data: {},
          confidence: 0.5,
          confirmation: assistantMessage.content || 'Comando não reconhecido',
          raw_response: assistantMessage.content
        };
      }
    }

    console.log('Resultado processado:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        result: result,
        original_text: transcribedText
      })
    };

  } catch (error) {
    console.error('Erro no processamento:', error);
    
    // Tratamento específico para diferentes tipos de erro
    if (error.code === 'rate_limit_exceeded') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Limite de taxa excedido',
          details: 'Tente novamente em alguns segundos'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno no processamento',
        details: error.message
      })
    };
  }
};

// Função auxiliar para gerar mensagens de confirmação
function generateConfirmation(functionName, args) {
  switch (functionName) {
    case 'add_investment':
      const total = args.quantity * args.price;
      return `Adicionando ${args.quantity} ${args.type === 'acao' ? 'ações' : 'cotas'} ${args.nome ? 'da ' + args.nome : 'do ticker ' + args.ticker} (${args.ticker}) a R$ ${args.price.toFixed(2)} cada, totalizando R$ ${total.toFixed(2)}`;
    
    case 'query_portfolio':
      return `Consultando ${args.query_type === 'total_value' ? 'valor total' : 'informações'} do portfólio`;
    
    case 'query_asset':
      return `Consultando informações do ativo ${args.ticker}`;
    
    default:
      return 'Comando processado com sucesso';
  }
} 