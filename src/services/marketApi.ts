import { Portfolio } from '../types/investment';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
const brapiApiKey = import.meta.env.VITE_BRAPI_API_KEY;

interface MarketDataResponse {
  currentPrice: number;
  priceChangePercent: number;
  currency: string;
}

const getUSDBRLExchangeRate = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke('usd-brl-rate');
    if (error) throw error;
    if (data?.rate) {
      return Number(data.rate);
    }
    throw new Error('Formato de resposta inesperado da Edge Function');
  } catch (err) {
    toast.error('API de câmbio offline. Usando valor padrão.');
    return 5.5; // Fallback
  }
};

const getTesouroDiretoData = async (ticker: string): Promise<MarketDataResponse | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('tesouro-direto-proxy');
        if (error) throw error;

        const titulos = data.response?.TrsrBdTradgList;
        if (!titulos) return null;

        const searchTerm = ticker.toUpperCase().replace('TESOURO ', '').trim();
        const titulo = titulos.find((t: any) => t.TrsrBd?.nm?.toUpperCase().includes(searchTerm));

        if (!titulo) return null;

        const precoUnitario = titulo.TrsrBd?.untrRedVal || 0;
        return {
            currentPrice: parseFloat(precoUnitario),
            priceChangePercent: 0,
            currency: 'BRL',
        };
    } catch (error) {
        console.error(`Erro ao buscar dados do Tesouro Direto para ${ticker}:`, error);
        return null;
    }
};

// FUNÇÃO CORRIGIDA: Agora aceita `ticker: string` como argumento.
const getMarketData = async (ticker: string): Promise<MarketDataResponse | null> => {
    if (ticker.toUpperCase().includes('TESOURO')) {
        return getTesouroDiretoData(ticker);
    }
    try {
        if (['VOO', 'VNQ', 'DVN', 'EVEX', 'O', 'AAPL', 'MSFT'].includes(ticker)) {
            if (!finnhubApiKey) return null;
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubApiKey}`);
            if (!response.ok) return null;
            const data = await response.json();
            return { currentPrice: data.c || 0, priceChangePercent: data.dp || 0, currency: 'USD' };
        }
        if (!brapiApiKey) return null;
        const response = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${brapiApiKey}`);
        if (!response.ok) return null;
        const data = await response.json();
        const result = data.results?.[0];
        return { currentPrice: result?.regularMarketPrice || 0, priceChangePercent: result?.regularMarketChangePercent || 0, currency: result?.currency || 'BRL' };
    } catch (error) {
        console.error(`Erro ao buscar dados de mercado para ${ticker}`, error);
        return null;
    }
};

// FUNÇÃO CORRIGIDA: Agora passa `portfolio.ticker` para getMarketData.
const getMultipleMarketData = async (portfolios: Portfolio[]): Promise<Map<string, MarketDataResponse>> => {
    const marketDataMap = new Map<string, MarketDataResponse>();
    for (const portfolio of portfolios) {
        const data = await getMarketData(portfolio.ticker);
        if (data) {
            marketDataMap.set(portfolio.ticker, data);
        }
    }
    return marketDataMap;
};

export const marketApiService = {
    getMarketData,
    getMultipleMarketData,
    getUSDBRLExchangeRate,
};