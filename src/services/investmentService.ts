import { supabase } from '../lib/supabase';
import { Investment, Portfolio } from '../types/investment';
import { marketApiService } from './marketApi';

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

// Removed broken getPortfolioData function - use portfolioService.getPortfolioSummary() instead