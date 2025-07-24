import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Target, Eye } from 'lucide-react';
import { Portfolio } from '../types/investment';

interface OverviewTabProps {
  portfolios: Portfolio[];
}

// Cache da data para evitar re-renders constantes - FIXO para evitar piscar
const FIXED_DATETIME = new Date().toLocaleString('pt-BR');

const OverviewTab: React.FC<OverviewTabProps> = React.memo(({ portfolios }) => {
  const currentDateTime = FIXED_DATETIME; // Data fixa para evitar re-renders

  const summary = useMemo(() => {
    if (!portfolios || portfolios.length === 0) {
      return { 
        totalInvested: 0, 
        totalCurrentValue: 0, 
        totalDividends: 0, 
        totalProfit: 0, 
        activeAssets: 0 
      };
    }
    return portfolios.reduce((acc, p) => {
        acc.totalInvested += p.totalInvested;
        acc.totalCurrentValue += p.marketValue || 0;
        acc.totalDividends += p.totalDividends + p.totalJuros;
        acc.totalProfit += p.profit || 0;
        if (p.currentPosition > 0) acc.activeAssets++;
        return acc;
    }, { 
      totalInvested: 0, 
      totalCurrentValue: 0, 
      totalDividends: 0, 
      totalProfit: 0, 
      activeAssets: 0 
    });
  }, [portfolios]);
  
  const totalProfitPercent = useMemo(() => 
    summary.totalInvested > 0 ? (summary.totalProfit / summary.totalInvested) * 100 : 0,
    [summary.totalInvested, summary.totalProfit]
  );
  
  const totalYield = useMemo(() => 
    summary.totalInvested > 0 ? (summary.totalDividends / summary.totalInvested) * 100 : 0,
    [summary.totalInvested, summary.totalDividends]
  );

  const formatCurrency = useMemo(() => (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), []);
  
  const formatPercent = useMemo(() => (value: number) => 
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, []);

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-3xl p-8 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Visão Geral do Portfólio</h1>
            <p className="text-slate-400 mt-2">
              Atualizado: {currentDateTime}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{summary.activeAssets} Ativos</div>
            <div className="text-slate-400">em carteira</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Investido" 
            value={formatCurrency(summary.totalInvested)} 
            icon={DollarSign} 
            color="blue" 
          />
          <MetricCard 
            title="Valor Atual" 
            value={formatCurrency(summary.totalCurrentValue)} 
            icon={Eye} 
            color="green" 
          />
          <MetricCard 
            title="Lucro/Prejuízo" 
            value={formatCurrency(summary.totalProfit)} 
            icon={summary.totalProfit >= 0 ? TrendingUp : TrendingDown} 
            color={summary.totalProfit >= 0 ? "emerald" : "red"} 
            change={formatPercent(totalProfitPercent)} 
          />
          <MetricCard 
            title="Rendimento (Yield)" 
            value={formatPercent(totalYield)} 
            icon={Target} 
            color="purple" 
            change={formatCurrency(summary.totalDividends)} 
          />
        </div>
      </motion.div>
    </div>
  );
});

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'emerald' | 'red' | 'purple';
  change?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, change }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className={`${colorClasses[color]} rounded-xl p-6 border`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <Icon className="h-5 w-5" />
      </div>
      <p className={`text-2xl font-bold ${color === 'blue' ? 'text-blue-400' : 
                                         color === 'green' ? 'text-green-400' :
                                         color === 'emerald' ? 'text-emerald-400' :
                                         color === 'red' ? 'text-red-400' :
                                         'text-purple-400'}`}>
        {value}
      </p>
      {change && (
        <p className={`text-sm ${color === 'blue' ? 'text-blue-400' : 
                                 color === 'green' ? 'text-green-400' :
                                 color === 'emerald' ? 'text-emerald-400' :
                                 color === 'red' ? 'text-red-400' :
                                 'text-purple-400'}`}>
          {change}
        </p>
      )}
    </motion.div>
  );
};

export default OverviewTab;
