import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { Portfolio } from '../types/investment';
import AssetDetails from './AssetDetails';

interface SummaryProps {
  portfolio: Portfolio;
  marketData: any;
}

const Summary: React.FC<SummaryProps> = ({ portfolio, marketData }) => {
  // 🔍 DEBUG: Log dos dados recebidos
  console.log('📊 Summary carregado para:', portfolio.ticker, {
    totalInvested: portfolio.totalInvested,
    currentPosition: portfolio.currentPosition,
    marketValue: portfolio.marketValue,
    profit: portfolio.profit,
    hasMetadata: !!portfolio.metadata,
    marketData: marketData
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const summaryCards = [
    {
      title: 'Total Investido',
      value: `R$ ${formatNumber(portfolio.totalInvested)}`,
      icon: DollarSign,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Valor de Mercado',
      value: `R$ ${formatNumber(portfolio.marketValue)}`,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Lucro/Prejuízo',
      value: `R$ ${formatNumber(portfolio.profit)}`,
      icon: portfolio.profit >= 0 ? TrendingUp : TrendingDown,
      color: portfolio.profit >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: portfolio.profit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
    },
    {
      title: 'Rentabilidade',
      value: `${formatNumber(portfolio.profitPercent)}%`,
      icon: Target,
      color: portfolio.profitPercent >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: portfolio.profitPercent >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
    },
    {
      title: 'Total Dividendos',
      value: `R$ ${formatNumber(portfolio.totalDividends)}`,
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      title: 'Total Juros',
      value: `R$ ${formatNumber(portfolio.totalJuros)}`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    },
    {
      title: 'Yield Total',
      value: `${formatNumber(portfolio.totalYield)}%`,
      icon: Target,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      title: 'Posição Atual',
      value: `${portfolio.currentPosition} cotas`,
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20'
    }
  ];

  return (
    <div className="space-y-8">
      {/* 🎯 HEADER PRINCIPAL MELHORADO COM TODOS OS DADOS */}
      <AssetDetails 
        metadata={portfolio.metadata}
        totalInvested={portfolio.totalInvested}
        totalYield={portfolio.totalYield}
        currentPosition={portfolio.currentPosition}
      />
      
      {/* 📊 CARDS DE RESUMO DETALHADO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              {marketData && (
                <div className="text-right">
                  <div className="text-xs text-slate-400">Preço Atual</div>
                  <div className="text-sm font-semibold text-white">
                    R$ {formatNumber(marketData.price)}
                  </div>
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">
              {card.title}
            </h3>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Summary;