import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Portfolio } from '../types/investment';
import { getAssetType } from '../utils/assetType';

interface AssetCardProps {
  portfolio: Portfolio;
  onClick: () => void;
  isActive: boolean;
  index: number;
}

const AssetCard: React.FC<AssetCardProps> = ({ portfolio, onClick, isActive, index }) => {
  const {
    ticker, metadata, totalInvested, marketValue,
    profit, profitPercent, totalYield, currentPrice, priceChangePercent, moeda
  } = portfolio;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return '--';
    // Todos os valores já estão em BRL após conversão no supabaseService
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return '--%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitColor = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return 'text-slate-400';
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  // 🎨 Função para obter cores por tipo de ativo
  const getAssetTypeColors = () => {
    const assetType = getAssetType(ticker, metadata);
    const country = metadata?.pais ?? (assetType === 'ACAO' ? 'BRASIL' : assetType === 'ETF' || assetType === 'STOCK' || assetType === 'REIT' ? 'EUA' : 'BRASIL');

    // Cores já usadas nas estatísticas do PortfolioTab
    if (assetType === 'FII') {
      return {
        bg: isActive ? 'bg-green-700/30' : 'bg-green-800/20',
        border: isActive ? 'border-green-400' : 'border-green-700 hover:border-green-600',
        ticker: 'text-green-300',
        accent: 'bg-green-400',
        gradient: 'from-green-600/30 to-green-900/10',
        emoji: '🏢'
      };
    } else if (assetType === 'ACAO' && country === 'BRASIL') {
      return {
        bg: isActive ? 'bg-violet-700/30' : 'bg-violet-800/20',
        border: isActive ? 'border-violet-400' : 'border-violet-700 hover:border-violet-600',
        ticker: 'text-violet-300',
        accent: 'bg-violet-400',
        gradient: 'from-violet-600/30 to-violet-900/10',
        emoji: '🇧🇷'
      };
    } else if (country === 'EUA' || assetType === 'ETF' || assetType === 'STOCK' || assetType === 'REIT') {
      return {
        bg: isActive ? 'bg-orange-700/30' : 'bg-orange-800/20',
        border: isActive ? 'border-orange-400' : 'border-orange-700 hover:border-orange-600',
        ticker: 'text-orange-300',
        accent: 'bg-orange-400',
        gradient: 'from-orange-600/30 to-orange-900/10',
        emoji: '🇺🇸'
      };
    } else if (assetType === 'TESOURO_DIRETO') {
      return {
        bg: isActive ? 'bg-emerald-700/30' : 'bg-emerald-800/20',
        border: isActive ? 'border-emerald-400' : 'border-emerald-700 hover:border-emerald-600',
        ticker: 'text-emerald-300',
        accent: 'bg-emerald-400',
        gradient: 'from-emerald-600/30 to-emerald-900/10',
        emoji: '🏛️'
      };
    } else {
      // Fallback - cores neutras
      return {
        bg: isActive ? 'bg-blue-600/20' : 'bg-slate-800/50',
        border: isActive ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600',
        ticker: 'text-blue-400',
        accent: 'bg-blue-500',
        gradient: 'from-blue-600/20 to-slate-800/10',
        emoji: '📊'
      };
    }
  };

  const colors = getAssetTypeColors();
  const ProfitIcon = profit >= 0 ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.03, y: -5 }}
      onClick={onClick}
      className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${colors.bg} ${colors.border}`}
    >
      {/* Gradiente de fundo sutil */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className={`text-xl font-bold ${colors.ticker}`}>{ticker}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-700/80 backdrop-blur-sm">
                {colors.emoji}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mt-1 truncate max-w-[180px]">
              {metadata?.nome || ticker}
            </h3>
          </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold text-white">
            {formatCurrency(currentPrice)}
          </p>
          <div className={`flex items-center justify-end space-x-1 text-sm ${getProfitColor(priceChangePercent)}`}>
            {priceChangePercent != null && (
              priceChangePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />
            )}
            <span>{formatPercent(priceChangePercent)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-xs text-slate-400">Investido</div>
          <p className="font-semibold text-white">{formatCurrency(totalInvested)}</p>
        </div>
        <div>
          <div className="text-xs text-slate-400">Valor Atual</div>
          <p className="font-semibold text-white">{formatCurrency(marketValue)}</p>
        </div>
        <div>
          <div className="text-xs text-slate-400">Proventos</div>
          <p className="font-semibold text-white">
            {formatCurrency(portfolio.totalDividends + portfolio.totalJuros)}
          </p>
        </div>
        <div>
          <div className="text-xs text-slate-400">DY Acum.</div>
          <p className={`font-semibold ${colors.ticker}`}>{totalYield.toFixed(2)}%</p>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Rentabilidade</span>
          <div className={`flex items-center space-x-2 ${getProfitColor(profit)}`}>
            <ProfitIcon className="h-4 w-4" />
            <div className="text-right">
              <p className="text-sm font-semibold">{formatPercent(profitPercent)}</p>
              <p className="text-xs">{formatCurrency(profit)}</p>
            </div>
          </div>
        </div>
      </div>

      {isActive && (
        <div className={`absolute top-2 right-2 w-3 h-3 ${colors.accent} rounded-full animate-pulse`}></div>
      )}
      </div>
    </motion.div>
  );
};

export default AssetCard;
