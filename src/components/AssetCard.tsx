import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target, Gift, Percent, ArrowUpDown } from 'lucide-react';
import { Portfolio } from '../types/investment';
import { marketApiService, MarketData } from '../services/marketApi';

interface AssetCardProps {
  portfolio: Portfolio;
  onClick: () => void;
  isActive: boolean;
  index: number;
}

const AssetCard: React.FC<AssetCardProps> = ({ portfolio, onClick, isActive, index }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  // Buscar dados de mercado atualizados
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoadingPrice(true);
        const data = await marketApiService.getMarketData(portfolio.ticker);
        setMarketData(data);
      } catch (error) {
        console.error('Erro ao buscar dados de mercado:', error);
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchMarketData();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [portfolio.ticker]);

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

  const getProfitColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getProfitIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Calcular valor atual de mercado baseado no preço atualizado
  const currentMarketValue = marketData ? 
    portfolio.currentPosition * marketData.price : 
    portfolio.marketValue;

  const currentProfit = currentMarketValue - Math.abs(portfolio.totalInvested);
  const currentProfitPercent = portfolio.totalInvested !== 0 ? 
    (currentProfit / Math.abs(portfolio.totalInvested)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        relative p-6 rounded-xl border transition-all duration-300 cursor-pointer group
        ${isActive 
          ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800/70'
        }
      `}
    >
      {/* Header - Ticker, Nome e Preço Atual na Mesma Linha */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold text-blue-400">
              {portfolio.ticker}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-700">
              {portfolio.metadata?.pais === 'EUA' ? '🇺🇸' : '🇧🇷'}
            </span>
          </div>
          
          {/* Preço Atual GRANDE na Linha do Ticker */}
          <div className="text-right">
            {loadingPrice ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-sm text-slate-400">...</span>
              </div>
            ) : marketData ? (
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold text-white">
                  {formatCurrency(marketData.price, marketData.currency)}
                </span>
                <div className={`flex items-center space-x-1 text-sm ${
                  marketData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {marketData.changePercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{formatPercent(marketData.changePercent)}</span>
                </div>
              </div>
            ) : (
              <div className="text-lg font-bold text-slate-400">
                --
              </div>
            )}
          </div>
        </div>

        {/* Nome do Ativo - Linha Separada */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {portfolio.metadata?.nome || portfolio.ticker}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {portfolio.metadata?.setor} • {portfolio.currentPosition.toLocaleString('pt-BR')} cotas
            </p>
            {marketData && (
              <div className="text-xs text-slate-500">
                {marketData.source} • {new Date(marketData.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Investido</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(Math.abs(portfolio.totalInvested))}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <Target className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Valor Atual</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(currentMarketValue)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <Gift className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Proventos</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {formatCurrency(portfolio.totalDividends + portfolio.totalJuros)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <Percent className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">DY</span>
          </div>
          <p className="text-sm font-semibold text-blue-400">
            {portfolio.totalYield.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Rentabilidade */}
      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Rentabilidade</span>
          <div className={`flex items-center space-x-2 ${getProfitColor(currentProfitPercent)}`}>
            {getProfitIcon(currentProfitPercent)}
            <div className="text-right">
              <p className="text-sm font-semibold">
                {formatPercent(currentProfitPercent)}
              </p>
              <p className="text-xs">
                {formatCurrency(currentProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Ativo */}
      {isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
      )}
    </motion.div>
  );
};

export default AssetCard;