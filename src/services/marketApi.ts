// Serviço de APIs de mercado financeiro
import toast from 'react-hot-toast';
import { searchMappings } from '../data/tickerMapping';

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  currency: string;
  source: string;
  timestamp: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  market: string;
  currency: string;
  logo?: string;
  relevance: number;
}

// Múltiplas APIs para preços atualizados
class MarketApiService {
  private readonly ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
  private readonly FINNHUB_KEY = 'cvu1cmhr01qjg136up40cvu1cmhr01qjg136up4g';
  private readonly BRAPI_KEY = import.meta.env.VITE_BRAPI_API_KEY || 'iM7qSWmznjW7iNPwMEoAK4';
  private readonly BRAPI_BASE = 'https://brapi.dev/api';
  private cache = new Map<string, { data: MarketData; expiry: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minuto

  constructor() {
    console.log('🚀 MarketApiService inicializado');
    console.log('📈 BRAPI Key:', this.BRAPI_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('📊 Alpha Vantage Key:', this.ALPHA_VANTAGE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('📈 Finnhub Key:', this.FINNHUB_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
  }

  // Limpar cache expirado
  private cleanCache() {
    const now = Date.now();
    for (const [key, { expiry }] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Método público para limpar todo o cache
  clearCache(): void {
    console.log('🗑️ Limpando cache de preços...');
    this.cache.clear();
  }

  // Obter dados do cache se válido
  private getCachedData(symbol: string): MarketData | null {
    this.cleanCache();
    const cached = this.cache.get(symbol);
    if (cached && Date.now() < cached.expiry) {
      console.log('📦 Cache hit para', symbol);
      return cached.data;
    }
    return null;
  }

  // Armazenar no cache
  private setCacheData(symbol: string, data: MarketData) {
    this.cache.set(symbol, {
      data,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  // Determinar se é ação brasileira ou americana
  private isBrazilianStock(symbol: string): boolean {
    // Ações brasileiras terminam com 3, 4 ou 11, ou são títulos do Tesouro Direto
    return symbol.endsWith('3') || symbol.endsWith('4') || symbol.endsWith('11') || symbol.startsWith('TESOURO_');
  }

  // Determinar se é ação americana
  private isAmericanStock(symbol: string): boolean {
    // Lista de ações americanas conhecidas
    const knownUS = ['DVN', 'EVEX', 'O', 'VOO', 'VNQ'];
    return knownUS.includes(symbol) || (!this.isBrazilianStock(symbol) && symbol.length <= 5);
  }

  // API 1: Brapi.dev para ações brasileiras
  private async getBrapiData(symbol: string): Promise<MarketData | null> {
    try {
      console.log('📈 Consultando Brapi para', symbol);
      
      // Tentar buscar por símbolo direto
      const response = await fetch(`${this.BRAPI_BASE}/quote/${symbol}?token=${this.BRAPI_KEY}&fundamental=false`);
      
      if (!response.ok) {
        throw new Error(`Brapi HTTP ${response.status}`);
      }

      const data = await response.json();
      const quote = data.results?.[0];

      if (!quote) {
        throw new Error('Nenhum resultado encontrado');
      }

      const marketData: MarketData = {
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        currency: quote.currency || 'BRL',
        source: 'brapi.dev',
        timestamp: Date.now()
      };

      console.log('✅ Brapi data:', marketData);
      return marketData;
    } catch (error) {
      console.error('❌ Erro Brapi:', error);
      return null;
    }
  }

  // API 2: Finnhub para ações americanas
  private async getFinnhubData(symbol: string): Promise<MarketData | null> {
    try {
      console.log('📊 Consultando Finnhub para', symbol);
      
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.FINNHUB_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Finnhub HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.c || data.c === 0) {
        throw new Error('Nenhum preço encontrado');
      }

      const currentPrice = data.c;
      const change = data.d || 0;
      const changePercent = data.dp || 0;

      const marketData: MarketData = {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: data.v || 0,
        currency: 'USD',
        source: 'finnhub.io',
        timestamp: Date.now()
      };

      console.log('✅ Finnhub data:', marketData);
      return marketData;
    } catch (error) {
      console.error('❌ Erro Finnhub:', error);
      return null;
    }
  }

  // API 3: Alpha Vantage para ações americanas (fallback)
  private async getAlphaVantageData(symbol: string): Promise<MarketData | null> {
    if (!this.ALPHA_VANTAGE_KEY) {
      console.log('⚠️ Alpha Vantage API key não disponível');
      return null;
    }

    try {
      console.log('📊 Consultando Alpha Vantage para', symbol);
      
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage HTTP ${response.status}`);
      }

      const data = await response.json();
      const quote = data['Global Quote'];

      if (!quote || Object.keys(quote).length === 0) {
        throw new Error('Nenhum resultado encontrado');
      }

      const price = parseFloat(quote['05. price'] || '0');
      const change = parseFloat(quote['09. change'] || '0');
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0');

      const marketData: MarketData = {
        symbol: quote['01. symbol'],
        price,
        change,
        changePercent,
        volume: parseInt(quote['06. volume'] || '0'),
        currency: 'USD',
        source: 'alphavantage.co',
        timestamp: Date.now()
      };

      console.log('✅ Alpha Vantage data:', marketData);
      return marketData;
    } catch (error) {
      console.error('❌ Erro Alpha Vantage:', error);
      return null;
    }
  }

  // API 4: Fallback com dados simulados baseados em padrões reais
  private getSimulatedData(symbol: string): MarketData {
    console.log('🎲 Gerando dados simulados para', symbol);
    
    const isBR = this.isBrazilianStock(symbol);
    const isUS = this.isAmericanStock(symbol);
    
    // Preços baseados em padrões realistas por tipo
    let basePrice = 50;
    
    if (isBR) {
      if (symbol.startsWith('TESOURO_')) {
        // Títulos do Tesouro Direto
        basePrice = 8000 + Math.random() * 4000; // R$ 8.000-12.000 (preço unitário)
      } else if (symbol.endsWith('11')) {
        // FIIs brasileiros
        basePrice = 80 + Math.random() * 40; // R$ 80-120
      } else {
        // Ações brasileiras  
        basePrice = 15 + Math.random() * 60; // R$ 15-75
      }
    } else if (isUS) {
      // Ações americanas
      basePrice = 50 + Math.random() * 150; // $50-200
    }

    const changePercent = (Math.random() - 0.5) * 8; // -4% a +4%
    const change = (basePrice * changePercent) / 100;

    return {
      symbol,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000),
      currency: isBR ? 'BRL' : 'USD',
      source: 'simulado',
      timestamp: Date.now()
    };
  }

  // Método principal para obter dados de mercado
  async getMarketData(symbol: string): Promise<MarketData> {
    // 🔄 FORÇAR ATUALIZAÇÃO - Verificar cache primeiro
    const cached = this.getCachedData(symbol);
    const debugMode = localStorage.getItem('forceApiUpdate') === 'true';
    
    console.log(`📊 MarketAPI para ${symbol}:`, {
      hasCached: !!cached,
      debugMode,
      cacheSize: this.cache.size
    });
    
    if (cached && !debugMode) {
      console.log(`✅ Cache hit para ${symbol}: R$ ${cached.price}`);
      return cached;
    }
    
    if (debugMode) {
      console.log(`🔄 Debug mode: forçando nova consulta para ${symbol}`);
    }

    const isBR = this.isBrazilianStock(symbol);
    let marketData: MarketData | null = null;

    try {
      const isUS = this.isAmericanStock(symbol);
      
      if (isBR) {
        // Para ações brasileiras: tentar Brapi primeiro
        marketData = await this.getBrapiData(symbol);
        
        // Se falhar, não tentar APIs americanas para tickers brasileiros
        if (!marketData) {
          marketData = this.getSimulatedData(symbol);
        }
      } else if (isUS) {
        // Para ações americanas: tentar Finnhub primeiro, depois Alpha Vantage
        marketData = await this.getFinnhubData(symbol);
        
        if (!marketData) {
          marketData = await this.getAlphaVantageData(symbol);
        }
      } else {
        // Para tickers não identificados, tentar todas as APIs
        marketData = await this.getBrapiData(symbol) || 
                     await this.getFinnhubData(symbol) || 
                     await this.getAlphaVantageData(symbol);
      }

      // Se ainda não tem dados, usar simulação
      if (!marketData) {
        marketData = this.getSimulatedData(symbol);
      }

      // Armazenar no cache
      this.setCacheData(symbol, marketData);
      
      return marketData;
    } catch (error) {
      console.error('❌ Erro geral ao obter dados de mercado:', error);
      const simulated = this.getSimulatedData(symbol);
      this.setCacheData(symbol, simulated);
      return simulated;
    }
  }

  // Buscar múltiplos símbolos
  async getMultipleMarketData(symbols: string[]): Promise<Map<string, MarketData>> {
    console.log('📊 Buscando dados para múltiplos símbolos:', symbols);
    
    const results = new Map<string, MarketData>();
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.getMarketData(symbol);
        results.set(symbol, data);
      } catch (error) {
        console.error(`❌ Erro para ${symbol}:`, error);
        results.set(symbol, this.getSimulatedData(symbol));
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Buscar ação por nome/ticker
  async searchTickers(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Primeiro, buscar em mapeamentos locais
    const localResults = searchMappings(query);
    results.push(...localResults.map(mapping => ({
      symbol: mapping.officialTicker,
      name: mapping.friendlyName,
      type: mapping.sector,
      market: mapping.market,
      currency: mapping.market === 'BRASIL' ? 'BRL' : 'USD',
      relevance: 0.8
    })));

    // Buscar via Brapi para ações brasileiras
    if (query.length >= 2) {
      try {
        const response = await fetch(`${this.BRAPI_BASE}/available?token=${this.BRAPI_KEY}`);
        if (response.ok) {
          const data = await response.json();
          const brapiStocks = data.stocks || [];
          
          const matches = brapiStocks
            .filter((stock: any) => 
              stock.stock?.toLowerCase().includes(query.toLowerCase()) ||
              stock.name?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 10)
            .map((stock: any) => ({
              symbol: stock.stock,
              name: stock.name || stock.stock,
              type: 'ACAO',
              market: 'BRASIL',
              currency: 'BRL',
              relevance: stock.stock?.toLowerCase().startsWith(query.toLowerCase()) ? 0.9 : 0.6
            }));

          results.push(...matches);
        }
      } catch (error) {
        console.error('Erro ao buscar na Brapi:', error);
      }
    }

    // Buscar via Finnhub para ações americanas
    if (query.length >= 2) {
      try {
        const response = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${this.FINNHUB_KEY}`);
        if (response.ok) {
          const data = await response.json();
          const finnhubResults = data.result || [];
          
          const matches = finnhubResults
            .slice(0, 10)
            .map((stock: any) => ({
              symbol: stock.symbol,
              name: stock.description || stock.symbol,
              type: stock.type || 'STOCK',
              market: 'EUA',
              currency: 'USD',
              relevance: stock.symbol?.toLowerCase().startsWith(query.toLowerCase()) ? 0.9 : 0.7
            }));

          results.push(...matches);
        }
      } catch (error) {
        console.error('Erro ao buscar no Finnhub:', error);
      }
    }

    // Remover duplicatas e ordenar por relevância
    const uniqueResults = results.reduce((acc, current) => {
      const existing = acc.find(item => item.symbol === current.symbol);
      if (!existing || current.relevance > existing.relevance) {
        return acc.filter(item => item.symbol !== current.symbol).concat(current);
      }
      return acc;
    }, [] as SearchResult[]);

    return uniqueResults
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20);
  }

  // Obter detalhes de um ticker específico
  async getTickerDetails(symbol: string) {
    try {
      const isBR = this.isBrazilianStock(symbol);
      
      if (isBR) {
        const response = await fetch(`${this.BRAPI_BASE}/quote/${symbol}?token=${this.BRAPI_KEY}&fundamental=true&dividends=true`);
        if (response.ok) {
          return await response.json();
        }
      } else {
        // Tentar Finnhub primeiro
        const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${this.FINNHUB_KEY}`);
        if (response.ok) {
          const profile = await response.json();
          if (profile && Object.keys(profile).length > 0) {
            return profile;
          }
        }

        // Fallback para Alpha Vantage
        if (this.ALPHA_VANTAGE_KEY) {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${this.ALPHA_VANTAGE_KEY}`
          );
          if (response.ok) {
            return await response.json();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter detalhes do ticker:', error);
      return null;
    }
  }

  // Obter estatísticas do cache
  getCacheStats() {
    this.cleanCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }


}

// Instância singleton
export const marketApiService = new MarketApiService();

// Backward compatibility
export const getMarketData = (symbol: string) => marketApiService.getMarketData(symbol);