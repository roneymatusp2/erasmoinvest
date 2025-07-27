import { Investment } from './supabaseService';

export interface WeightedReturnPoint {
  date: string;
  monthLabel: string;
  weightedReturn: number;
  portfolioValue: number;
  totalInvested: number;
  totalDividends: number;
}

export interface MonthlyData {
  date: string;
  cashFlow: number;
  portfolioValue: number;
  dividends: number;
  weightedReturn: number;
}

export class WeightedReturnService {
  /**
   * Calcula a rentabilidade ponderada (TWR - Time Weighted Return)
   * que elimina distorções causadas por aportes e retiradas
   */
  static calculateWeightedReturn(investments: Investment[], portfolios: any[]): WeightedReturnPoint[] {
    if (!investments || investments.length === 0) return [];

    // Ordenar investimentos por data
    const sortedInvestments = [...investments].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Gerar dados mensais dos últimos 12 meses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 12);

    const monthlyData: MonthlyData[] = [];
    
    // Gerar array de 12 meses
    for (let i = 0; i < 12; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + i);
      
      const monthKey = currentDate.toISOString().substring(0, 7);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Calcular valor da carteira no final do mês
      const portfolioValue = this.calculatePortfolioValueAtDate(portfolios, monthEnd);
      
      // Calcular fluxo de caixa do mês (aportes - retiradas)
      const cashFlow = this.calculateMonthlyCashFlow(sortedInvestments, monthKey);
      
      // Calcular dividendos recebidos no mês
      const dividends = this.calculateMonthlyDividends(sortedInvestments, monthKey);
      
      monthlyData.push({
        date: monthKey,
        cashFlow,
        portfolioValue,
        dividends,
        weightedReturn: 0 // Será calculado depois
      });
    }

    // Calcular rentabilidade ponderada para cada período
    let baseValue = monthlyData[0]?.portfolioValue || 0;
    
    return monthlyData.map((month, index) => {
      let weightedReturn = 0;
      
      if (index > 0 && baseValue > 0) {
        const previousMonth = monthlyData[index - 1];
        
        // Fórmula TWR: ((Valor Final + Dividendos) / (Valor Inicial + Aportes)) - 1
        const finalValue = month.portfolioValue + month.dividends;
        const initialValue = previousMonth.portfolioValue + month.cashFlow;
        
        if (initialValue > 0) {
          const periodReturn = (finalValue / initialValue) - 1;
          weightedReturn = index === 1 ? periodReturn * 100 : 
            ((1 + monthlyData[index - 1].weightedReturn / 100) * (1 + periodReturn) - 1) * 100;
        }
      }

      month.weightedReturn = weightedReturn;

      return {
        date: month.date,
        monthLabel: new Date(month.date + '-15').toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: '2-digit' 
        }),
        weightedReturn: Math.round(weightedReturn * 100) / 100,
        portfolioValue: month.portfolioValue,
        totalInvested: this.calculateTotalInvestedAtDate(sortedInvestments, month.date),
        totalDividends: this.calculateAccumulatedDividends(sortedInvestments, month.date)
      };
    });
  }

  private static calculatePortfolioValueAtDate(portfolios: any[], date: Date): number {
    // Para simplificar, usar valor atual para todos os meses
    // Em implementação real, seria necessário dados históricos de preços
    return portfolios.reduce((total, p) => total + (p.marketValue || p.totalInvested || 0), 0);
  }

  private static calculateMonthlyCashFlow(investments: Investment[], monthKey: string): number {
    return investments
      .filter(inv => inv.date.substring(0, 7) === monthKey)
      .reduce((total, inv) => {
        const buy = (inv.compra || 0) * (inv.valor_unit || 0);
        const sell = (inv.venda || 0) * (inv.valor_unit || 0);
        return total + buy - sell;
      }, 0);
  }

  private static calculateMonthlyDividends(investments: Investment[], monthKey: string): number {
    return investments
      .filter(inv => inv.date.substring(0, 7) === monthKey)
      .reduce((total, inv) => total + (inv.dividendos || 0) + (inv.juros || 0), 0);
  }

  private static calculateTotalInvestedAtDate(investments: Investment[], dateKey: string): number {
    return investments
      .filter(inv => inv.date <= dateKey + '-31')
      .reduce((total, inv) => {
        const buy = (inv.compra || 0) * (inv.valor_unit || 0);
        const sell = (inv.venda || 0) * (inv.valor_unit || 0);
        return total + buy - sell;
      }, 0);
  }

  private static calculateAccumulatedDividends(investments: Investment[], dateKey: string): number {
    return investments
      .filter(inv => inv.date <= dateKey + '-31')
      .reduce((total, inv) => total + (inv.dividendos || 0) + (inv.juros || 0), 0);
  }

  /**
   * Gera dados de comparação entre rentabilidade ponderada e benchmarks
   */
  static generateComparisonData(
    weightedReturnData: WeightedReturnPoint[], 
    benchmarkData: any[]
  ): any[] {
    if (!weightedReturnData.length || !benchmarkData.length) return [];

    return weightedReturnData.map(point => {
      const result: any = {
        date: point.date,
        monthLabel: point.monthLabel,
        rentabilidadePonderada: point.weightedReturn
      };

      // Adicionar dados de cada benchmark
      benchmarkData.forEach(benchmark => {
        // Simular dados históricos dos benchmarks
        // Em implementação real, viria das APIs
        const monthIndex = weightedReturnData.indexOf(point);
        result[benchmark.symbol] = this.simulateBenchmarkReturn(benchmark.symbol, monthIndex);
      });

      return result;
    });
  }

  static simulateBenchmarkReturn(symbol: string, monthIndex: number): number {
    // Simulação baseada em dados históricos aproximados
    const benchmarkReturns: Record<string, number[]> = {
      'IPCA': [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4],
      'CDI': [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0],
      'IBOV': [-2.1, 1.5, 3.2, -1.8, 4.5, 2.1, -3.2, 5.8, 1.2, -2.5, 3.8, 2.2],
      'SMLL': [-3.5, 2.8, 4.1, -2.2, 5.2, 1.8, -4.1, 6.5, 0.8, -3.2, 4.5, 3.1],
      'SPX': [1.2, 2.5, -1.8, 3.2, 1.8, 4.1, -2.1, 3.8, 2.2, 1.5, 2.8, 1.9],
      'IDIV': [0.8, 1.2, 1.5, 0.9, 1.8, 1.1, 0.5, 2.1, 1.4, 0.8, 1.6, 1.3],
      'IVVB11': [1.0, 2.2, -1.5, 2.8, 1.5, 3.8, -1.8, 3.2, 1.9, 1.2, 2.5, 1.6]
    };

    const returns = benchmarkReturns[symbol] || [];
    if (monthIndex < returns.length) {
      // Retorno acumulado
      return returns.slice(0, monthIndex + 1).reduce((acc, ret) => acc + ret, 0);
    }
    
    return 0;
  }

  /**
   * Calcula estatísticas de comparação
   */
  static calculateComparisonStats(comparisonData: any[], benchmarks: string[]): any {
    if (!comparisonData.length) return {};

    const latestData = comparisonData[comparisonData.length - 1];
    const portfolioReturn = latestData.rentabilidadePonderada || 0;

    const stats: any = {
      portfolioReturn,
      outperformance: {}
    };

    benchmarks.forEach(benchmark => {
      const benchmarkReturn = latestData[benchmark] || 0;
      stats.outperformance[benchmark] = portfolioReturn - benchmarkReturn;
    });

    return stats;
  }
}