import { marketApiService } from './marketApi';

export interface PortfolioWithMarketData {
  ticker: string;
  metadata?: any;
  investments: any[];
  totalInvested: number;
  currentPosition: number;
  totalDividends: number;
  totalJuros: number;
  totalImpostos?: number;
  totalYield: number;
  marketValue: number;
  currentPrice: number;
  profit: number;
  profitPercent: number;
  priceChange: number;
  priceChangePercent: number;
  currency: string;
  lastUpdate: number;
}

// 📊 ATUALIZAR PORTFOLIOS COM DADOS REAIS DE MERCADO
export const updatePortfoliosWithMarketData = async (portfolios: any[]): Promise<PortfolioWithMarketData[]> => {
  console.log('💰 Atualizando', portfolios.length, 'portfolios com dados de mercado...');
  
  const updatedPortfolios: PortfolioWithMarketData[] = [];
  
  for (const portfolio of portfolios) {
    try {
      // 📈 Obter dados reais de mercado
      const marketData = await marketApiService.getMarketData(portfolio.ticker);
      
      if (marketData && portfolio.currentPosition > 0) {
        // 💰 CALCULAR VALOR DE MERCADO REAL
        const currentMarketValue = portfolio.currentPosition * marketData.price;
        
        // 📊 LUCRO/PREJUÍZO REAL
        const realProfit = currentMarketValue - portfolio.totalInvested;
        const realProfitPercent = portfolio.totalInvested > 0 ? (realProfit / portfolio.totalInvested) * 100 : 0;
        
        const updatedPortfolio: PortfolioWithMarketData = {
          ...portfolio,
          marketValue: currentMarketValue,
          currentPrice: marketData.price,
          profit: realProfit,
          profitPercent: realProfitPercent,
          priceChange: marketData.change,
          priceChangePercent: marketData.changePercent,
          currency: marketData.currency,
          lastUpdate: marketData.timestamp
        };
        
        updatedPortfolios.push(updatedPortfolio);
        
        console.log(`✅ ${portfolio.ticker}: R$ ${marketData.price.toFixed(2)} (${marketData.changePercent > 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%) - Valor total: R$ ${currentMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      } else {
        // 🚫 Sem dados de mercado, manter valores originais
        const portfolioWithMarketData: PortfolioWithMarketData = {
          ...portfolio,
          currentPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
          currency: portfolio.metadata?.moeda || 'BRL',
          lastUpdate: Date.now()
        };
        
        updatedPortfolios.push(portfolioWithMarketData);
        console.log(`⚠️ ${portfolio.ticker}: Sem dados de mercado disponíveis`);
      }
    } catch (error) {
      console.error(`❌ Erro ao obter dados de ${portfolio.ticker}:`, error);
      
      // 🚫 Erro, manter valores originais
      const portfolioWithMarketData: PortfolioWithMarketData = {
        ...portfolio,
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        currency: portfolio.metadata?.moeda || 'BRL',
        lastUpdate: Date.now()
      };
      
      updatedPortfolios.push(portfolioWithMarketData);
    }
  }
  
  console.log('✅ Portfolios atualizados com dados de mercado!');
  return updatedPortfolios;
};

// 🎯 CALCULAR RESUMO TOTAL DA CARTEIRA
export const calculatePortfolioSummary = (portfolios: PortfolioWithMarketData[]) => {
  const summary = {
    totalInvested: 0,
    totalCurrentValue: 0,
    totalProfit: 0,
    totalProfitPercent: 0,
    totalDividends: 0,
    totalYield: 0,
    activeAssets: 0,
    lastUpdate: Date.now()
  };
  
  for (const portfolio of portfolios) {
    if (portfolio.currentPosition > 0) {
      summary.totalInvested += portfolio.totalInvested;
      summary.totalCurrentValue += portfolio.marketValue;
      summary.totalProfit += portfolio.profit;
      summary.totalDividends += portfolio.totalDividends + portfolio.totalJuros;
      summary.activeAssets++;
    }
  }
  
  summary.totalProfitPercent = summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested) * 100 : 0;
  summary.totalYield = summary.totalInvested > 0 ? (summary.totalDividends / summary.totalInvested) * 100 : 0;
  
  return summary;
}; 