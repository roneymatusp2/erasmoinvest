import { marketApiService } from './marketApi';
import { currencyService } from './currencyService';

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
  originalCurrency?: string;
  exchangeRate?: number;
  convertedToBRL?: boolean;
}

// 📊 ATUALIZAR PORTFOLIOS COM DADOS REAIS DE MERCADO E CONVERSÃO USD/BRL
export const updatePortfoliosWithMarketData = async (portfolios: any[]): Promise<PortfolioWithMarketData[]> => {
  console.log('💰 Atualizando', portfolios.length, 'portfolios com dados de mercado...');
  
  // 💱 Obter cotação USD/BRL uma vez para todos os ativos americanos
  const exchangeRate = await currencyService.getUSDToBRLRate();
  console.log(`💱 Cotação USD/BRL: ${exchangeRate.rate.toFixed(4)} (${exchangeRate.source})`);
  
  const updatedPortfolios: PortfolioWithMarketData[] = [];
  
  for (const portfolio of portfolios) {
    try {
      // 📈 Obter dados reais de mercado
      const marketData = await marketApiService.getMarketData(portfolio.ticker);
      
      if (marketData && portfolio.currentPosition > 0) {
        const isUSAsset = currencyService.isUSAsset(portfolio.ticker);
        
        // 💰 CALCULAR VALORES COM CONVERSÃO DE MOEDA
        let currentPrice = marketData.price;
        let totalInvested = portfolio.totalInvested;
        let currentMarketValue = portfolio.currentPosition * marketData.price;
        
        if (isUSAsset && marketData.currency === 'USD') {
          // 💱 CONVERTER VALORES USD PARA BRL
          console.log(`💱 Convertendo ${portfolio.ticker} de USD para BRL...`);
          
          // Converter preço atual
          const { brlAmount: priceInBRL } = await currencyService.convertUSDToBRL(marketData.price);
          currentPrice = priceInBRL;
          
          // Converter valor investido (se estiver em USD)
          if (portfolio.metadata?.moeda === 'USD' || marketData.currency === 'USD') {
            const { brlAmount: investedInBRL } = await currencyService.convertUSDToBRL(portfolio.totalInvested);
            totalInvested = investedInBRL;
          }
          
          // Calcular valor de mercado em BRL
          currentMarketValue = portfolio.currentPosition * priceInBRL;
          
          console.log(`💱 ${portfolio.ticker}: $${marketData.price.toFixed(2)} → R$ ${priceInBRL.toFixed(2)}`);
        }
        
        // 📊 LUCRO/PREJUÍZO REAL EM BRL
        const realProfit = currentMarketValue - totalInvested;
        const realProfitPercent = totalInvested > 0 ? (realProfit / totalInvested) * 100 : 0;
        
        const updatedPortfolio: PortfolioWithMarketData = {
          ...portfolio,
          totalInvested,
          marketValue: currentMarketValue,
          currentPrice,
          profit: realProfit,
          profitPercent: realProfitPercent,
          priceChange: isUSAsset ? marketData.change * exchangeRate.rate : marketData.change,
          priceChangePercent: marketData.changePercent,
          currency: 'BRL', // Sempre BRL no dashboard
          originalCurrency: marketData.currency,
          exchangeRate: isUSAsset ? exchangeRate.rate : 1,
          convertedToBRL: isUSAsset,
          lastUpdate: marketData.timestamp
        };
        
        updatedPortfolios.push(updatedPortfolio);
        
        const displaySymbol = isUSAsset ? '🇺🇸→🇧🇷' : '🇧🇷';
        console.log(`✅ ${portfolio.ticker} ${displaySymbol}: R$ ${currentPrice.toFixed(2)} (${marketData.changePercent > 0 ? '+' : ''}${marketData.changePercent.toFixed(2)}%) - Valor total: R$ ${currentMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      } else {
        // 🚫 Sem dados de mercado, manter valores originais
        const isUSAsset = currencyService.isUSAsset(portfolio.ticker);
        let adjustedTotalInvested = portfolio.totalInvested;
        
        // Se for ativo americano, converter valor investido para BRL
        if (isUSAsset && portfolio.metadata?.moeda === 'USD') {
          const { brlAmount: investedInBRL } = await currencyService.convertUSDToBRL(portfolio.totalInvested);
          adjustedTotalInvested = investedInBRL;
          console.log(`💱 ${portfolio.ticker} (sem market data): Valor investido convertido para R$ ${investedInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        }
        
        const portfolioWithMarketData: PortfolioWithMarketData = {
          ...portfolio,
          totalInvested: adjustedTotalInvested,
          marketValue: adjustedTotalInvested, // Usar valor investido como proxy
          currentPrice: 0,
          priceChange: 0,
          priceChangePercent: 0,
          currency: 'BRL', // Sempre BRL no dashboard
          originalCurrency: portfolio.metadata?.moeda || 'BRL',
          exchangeRate: isUSAsset ? exchangeRate.rate : 1,
          convertedToBRL: isUSAsset,
          lastUpdate: Date.now()
        };
        
        updatedPortfolios.push(portfolioWithMarketData);
        console.log(`⚠️ ${portfolio.ticker}: Sem dados de mercado disponíveis`);
      }
    } catch (error) {
      console.error(`❌ Erro ao obter dados de ${portfolio.ticker}:`, error);
      
      // 🚫 Erro, manter valores originais com conversão se necessário
      const isUSAsset = currencyService.isUSAsset(portfolio.ticker);
      let adjustedTotalInvested = portfolio.totalInvested;
      
      // Se for ativo americano, tentar converter valor investido para BRL
      if (isUSAsset && portfolio.metadata?.moeda === 'USD') {
        try {
          const { brlAmount: investedInBRL } = await currencyService.convertUSDToBRL(portfolio.totalInvested);
          adjustedTotalInvested = investedInBRL;
          console.log(`💱 ${portfolio.ticker} (erro): Valor investido convertido para R$ ${investedInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        } catch (conversionError) {
          console.error(`❌ Erro na conversão de moeda para ${portfolio.ticker}:`, conversionError);
        }
      }
      
      const portfolioWithMarketData: PortfolioWithMarketData = {
        ...portfolio,
        totalInvested: adjustedTotalInvested,
        marketValue: adjustedTotalInvested,
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        currency: 'BRL',
        originalCurrency: portfolio.metadata?.moeda || 'BRL',
        exchangeRate: isUSAsset ? exchangeRate.rate : 1,
        convertedToBRL: isUSAsset,
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