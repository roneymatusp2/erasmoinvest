// Serviço de conversão de moedas
import toast from 'react-hot-toast';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  source: string;
}

class CurrencyService {
  private readonly EXCHANGE_API_KEY = import.meta.env.VITE_EXCHANGE_API_KEY;
  private readonly BRAPI_KEY = import.meta.env.VITE_BRAPI_API_KEY || 'iM7qSWmznjW7iNPwMEoAK4';
  private cache = new Map<string, { rate: ExchangeRate; expiry: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutos

  constructor() {
    console.log('💱 CurrencyService inicializado');
    console.log('🔑 Exchange API Key:', this.EXCHANGE_API_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('📈 BRAPI Key:', this.BRAPI_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
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

  // Obter dados do cache se válido
  private getCachedRate(pair: string): ExchangeRate | null {
    this.cleanCache();
    const cached = this.cache.get(pair);
    if (cached && Date.now() < cached.expiry) {
      console.log('💱 Cache hit para', pair);
      return cached.rate;
    }
    return null;
  }

  // Armazenar no cache
  private setCacheRate(pair: string, rate: ExchangeRate) {
    this.cache.set(pair, {
      rate,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  // API 1: Brapi.dev para cotação USD/BRL
  private async getBrapiExchangeRate(): Promise<ExchangeRate | null> {
    try {
      console.log('💱 Consultando Brapi para USD/BRL');
      
      const response = await fetch(`https://brapi.dev/api/quote/USDBRL=X?token=${this.BRAPI_KEY}`);
      
      if (!response.ok) {
        throw new Error(`Brapi HTTP ${response.status}`);
      }

      const data = await response.json();
      const quote = data.results?.[0];

      if (!quote) {
        throw new Error('Nenhum resultado encontrado');
      }

      const rate: ExchangeRate = {
        from: 'USD',
        to: 'BRL',
        rate: quote.regularMarketPrice || 0,
        timestamp: Date.now(),
        source: 'brapi.dev'
      };

      console.log('✅ Brapi USD/BRL:', rate.rate);
      return rate;
    } catch (error) {
      console.error('❌ Erro Brapi USD/BRL:', error);
      return null;
    }
  }

  // API 2: ExchangeRate-API.com (backup)
  private async getExchangeRateAPI(): Promise<ExchangeRate | null> {
    try {
      console.log('💱 Consultando ExchangeRate-API para USD/BRL');
      
      const url = this.EXCHANGE_API_KEY 
        ? `https://v6.exchangerate-api.com/v6/${this.EXCHANGE_API_KEY}/pair/USD/BRL`
        : 'https://api.exchangerate-api.com/v4/latest/USD';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ExchangeRate-API HTTP ${response.status}`);
      }

      const data = await response.json();
      
      let exchangeRate = 0;
      if (this.EXCHANGE_API_KEY && data.conversion_rate) {
        exchangeRate = data.conversion_rate;
      } else if (data.rates?.BRL) {
        exchangeRate = data.rates.BRL;
      }

      if (!exchangeRate) {
        throw new Error('Taxa de câmbio não encontrada');
      }

      const rate: ExchangeRate = {
        from: 'USD',
        to: 'BRL',
        rate: exchangeRate,
        timestamp: Date.now(),
        source: 'exchangerate-api.com'
      };

      console.log('✅ ExchangeRate-API USD/BRL:', rate.rate);
      return rate;
    } catch (error) {
      console.error('❌ Erro ExchangeRate-API:', error);
      return null;
    }
  }

  // Fallback com cotação estimada
  private getFallbackRate(): ExchangeRate {
    // Cotação estimada baseada em valores típicos do mercado
    const estimatedRate = 5.20 + (Math.random() - 0.5) * 0.30; // R$ 5.05 - R$ 5.35
    
    console.log('🎲 Usando cotação estimada USD/BRL:', estimatedRate);
    
    return {
      from: 'USD',
      to: 'BRL',
      rate: parseFloat(estimatedRate.toFixed(4)),
      timestamp: Date.now(),
      source: 'estimativa'
    };
  }

  // Método principal para obter cotação USD/BRL
  async getUSDToBRLRate(): Promise<ExchangeRate> {
    const cacheKey = 'USD-BRL';
    
    // Verificar cache primeiro
    const cached = this.getCachedRate(cacheKey);
    if (cached) {
      return cached;
    }

    let rate: ExchangeRate | null = null;

    try {
      // Tentar Brapi primeiro (mais confiável para mercado brasileiro)
      rate = await this.getBrapiExchangeRate();
      
      // Se falhar, tentar ExchangeRate-API
      if (!rate) {
        rate = await this.getExchangeRateAPI();
      }
      
      // Se ainda não tem cotação, usar fallback
      if (!rate) {
        rate = this.getFallbackRate();
      }

      // Armazenar no cache
      this.setCacheRate(cacheKey, rate);
      
      return rate;
    } catch (error) {
      console.error('❌ Erro geral ao obter cotação:', error);
      const fallback = this.getFallbackRate();
      this.setCacheRate(cacheKey, fallback);
      return fallback;
    }
  }

  // Converter valor de USD para BRL
  async convertUSDToBRL(usdAmount: number): Promise<{ brlAmount: number; rate: ExchangeRate }> {
    const rate = await this.getUSDToBRLRate();
    const brlAmount = usdAmount * rate.rate;
    
    return {
      brlAmount: parseFloat(brlAmount.toFixed(2)),
      rate
    };
  }

  // Converter múltiplos valores USD para BRL
  async convertMultipleUSDToBRL(usdAmounts: number[]): Promise<{ brlAmounts: number[]; rate: ExchangeRate }> {
    const rate = await this.getUSDToBRLRate();
    const brlAmounts = usdAmounts.map(usd => parseFloat((usd * rate.rate).toFixed(2)));
    
    return {
      brlAmounts,
      rate
    };
  }

  // Verificar se um ticker é americano (USD)
  isUSAsset(ticker: string): boolean {
    const usAssets = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O'];
    return usAssets.includes(ticker);
  }

  // Obter estatísticas do cache
  getCacheStats() {
    this.cleanCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Limpar cache manualmente
  clearCache(): void {
    console.log('🗑️ Limpando cache de cotações...');
    this.cache.clear();
  }
}

// Instância singleton
export const currencyService = new CurrencyService();