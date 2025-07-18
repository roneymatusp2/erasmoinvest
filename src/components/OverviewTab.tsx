import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Eye,
  Building2,
  Globe,
  PieChart,
  BarChart3,
  Calendar,
  Percent
} from 'lucide-react';
import { updatePortfoliosWithMarketData, PortfolioWithMarketData } from '../services/portfolioCalculator';
import { Portfolio } from '../types/investment';

interface OverviewTabProps {
  portfolios: Portfolio[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ portfolios }) => {
  const [portfoliosWithMarket, setPortfoliosWithMarket] = useState<PortfolioWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    updateMarketData();
  }, [portfolios]);

  const updateMarketData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Atualizando dados de mercado para overview...');
      const updated = await updatePortfoliosWithMarketData(portfolios);
      setPortfoliosWithMarket(updated);
    } catch (error) {
      console.error('Erro ao atualizar dados de mercado:', error);
      setPortfoliosWithMarket(portfolios.map(p => ({
        ...p,
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        currency: 'BRL',
        lastUpdate: Date.now()
      })));
    } finally {
      setLoading(false);
    }
  };

  // Calcular resumo geral
  const summary = portfoliosWithMarket.reduce((acc, portfolio) => {
    acc.totalInvested += portfolio.totalInvested;
    acc.totalCurrentValue += portfolio.marketValue;
    acc.totalDividends += portfolio.totalDividends + portfolio.totalJuros;
    acc.totalProfit += portfolio.profit;
    if (portfolio.currentPosition > 0) {
      acc.activeAssets++;
    }
    return acc;
  }, {
    totalInvested: 0,
    totalCurrentValue: 0,
    totalDividends: 0,
    totalProfit: 0,
    activeAssets: 0
  });

  const totalProfitPercent = summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested) * 100 : 0;
  const totalYield = summary.totalInvested > 0 ? (summary.totalDividends / summary.totalInvested) * 100 : 0;

  // Agrupar por tipo
  const byType = portfoliosWithMarket.reduce((acc, portfolio) => {
    let type = 'OUTRO';
    
    // Verificar primeiro se tem metadados
    if (portfolio.metadata?.tipo) {
      switch (portfolio.metadata.tipo) {
        case 'FII':
          type = 'FII';
          break;
        case 'ACAO':
          type = 'ACAO_BR';
          break;
        case 'STOCK':
        case 'ETF':
        case 'REIT':
          type = 'EUA';
          break;
        case 'TESOURO_DIRETO':
          type = 'TESOURO_DIRETO';
          break;
        default:
          type = 'OUTRO';
      }
    } else {
      // Fallback para lógica anterior se não tem metadados
      if (portfolio.ticker.endsWith('11')) type = 'FII';
      else if (portfolio.ticker.endsWith('3') || portfolio.ticker.endsWith('4')) type = 'ACAO_BR';
      else if (['VOO', 'VNQ', 'DVN', 'EVEX', 'O'].includes(portfolio.ticker)) type = 'EUA';
      else if (portfolio.ticker.includes('TESOURO')) type = 'TESOURO_DIRETO';
    }
    
    if (!acc[type]) {
      acc[type] = { count: 0, value: 0, invested: 0 };
    }
    
    if (portfolio.currentPosition > 0) {
      acc[type].count++;
      acc[type].value += portfolio.marketValue;
      acc[type].invested += portfolio.totalInvested;
    }
    
    return acc;
  }, {} as Record<string, { count: number; value: number; invested: number }>);

  // Top 5 ativos por valor
  const topAssets = portfoliosWithMarket
    .filter(p => p.currentPosition > 0)
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 🎯 HERO SECTION - Resumo Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-indigo-900/30 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Visão Geral do Portfólio
            </h1>
            <p className="text-slate-400 mt-2">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {summary.activeAssets} Ativos
            </div>
            <div className="text-slate-400">
              em carteira
            </div>
          </div>
        </div>

        {/* Cards de Resumo Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Total Investido</h3>
            <p className="text-2xl font-bold text-blue-400">
              {formatCurrency(summary.totalInvested)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Eye className="w-6 h-6 text-green-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Valor Atual</h3>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(summary.totalCurrentValue)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`bg-gradient-to-br ${summary.totalProfit >= 0 ? 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20' : 'from-red-500/20 to-red-600/10 border-red-500/20'} backdrop-blur-sm rounded-xl p-6 border`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${summary.totalProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} rounded-lg`}>
                <Target className={`w-6 h-6 ${summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              {summary.totalProfit >= 0 ? 
                <TrendingUp className="w-5 h-5 text-emerald-400" /> : 
                <TrendingDown className="w-5 h-5 text-red-400" />
              }
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Lucro/Prejuízo</h3>
            <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(summary.totalProfit)}
            </p>
            <p className={`text-sm ${summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(totalProfitPercent)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Percent className="w-6 h-6 text-purple-400" />
              </div>
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Yield Total</h3>
            <p className="text-2xl font-bold text-purple-400">
              {formatPercent(totalYield)}
            </p>
            <p className="text-sm text-purple-400">
              {formatCurrency(summary.totalDividends)}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* 📊 Seção de Análise por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribuição por Tipo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            Distribuição por Tipo
          </h3>
          <div className="space-y-4">
            {Object.entries(byType).map(([type, data]) => {
              const percentage = summary.totalCurrentValue > 0 ? (data.value / summary.totalCurrentValue) * 100 : 0;
              const typeColors = {
                FII: 'bg-blue-500',
                ACAO_BR: 'bg-green-500',
                EUA: 'bg-purple-500',
                TESOURO_DIRETO: 'bg-emerald-500',
                OUTRO: 'bg-gray-500'
              };
              const typeIcons = {
                FII: Building2,
                ACAO_BR: TrendingUp,
                EUA: Globe,
                TESOURO_DIRETO: Target,
                OUTRO: DollarSign
              };
              const typeLabels = {
                FII: 'FIIs',
                ACAO_BR: 'Ações Brasil',
                EUA: 'Internacional (EUA)',
                TESOURO_DIRETO: 'Tesouro Direto',
                OUTRO: 'Outros'
              };
              const Icon = typeIcons[type as keyof typeof typeIcons];
              
              return (
                <div key={type} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${typeColors[type as keyof typeof typeColors]} rounded-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{typeLabels[type as keyof typeof typeLabels] || type}</div>
                      <div className="text-sm text-slate-400">{data.count} ativos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">{formatCurrency(data.value)}</div>
                    <div className="text-sm text-slate-400">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top 5 Ativos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Top 5 Ativos
          </h3>
          <div className="space-y-4">
            {topAssets.map((asset, index) => {
              const percentage = summary.totalCurrentValue > 0 ? (asset.marketValue / summary.totalCurrentValue) * 100 : 0;
              
              return (
                <motion.div
                  key={asset.ticker}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{asset.ticker}</div>
                      <div className="text-sm text-slate-400">
                        {asset.currentPosition} cotas
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">{formatCurrency(asset.marketValue)}</div>
                    <div className="text-sm text-slate-400">{percentage.toFixed(1)}%</div>
                    {asset.profitPercent !== 0 && (
                      <div className={`text-xs ${asset.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercent(asset.profitPercent)}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* 🎯 Indicadores de Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-yellow-400" />
          Indicadores de Performance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-700/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-2">
              {((summary.totalCurrentValue / summary.totalInvested - 1) * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-slate-400">Rentabilidade Geral</div>
          </div>
          
          <div className="text-center p-4 bg-slate-700/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {formatCurrency(summary.totalInvested / summary.activeAssets)}
            </div>
            <div className="text-sm text-slate-400">Investimento Médio por Ativo</div>
          </div>
          
          <div className="text-center p-4 bg-slate-700/30 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {formatCurrency(summary.totalDividends / 12)}
            </div>
            <div className="text-sm text-slate-400">Renda Passiva Mensal</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OverviewTab; 