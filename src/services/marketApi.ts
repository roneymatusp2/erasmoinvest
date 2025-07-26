import { Portfolio, MarketDataResponse } from '../types/investment';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
const brapiApiKey = import.meta.env.VITE_BRAPI_API_KEY;


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

// FUNÇÃO OTIMIZADA: Busca dados em paralelo com timeout
const getMultipleMarketData = async (portfolios: Portfolio[]): Promise<Map<string, MarketDataResponse>> => {
    const marketDataMap = new Map<string, MarketDataResponse>();
    
    // Processar em lotes para evitar sobrecarga
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < portfolios.length; i += batchSize) {
        batches.push(portfolios.slice(i, i + batchSize));
    }
    
    console.log(`📊 Buscando dados de mercado em ${batches.length} lotes de até ${batchSize} ativos...`);
    
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔄 Processando lote ${i + 1}/${batches.length}: ${batch.map(p => p.ticker).join(', ')}`);
        
        // Processar lote em paralelo com timeout
        const promises = batch.map(portfolio => 
            Promise.race([
                getMarketData(portfolio.ticker),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)) // 3s timeout
            ])
        );
        
        const results = await Promise.all(promises);
        
        // Adicionar resultados ao mapa
        results.forEach((data, index) => {
            if (data) {
                marketDataMap.set(batch[index].ticker, data);
            } else {
                console.warn(`⚠️ Timeout ou erro ao buscar dados de ${batch[index].ticker}`);
            }
        });
        
        // Pequena pausa entre lotes para não sobrecarregar
        if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`✅ Dados de mercado obtidos para ${marketDataMap.size} de ${portfolios.length} ativos`);
    return marketDataMap;
};

export const marketApiService = {
    getMarketData,
    getMultipleMarketData,
    getUSDBRLExchangeRate,
};