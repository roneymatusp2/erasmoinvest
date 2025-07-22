import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface CommandRequest {
  text: string;
}

interface CommandResponse {
  success: boolean;
  action: {
    action: string;
    data: any;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  try {
    const { text }: CommandRequest = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Text is required and must be a string' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const textLower = text.toLowerCase().trim();
    console.log('🧠 Processando comando:', textLower);

    let action = 'consult_portfolio';
    let commandData: any = {};

    // Comandos de consulta de portfólio (mais específicos primeiro)
    if (textLower.match(/como (está|esta).*portf[óo]lio|resumo.*portf[óo]lio|resumo.*investimento|situa[çc][ãa]o.*portf[óo]lio|meu.*portf[óo]lio|qual.*resumo|mostrar.*portf[óo]lio/)) {
      action = 'consult_portfolio';
      console.log('✅ Comando identificado: consulta de portfólio');
    }
    // Consulta específica de ativo
    else if (textLower.match(/quantas? a[çc][õo]es.*tenho|quanto.*tenho.*de|posição.*de|tenho.*de/)) {
      const tickerMatch = textLower.match(/\b(vale|petr|bbas|itub|mglu|abev|brbi|voo|vnq|dvn)\b/);
      if (tickerMatch) {
        action = 'query_asset';
        commandData = { ticker: extractTicker(tickerMatch[0]) };
        console.log('✅ Comando identificado: consulta de ativo', commandData.ticker);
      }
    }
    // Consulta de dividendos/proventos  
    else if (textLower.match(/dividendos?|proventos?|renda.*passiva|quanto.*receb/)) {
      action = 'query_income';
      console.log('✅ Comando identificado: consulta de renda');
    }
    // Adicionar investimento (verificar que não é consulta)
    else if (textLower.match(/\b(comprar|adicionar|investir)\b/) && !textLower.match(/resumo|portf[óo]lio|como|quanto|qual/)) {
      action = 'add_investment';
      commandData = { ticker: 'MANUAL', quantidade: 1, valor_unitario: 100 };
      console.log('✅ Comando identificado: adicionar investimento');
    }
    
    console.log('📤 Retornando ação:', action, commandData);

    const response: CommandResponse = {
      success: true,
      action: {
        action,
        data: commandData
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

function extractTicker(assetName: string): string {
  const name = assetName.toLowerCase();
  
  // Mapeamento inteligente de nomes para tickers
  const tickerMap: Record<string, string> = {
    'vale': 'VALE3',
    'petrobras': 'PETR4', 
    'petr': 'PETR4',
    'banco do brasil': 'BBAS3',
    'bbas': 'BBAS3',
    'itau': 'ITUB4',
    'itub': 'ITUB4',
    'bradesco': 'BBDC4',
    'magazine': 'MGLU3',
    'mglu': 'MGLU3',
    'ambev': 'ABEV3',
    'abev': 'ABEV3',
    'brbi': 'BRBI11',
    'brbi11': 'BRBI11',
    'voo': 'VOO',
    'vnq': 'VNQ',
    'realty': 'O',
    'devon': 'DVN',
    'dvn': 'DVN'
  };

  // Buscar por nome conhecido
  for (const [key, ticker] of Object.entries(tickerMap)) {
    if (name.includes(key)) {
      return ticker;
    }
  }

  // Se já parece um ticker, retornar como está
  if (/^[A-Z]{4}[0-9]?$/.test(assetName.toUpperCase())) {
    return assetName.toUpperCase();
  }

  // Padrão para FIIs (exceto BRBI11)
  if (/^[A-Z]{4}11$/.test(assetName.toUpperCase()) && assetName.toUpperCase() !== 'BRBI11') {
    return assetName.toUpperCase();
  }

  // Fallback
  return assetName.toUpperCase();
}