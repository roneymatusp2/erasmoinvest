import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de comandos e sinônimos
const COMMAND_PATTERNS = {
  add_investment: [
    /compr(?:ei|ar|ou)/i,
    /adquir(?:i|ir)/i,
    /adicion(?:ei|ar|ou)/i,
    /registr(?:e|ar) (?:compra|aquisição)/i,
    /investi(?:r|do) em/i,
    /paguei .* por/i,
    /compra de/i
  ],
  sell_investment: [
    /vend(?:i|er|eu)/i,
    /desfiz/i,
    /liquidei/i,
    /realizei lucro/i,
    /me desfiz/i,
    /registr(?:e|ar) venda/i,
    /venda de/i
  ],
  add_dividend: [
    /recebi .* dividen/i,
    /dividen.* pag(?:ou|ar)/i,
    /caiu .* dividen/i,
    /entrou .* dividen/i,
    /pingo(?:u)? .* dividen/i
  ],
  add_interest: [
    /recebi .* jur/i,
    /jur.* pag(?:ou|ar)/i,
    /caiu .* jcp/i,
    /juros sobre capital/i,
    /jcp de/i
  ],
  consult_portfolio: [
    /como (?:está|anda) (?:meu|minha) (?:portfólio|carteira)/i,
    /resumo (?:do|da) (?:portfólio|carteira)/i,
    /valor total investido/i,
    /quanto tenho investido/i,
    /patrimônio total/i,
    /análise (?:do|da) (?:portfólio|carteira)/i,
    /visão geral/i
  ],
  query_asset: [
    /quanto(?:s|as)? .* tenho (?:de|em)/i,
    /minha posição (?:em|na)/i,
    /como está? (?:o|a)/i,
    /situação (?:do|da)/i,
    /análise (?:do|da) (?!portfólio|carteira)/i,
    /informações sobre/i
  ],
  query_income: [
    /quanto recebi de (?:dividen|proven)/i,
    /total de (?:dividen|proven|jur)/i,
    /yield (?:total|médio)/i,
    /renda passiva/i,
    /rendimentos/i,
    /proventos/i
  ],
  generate_report: [
    /ger(?:e|ar) (?:um )?relatório/i,
    /relatório (?:completo|detalhado)/i,
    /análise (?:completa|profunda)/i,
    /dashboard/i,
    /report/i
  ],
  market_analysis: [
    /cotação (?:de|do|da)/i,
    /preço (?:atual|de mercado)/i,
    /quanto (?:está|vale)/i,
    /valorização/i,
    /desempenho/i,
    /comparar com mercado/i
  ]
};

// Padrões para extrair valores
const VALUE_PATTERNS = {
  ticker: /\b([A-Z]{4}\d{1,2}|[A-Z]{3,5})\b/g,
  quantidade: /(\d+(?:\.\d+)?)\s*(?:ações?|cotas?|unidades?|papéis)/i,
  valor: /R?\$?\s*(\d+(?:[.,]\d+)?(?:[.,]\d+)?)/,
  valorUnitario: /(?:por|a|@)\s*R?\$?\s*(\d+(?:[.,]\d+)?)/i
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, context = {} } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Texto não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processando comando:', text);

    // Primeiro, tentar identificar o comando por padrões
    const detectedCommand = detectCommand(text);
    const extractedData = extractData(text);

    // Se temos dados suficientes do regex, usar diretamente
    if (detectedCommand && canExecuteDirectly(detectedCommand, extractedData)) {
      console.log('Comando detectado por padrão:', detectedCommand, extractedData);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          result: {
            action: detectedCommand,
            data: extractedData,
            confidence: 0.95,
            confirmation: generateConfirmation(detectedCommand, extractedData)
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Se não conseguiu extrair completamente, usar Mistral AI
    const enhancedPrompt = createEnhancedPrompt(text, detectedCommand, extractedData, context);

    // Chamar Mistral AI com modelo mais poderoso
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_MISTRAL')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-medium-latest', // Modelo mais poderoso
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em investimentos brasileiros. 
Extraia comandos estruturados com alta precisão. 
Sempre responda APENAS em JSON válido, sem texto adicional.
Use números sem formatação (ex: 1234.56 ao invés de 1.234,56).
Para tickers brasileiros: FIIs terminam com 11, ações com 3-8, BDRs com 34-39.`
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
        safe_prompt: false
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
    
    let result;
    try {
      result = JSON.parse(content);
      
      // Validar e normalizar resultado
      result = normalizeResult(result, extractedData);
      
      // Se a ação requer dados de mercado, buscar
      if (result.action === 'market_analysis' || 
          (result.action === 'query_asset' && context.includeMarketData)) {
        result.marketData = await fetchMarketData(result.data.ticker);
      }
      
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      
      // Tentar extrair JSON de forma mais flexível
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
          result = normalizeResult(result, extractedData);
        } catch (e) {
          result = createErrorResult();
        }
      } else {
        result = createErrorResult();
      }
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

// Detectar comando por padrões
function detectCommand(text: string): string | null {
  for (const [command, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return command;
      }
    }
  }
  return null;
}

// Extrair dados do texto
function extractData(text: string): any {
  const data: any = {};
  
  // Extrair ticker
  const tickerMatches = text.match(VALUE_PATTERNS.ticker);
  if (tickerMatches) {
    // Filtrar tickers válidos
    const validTickers = tickerMatches.filter(t => 
      t.match(/^[A-Z]{4}\d{1,2}$/) || // Tickers BR
      t.match(/^[A-Z]{1,5}$/) // Tickers US
    );
    if (validTickers.length > 0) {
      data.ticker = validTickers[0];
    }
  }
  
  // Extrair quantidade
  const quantMatch = text.match(VALUE_PATTERNS.quantidade);
  if (quantMatch) {
    data.quantidade = parseFloat(quantMatch[1].replace(',', '.'));
  }
  
  // Extrair valor unitário
  const valorUnitMatch = text.match(VALUE_PATTERNS.valorUnitario);
  if (valorUnitMatch) {
    data.valor_unitario = parseFloat(valorUnitMatch[1].replace('.', '').replace(',', '.'));
  }
  
  // Extrair valor total (para dividendos/juros)
  if (!data.valor_unitario) {
    const valorMatch = text.match(VALUE_PATTERNS.valor);
    if (valorMatch) {
      data.valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.'));
    }
  }
  
  return data;
}

// Verificar se podemos executar diretamente
function canExecuteDirectly(command: string, data: any): boolean {
  switch (command) {
    case 'add_investment':
    case 'sell_investment':
      return data.ticker && data.quantidade && data.valor_unitario;
    case 'add_dividend':
    case 'add_interest':
      return data.ticker && data.valor;
    case 'query_asset':
      return data.ticker;
    case 'consult_portfolio':
    case 'query_income':
    case 'generate_report':
      return true;
    default:
      return false;
  }
}

// Criar prompt aprimorado
function createEnhancedPrompt(text: string, detectedCommand: string | null, extractedData: any, context: any): string {
  let prompt = `
Analise o comando e extraia informações estruturadas.

COMANDO: "${text}"

CONTEXTO ADICIONAL:
- Comando detectado: ${detectedCommand || 'não detectado'}
- Dados já extraídos: ${JSON.stringify(extractedData)}
- Data atual: ${new Date().toISOString().split('T')[0]}
- Usuário: ${context.userId || 'não identificado'}

COMANDOS SUPORTADOS:
1. add_investment: Compra de ativos
2. sell_investment: Venda de ativos
3. add_dividend: Registro de dividendos
4. add_interest: Registro de juros/JCP
5. consult_portfolio: Consulta do portfólio completo
6. query_asset: Consulta de ativo específico
7. query_income: Consulta de proventos
8. generate_report: Gerar relatório completo
9. market_analysis: Análise de mercado/cotação

FORMATO DE RESPOSTA (JSON):
{
  "action": "nome_da_acao",
  "data": {
    "ticker": "TICKER",
    "quantidade": numero,
    "valor_unitario": numero,
    "valor": numero,
    "tipo": "COMPRA|VENDA|DIVIDENDO|JUROS"
  },
  "confidence": 0.0-1.0,
  "confirmation": "Mensagem de confirmação em português"
}

REGRAS:
- Se o ticker não foi identificado mas o usuário mencionou uma empresa conhecida, tente inferir
- Para valores monetários, remova formatação (R$, pontos, vírgulas)
- Se faltam dados essenciais, use action: "error" e explique o que falta
- Sempre gere uma mensagem de confirmação clara em português

ANÁLISE:`;

  return prompt;
}

// Normalizar resultado
function normalizeResult(result: any, extractedData: any): any {
  // Mesclar dados extraídos com resultado da IA
  if (extractedData.ticker && !result.data?.ticker) {
    result.data = result.data || {};
    result.data.ticker = extractedData.ticker;
  }
  
  // Normalizar ticker
  if (result.data?.ticker) {
    result.data.ticker = result.data.ticker.toUpperCase();
  }
  
  // Garantir campos numéricos
  const numericFields = ['quantidade', 'valor_unitario', 'valor'];
  numericFields.forEach(field => {
    if (result.data?.[field]) {
      result.data[field] = Number(result.data[field]);
    }
  });
  
  // Definir tipo baseado na ação
  if (!result.data?.tipo) {
    switch (result.action) {
      case 'add_investment':
        result.data.tipo = 'COMPRA';
        break;
      case 'sell_investment':
        result.data.tipo = 'VENDA';
        break;
      case 'add_dividend':
        result.data.tipo = 'DIVIDENDO';
        break;
      case 'add_interest':
        result.data.tipo = 'JUROS';
        break;
    }
  }
  
  // Garantir confidence
  if (!result.confidence) {
    result.confidence = 0.8;
  }
  
  return result;
}

// Gerar mensagem de confirmação
function generateConfirmation(action: string, data: any): string {
  const { ticker, quantidade, valor_unitario, valor } = data;
  
  switch (action) {
    case 'add_investment':
      return `Registrar compra de ${quantidade} ${ticker} por R$ ${valor_unitario.toFixed(2)} cada?`;
    case 'sell_investment':
      return `Registrar venda de ${quantidade} ${ticker} por R$ ${valor_unitario.toFixed(2)} cada?`;
    case 'add_dividend':
      return `Registrar dividendo de R$ ${valor.toFixed(2)} de ${ticker}?`;
    case 'add_interest':
      return `Registrar juros/JCP de R$ ${valor.toFixed(2)} de ${ticker}?`;
    case 'query_asset':
      return `Consultando informações de ${ticker}...`;
    case 'consult_portfolio':
      return `Analisando seu portfólio completo...`;
    case 'query_income':
      return `Consultando seus proventos...`;
    case 'generate_report':
      return `Gerando relatório detalhado...`;
    default:
      return `Processando comando...`;
  }
}

// Criar resultado de erro
function createErrorResult(): any {
  return {
    action: 'error',
    data: {},
    confidence: 0,
    confirmation: 'Desculpe, não consegui entender o comando. Por favor, tente reformular de forma mais clara.'
  };
}

// Buscar dados de mercado
async function fetchMarketData(ticker: string): Promise<any> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Chamar edge function de dados de mercado
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { tickers: [ticker], action: 'quote' }
    });
    
    if (error) throw error;
    
    return data.results?.[0] || null;
  } catch (error) {
    console.error('Erro ao buscar dados de mercado:', error);
    return null;
  }
}
