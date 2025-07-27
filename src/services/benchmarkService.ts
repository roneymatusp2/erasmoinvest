export interface BenchmarkData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  data: Array<{
    date: string;
    value: number;
    change: number;
  }>;
}

export interface BenchmarkConfig {
  symbol: string;
  name: string;
  type: 'index' | 'rate' | 'etf';
  source: 'brapi' | 'alpha_vantage' | 'finnhub' | 'bcb';
  apiSymbol?: string;
}

export const BENCHMARK_CONFIGS: BenchmarkConfig[] = [
  {
    symbol: 'IBOV',
    name: 'Ibovespa',
    type: 'index',
    source: 'brapi',
    apiSymbol: '^BVSP'
  },
  {
    symbol: 'SMLL',
    name: 'Small Caps',
    type: 'index',
    source: 'brapi',
    apiSymbol: '^SMLL'
  },
  {
    symbol: 'SPX',
    name: 'S&P 500',
    type: 'index',
    source: 'alpha_vantage',
    apiSymbol: 'SPX'
  },
  {
    symbol: 'IDIV',
    name: 'IDIV11',
    type: 'etf',
    source: 'brapi',
    apiSymbol: 'IDIV11.SA'
  },
  {
    symbol: 'IVVB11',
    name: 'IVVB11',
    type: 'etf',
    source: 'brapi',
    apiSymbol: 'IVVB11.SA'
  },
  {
    symbol: 'CDI',
    name: 'CDI',
    type: 'rate',
    source: 'bcb',
    apiSymbol: '12'
  },
  {
    symbol: 'IPCA',
    name: 'IPCA',
    type: 'rate',
    source: 'bcb',
    apiSymbol: '433'
  }
];

class BenchmarkService {
  private readonly BRAPI_BASE_URL = 'https://brapi.dev/api';
  private readonly ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  private readonly FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
  private readonly BCB_BASE_URL = 'https://api.bcb.gov.br/dados/serie';

  private getApiKey(source: string): string {
    switch (source) {
      case 'brapi':
        return import.meta.env.VITE_BRAPI_API_KEY || '';
      case 'alpha_vantage':
        return import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
      case 'finnhub':
        return import.meta.env.VITE_FINNHUB_API_KEY || '';
      case 'exchangerate':
        return import.meta.env.EXCHANGERATE_API_KEY || '';
      default:
        return '';
    }
  }

  async fetchFromBrapi(symbol: string, range: string = '1y'): Promise<any> {
    const apiKey = this.getApiKey('brapi');
    const url = `${this.BRAPI_BASE_URL}/quote/${symbol}?range=${range}&interval=1d&fundamental=false&dividends=false&token=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching from BRAPI for ${symbol}:`, error);
      return null;
    }
  }

  async fetchFromAlphaVantage(symbol: string): Promise<any> {
    const apiKey = this.getApiKey('alpha_vantage');
    const url = `${this.ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching from Alpha Vantage for ${symbol}:`, error);
      return null;
    }
  }

  async fetchFromBCB(seriesCode: string): Promise<any> {
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '/');
    const url = `${this.BCB_BASE_URL}/bcdata.sgs.${seriesCode}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching from BCB for series ${seriesCode}:`, error);
      return null;
    }
  }

  private processBrapiData(data: any, config: BenchmarkConfig): BenchmarkData | null {
    if (!data?.results?.[0]) return null;

    const result = data.results[0];
    const historicalData = result.historicalDataPrice || [];

    return {
      symbol: config.symbol,
      name: config.name,
      value: result.regularMarketPrice || 0,
      change: result.regularMarketChange || 0,
      changePercent: result.regularMarketChangePercent || 0,
      data: historicalData.map((item: any) => ({
        date: new Date(item.date * 1000).toISOString().split('T')[0],
        value: item.close,
        change: ((item.close - item.open) / item.open) * 100
      })).reverse()
    };
  }

  private processAlphaVantageData(data: any, config: BenchmarkConfig): BenchmarkData | null {
    if (!data?.['Time Series (Daily)']) return null;

    const timeSeries = data['Time Series (Daily)'];
    const dates = Object.keys(timeSeries).sort();
    const latestDate = dates[dates.length - 1];
    const latest = timeSeries[latestDate];
    
    const currentValue = parseFloat(latest['4. close']);
    const previousValue = dates.length > 1 ? parseFloat(timeSeries[dates[dates.length - 2]]['4. close']) : currentValue;
    const change = currentValue - previousValue;
    const changePercent = (change / previousValue) * 100;

    return {
      symbol: config.symbol,
      name: config.name,
      value: currentValue,
      change: change,
      changePercent: changePercent,
      data: dates.slice(-252).map(date => {
        const dayData = timeSeries[date];
        const close = parseFloat(dayData['4. close']);
        const open = parseFloat(dayData['1. open']);
        return {
          date,
          value: close,
          change: ((close - open) / open) * 100
        };
      })
    };
  }

  private processBCBData(data: any, config: BenchmarkConfig): BenchmarkData | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : latest;
    
    const currentValue = parseFloat(latest.valor);
    const previousValue = parseFloat(previous.valor);
    const change = currentValue - previousValue;
    const changePercent = (change / previousValue) * 100;

    return {
      symbol: config.symbol,
      name: config.name,
      value: currentValue,
      change: change,
      changePercent: changePercent,
      data: data.slice(-252).map(item => ({
        date: item.data.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD
        value: parseFloat(item.valor),
        change: 0 // BCB data doesn't provide daily change
      }))
    };
  }

  async fetchBenchmarkData(symbol: string): Promise<BenchmarkData | null> {
    const config = BENCHMARK_CONFIGS.find(c => c.symbol === symbol);
    if (!config) return null;

    try {
      let rawData;
      
      switch (config.source) {
        case 'brapi':
          rawData = await this.fetchFromBrapi(config.apiSymbol || symbol);
          return this.processBrapiData(rawData, config);
          
        case 'alpha_vantage':
          rawData = await this.fetchFromAlphaVantage(config.apiSymbol || symbol);
          return this.processAlphaVantageData(rawData, config);
          
        case 'bcb':
          rawData = await this.fetchFromBCB(config.apiSymbol || symbol);
          return this.processBCBData(rawData, config);
          
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error fetching benchmark data for ${symbol}:`, error);
      return null;
    }
  }

  async fetchMultipleBenchmarks(symbols: string[]): Promise<BenchmarkData[]> {
    const promises = symbols.map(symbol => this.fetchBenchmarkData(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<BenchmarkData> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  getAvailableBenchmarks(): BenchmarkConfig[] {
    return BENCHMARK_CONFIGS;
  }

  // Calculate portfolio performance vs benchmark
  calculateRelativePerformance(portfolioData: Array<{date: string, value: number}>, benchmarkData: BenchmarkData): Array<{date: string, portfolio: number, benchmark: number, relative: number}> {
    if (!portfolioData.length || !benchmarkData.data.length) return [];

    const alignedData: Array<{date: string, portfolio: number, benchmark: number, relative: number}> = [];
    
    // Find common date range
    const portfolioStart = portfolioData[0].value;
    const benchmarkStart = benchmarkData.data[0]?.value || 1;
    
    portfolioData.forEach(portfolioPoint => {
      const benchmarkPoint = benchmarkData.data.find(b => b.date === portfolioPoint.date);
      if (benchmarkPoint) {
        const portfolioReturn = ((portfolioPoint.value - portfolioStart) / portfolioStart) * 100;
        const benchmarkReturn = ((benchmarkPoint.value - benchmarkStart) / benchmarkStart) * 100;
        const relativeReturn = portfolioReturn - benchmarkReturn;
        
        alignedData.push({
          date: portfolioPoint.date,
          portfolio: portfolioReturn,
          benchmark: benchmarkReturn,
          relative: relativeReturn
        });
      }
    });
    
    return alignedData;
  }
}

export const benchmarkService = new BenchmarkService();