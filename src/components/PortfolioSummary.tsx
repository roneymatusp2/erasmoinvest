import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target, Gift, Calculator, ArrowUpDown } from 'lucide-react';
import { Portfolio } from '../types/investment';
import { marketApiService, MarketData } from '../services/marketApi';

interface PortfolioSummaryProps {
  portfolios: Portfolio[];
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolios }) => {
  const [marketDataMap, setMarketDataMap] = useState<Map<string, MarketData>>(new Map());
  const [loading, setLoading] = useState(true);

  // 🚨 DESABILITADO TEMPORARIAMENTE - Evitar piscar infinito
  // Buscar dados de mercado para todos os ativos
  useEffect(() => {
    const fetchAllMarketData = async () => {
      if (portfolios.length === 0) return;

      try {
        // setLoading(true); // ❌ COMENTADO para evitar piscar
        const marketData = await marketApiService.getMultipleMarketData(portfolios);
        setMarketDataMap(marketData);
      } catch (error) {
        console.error('Erro ao buscar dados de mercado:', error);
      } finally {
        setLoading(false);
      }
    };

    // ❌ COMENTADO TEMPORARIAMENTE para debugging do piscar
    // fetchAllMarketData();
    
    // ✅ INTERVALO REMOVIDO - Evita piscar constante
    // const interval = setInterval(fetchAllMarketData, 60000);
    // return () => clearInterval(interval);
  }, [portfolios]);

  const formatCurrency = (value: number, currency = 'BRL') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value);
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Calcular totais baseados nos preços atualizados
  const totals = portfolios.reduce((acc, portfolio) => {
    const marketData = marketDataMap.get(portfolio.ticker);
    
    // Usar valores já convertidos para BRL do portfolio
    const valueInBRL = portfolio.marketValue || 0;
    const investedInBRL = portfolio.totalInvested || 0;

    acc.totalInvested += investedInBRL;
    acc.totalCurrentValue += valueInBRL;
    acc.totalDividends += (portfolio.totalDividends || 0) + (portfolio.totalJuros || 0);
    
    return acc;
  }, {
    totalInvested: 0,
    totalCurrentValue: 0,
    totalDividends: 0
  });

  const totalProfit = totals.totalCurrentValue - totals.totalInvested;
  const totalProfitPercent = totals.totalInvested > 0 ? 
    (totalProfit / totals.totalInvested) * 100 : 0;

  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getProfitIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-6 w-6" />;
    if (value < 0) return <TrendingDown className="h-6 w-6" />;
    return <ArrowUpDown className="h-6 w-6" />;
  };

  const getBackgroundGradient = (value: number) => {
    if (value > 0) return 'from-green-600/20 to-green-700/20 border-green-500/30';
    if (value < 0) return 'from-red-600/20 to-red-700/20 border-red-500/30';
    return 'from-slate-600/20 to-slate-700/20 border-slate-500/30';
  };

  if (portfolios.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`
        relative p-6 rounded-2xl border bg-gradient-to-br transition-all duration-300
        ${getBackgroundGradient(totalProfitPercent)}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-slate-800 rounded-xl">
            <Calculator className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Resumo Total da Carteira</h2>
            <p className="text-sm text-slate-400">
              {loading ? 'Atualizando preços...' : 'Preços atualizados em tempo real'}
            </p>
          </div>
        </div>
        
        {/* loading && (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
        ) */}
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-400">Total Investido</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totals.totalInvested)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-400">Valor Atual</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totals.totalCurrentValue)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-400">Total Proventos</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(totals.totalDividends)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-sm">Ativos</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {portfolios.length}
          </p>
        </div>
      </div>

      {/* Retângulo Principal - Valor de Venda Total */}
      <div className={`
        p-6 rounded-xl border-2 bg-gradient-to-r transition-all duration-300
        ${getBackgroundGradient(totalProfitPercent)}
      `}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-300">
              Valor Total se Vendesse Tudo Hoje
            </h3>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totals.totalCurrentValue)}
            </p>
            <p className="text-sm text-slate-400">
              Baseado nos preços atuais de mercado
            </p>
          </div>

          <div className="text-right">
            <div className={`flex items-center space-x-3 ${getProfitColor(totalProfitPercent)}`}>
              {getProfitIcon(totalProfitPercent)}
              <div>
                <p className="text-2xl font-bold">
                  {formatPercent(totalProfitPercent)}
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalProfit >= 0 ? 'Lucro' : 'Prejuízo'} total
            </p>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Retorno da Carteira</span>
            <span>{Math.abs(totalProfitPercent).toFixed(2)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                totalProfitPercent >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ 
                width: `${Math.min(Math.abs(totalProfitPercent) * 2, 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <p className="text-slate-400">Yield Médio</p>
          <p className="text-lg font-semibold text-blue-400">
            {portfolios.length > 0 ? 
              (portfolios.reduce((sum, p) => sum + p.totalYield, 0) / portfolios.length).toFixed(2) : 0
            }%
          </p>
        </div>
        
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <p className="text-slate-400">Melhor Ativo</p>
          <p className="text-lg font-semibold text-green-400">
            {portfolios.length > 0 ? 
              [...portfolios]
                .filter(p => (p.profitPercent || 0) > 0)
                .sort((a, b) => (b.profitPercent || 0) - (a.profitPercent || 0))
                [0]?.ticker || '-'
              : '-'
            }
          </p>
        </div>
        
        <div className="text-center p-3 bg-slate-800/50 rounded-lg">
          <p className="text-slate-400">Última Atualização</p>
          <p className="text-lg font-semibold text-white">
            {new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Indicador de Status - TEMPORARIAMENTE DESABILITADO */}
      {/* <div className="absolute top-4 right-4">
        <div className={`w-3 h-3 rounded-full animate-pulse ${
          loading ? 'bg-yellow-500' : 'bg-green-500'
        }`} />
      </div> */}
    </motion.div>
  );
};

export default PortfolioSummary;