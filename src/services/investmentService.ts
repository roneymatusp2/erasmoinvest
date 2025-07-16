import { supabase } from '../lib/supabase';
import { Investment, Portfolio } from '../types/investment';
import { getMarketData } from './marketApi';

export const createInvestment = async (investment: Omit<Investment, 'id' | 'created_at' | 'updated_at'>): Promise<Investment | null> => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .insert([investment])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar investimento:', error);
    return null;
  }
};

export const getInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar investimentos:', error);
    return [];
  }
};

export const getInvestmentsByTicker = async (userId: string, ticker: string): Promise<Investment[]> => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar investimentos por ticker:', error);
    return [];
  }
};

export const updateInvestment = async (id: string, updates: Partial<Investment>): Promise<Investment | null> => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar investimento:', error);
    return null;
  }
};

export const deleteInvestment = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar investimento:', error);
    return false;
  }
};

export const calculateHistoricalDY = (investments: Investment[], index: number): number => {
  const row = investments[index];
  const totalDividends = (row.dividendos || 0) + (row.juros || 0);
  
  if (totalDividends === 0) return 0;
  
  let accumulatedInvestment = 0;
  for (let i = 0; i <= index; i++) {
    const r = investments[i];
    const valorTotal = (r.compra - r.venda) * r.valor_unit;
    accumulatedInvestment += valorTotal;
  }
  
  if (accumulatedInvestment <= 0) return 0;
  
  return (totalDividends / accumulatedInvestment) * 100;
};

export const getPortfolioData = async (userId: string): Promise<Portfolio[]> => {
  try {
    const investments = await getInvestments(userId);
    const portfolioMap = new Map<string, Portfolio>();

    for (const investment of investments) {
      const ticker = investment.ticker;
      
      if (!portfolioMap.has(ticker)) {
        portfolioMap.set(ticker, {
          ticker,
          totalInvested: 0,
          totalDividends: 0,
          totalJuros: 0,
          currentPosition: 0,
          totalYield: 0,
          marketValue: 0,
          profit: 0,
          profitPercent: 0,
          investments: []
        });
      }

      const portfolio = portfolioMap.get(ticker)!;
      portfolio.investments.push(investment);
      
      const valorTotal = (investment.compra - investment.venda) * investment.valor_unit;
      portfolio.totalInvested += valorTotal;
      portfolio.totalDividends += investment.dividendos || 0;
      portfolio.totalJuros += investment.juros || 0;
      portfolio.currentPosition += (investment.compra - investment.venda);
    }

    const portfolios: Portfolio[] = [];
    for (const [ticker, portfolio] of portfolioMap) {
      const marketData = await getMarketData(ticker);
      if (marketData) {
        portfolio.marketValue = portfolio.currentPosition * marketData.price;
        portfolio.profit = portfolio.marketValue - portfolio.totalInvested;
        portfolio.profitPercent = portfolio.totalInvested > 0 ? (portfolio.profit / portfolio.totalInvested) * 100 : 0;
      }
      
      portfolio.totalYield = portfolio.totalInvested > 0 ? 
        ((portfolio.totalDividends + portfolio.totalJuros) / portfolio.totalInvested) * 100 : 0;
      
      portfolios.push(portfolio);
    }

    return portfolios;
  } catch (error) {
    console.error('Erro ao buscar dados do portfólio:', error);
    return [];
  }
};