import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache para cotações (5 minutos)
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tickers, action = 'quote' } = await req.json();

    if (!tickers || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Tickers não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando dados de mercado para:', tickers, 'Ação:', action);

    const brapiKey = Deno.env.get('VITE_BRAPI_API_KEY');
    if (!brapiKey) {
      throw new Error('BRAPI API key não configurada');
    }

    const results = [];

    for (const ticker of tickers) {
      // Verificar cache
      const cacheKey = `${ticker}_${action}`;
      const cached = priceCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        results.push(cached.data);
        continue;
      }

      try {
        let endpoint = '';
        let data = null;

        switch (action) {
          case 'quote':
            // Cotação atual
            endpoint = `https://brapi.dev/api/quote/${ticker}?token=${brapiKey}`;
            break;
            
          case 'history':
            // Histórico de preços (últimos 30 dias)
            endpoint = `https://brapi.dev/api/quote/${ticker}/history?token=${brapiKey}&range=1mo&interval=1d`;
            break;
            
          case 'dividends':
            // Histórico de dividendos
            endpoint = `https://brapi.dev/api/quote/${ticker}/dividends?token=${brapiKey}`;
            break;
            
          case 'fundamentals':
            // Indicadores fundamentalistas
            endpoint = `https://brapi.dev/api/quote/${ticker}?fundamental=true&token=${brapiKey}`;
            break;
            
          default:
            throw new Error(`Ação "${action}" não suportada`);
        }

        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.error(`Erro ao buscar dados de ${ticker}:`, response.status);
          data = {
            ticker,
            error: `Erro ao buscar dados: ${response.status}`,
            success: false
          };
        } else {
          const jsonData = await response.json();
          
          if (jsonData.results && jsonData.results.length > 0) {
            data = processMarketData(jsonData.results[0], action);
          } else {
            data = {
              ticker,
              error: 'Dados não encontrados',
              success: false
            };
          }
        }

        // Adicionar ao cache
        priceCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        results.push(data);

      } catch (tickerError) {
        console.error(`Erro ao processar ${ticker}:`, tickerError);
        results.push({
          ticker,
          error: tickerError.message,
          success: false
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao buscar dados de mercado:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao buscar dados de mercado',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Processar dados de mercado baseado na ação
function processMarketData(data: any, action: string) {
  const result: any = {
    ticker: data.symbol,
    success: true
  };

  switch (action) {
    case 'quote':
      result.price = data.regularMarketPrice || 0;
      result.change = data.regularMarketChange || 0;
      result.changePercent = data.regularMarketChangePercent || 0;
      result.previousClose = data.regularMarketPreviousClose || 0;
      result.volume = data.regularMarketVolume || 0;
      result.marketCap = data.marketCap || 0;
      result.currency = data.currency || 'BRL';
      result.lastUpdate = data.regularMarketTime;
      result.name = data.longName || data.shortName || data.symbol;
      
      // Adicionar indicadores se disponíveis
      if (data.priceEarnings) result.pe = data.priceEarnings;
      if (data.earningsPerShare) result.eps = data.earningsPerShare;
      if (data.dividendYield) result.dividendYield = data.dividendYield;
      break;
      
    case 'history':
      result.history = data.historicalDataPrice || [];
      result.period = '1mo';
      break;
      
    case 'dividends':
      result.dividends = data.dividendsData || [];
      result.totalDividends = calculateTotalDividends(data.dividendsData);
      break;
      
    case 'fundamentals':
      result.price = data.regularMarketPrice || 0;
      result.fundamentals = {
        pe: data.priceEarnings || null,
        eps: data.earningsPerShare || null,
        dividendYield: data.dividendYield || null,
        dividendRate: data.dividendRate || null,
        beta: data.beta || null,
        pegRatio: data.pegRatio || null,
        priceToBook: data.priceToBook || null,
        marketCap: data.marketCap || null,
        enterpriseValue: data.enterpriseValue || null,
        forwardPE: data.forwardPE || null,
        profitMargins: data.profitMargins || null,
        enterpriseToRevenue: data.enterpriseToRevenue || null,
        enterpriseToEbitda: data.enterpriseToEbitda || null,
        52WeekHigh: data.fiftyTwoWeekHigh || null,
        52WeekLow: data.fiftyTwoWeekLow || null
      };
      break;
  }

  return result;
}

// Calcular total de dividendos
function calculateTotalDividends(dividends: any[]): number {
  if (!dividends || dividends.length === 0) return 0;
  
  return dividends.reduce((total, div) => {
    return total + (div.rate || div.amount || 0);
  }, 0);
}
