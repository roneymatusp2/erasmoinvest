import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Investment } from '../types/investment';

export const useInvestmentData = (ticker: string | null, refreshKey?: number) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker || ['overview', 'dashboard', 'portfolio', 'settings'].includes(ticker)) {
      setInvestments([]);
      return;
    }

    const fetchInvestments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Usar o userId fixo do banco de dados
        const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';

        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', userId)
          .eq('ticker', ticker)
          .order('date', { ascending: true });

        if (error) throw error;
        
        setInvestments(data || []);
      } catch (err) {
        console.error('Erro ao buscar investimentos:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [ticker, refreshKey]);

  return { investments, loading, error };
};