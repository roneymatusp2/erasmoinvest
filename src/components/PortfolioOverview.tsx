import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';
import { Building2, TrendingUp, Globe, DollarSign, Target } from 'lucide-react';

interface PortfolioOverviewProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ activeTab, onTabChange }) => {
  const calculatePortfolioSummary = () => {
    const summary = [];
    
    // Ordenar tickers alfabeticamente
    Object.keys(portfolioData).sort((a, b) => a.localeCompare(b)).forEach(ticker => {
      const data = portfolioData[ticker];
      let position = 0;
      let totalInvested = 0;
      let totalProventos = 0;
      
      data.forEach(row => {
        position += (row.compra - row.venda);
        totalInvested += (row.compra - row.venda) * row.valorUnit;
        totalProventos += (row.dividendos || 0) + (row.juros || 0);
      });
      
      if (position > 0) {
        const yield_ = totalInvested > 0 ? (totalProventos / Math.abs(totalInvested)) * 100 : 0;
        summary.push({
          ticker: ticker,
          position: position,
          invested: Math.abs(totalInvested),
          proventos: totalProventos,
          yield: yield_,
          type: getAssetType(ticker)
        });
      }
    });
    
    return summary.sort((a, b) => b.invested - a.invested);
  };

  const getAssetType = (ticker: string) => {
    if (ticker.includes('11')) return 'FII';
    if (ticker.includes('3')) return 'AÇÃO';
    if (['VNQ', 'VOO', 'DVN', 'EVEX', 'O'].includes(ticker)) return 'US';
    return 'OUTRO';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'FII':
        return <Building2 className="w-5 h-5 text-blue-400" />;
      case 'AÇÃO':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'US':
        return <Globe className="w-5 h-5 text-purple-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FII':
        return 'from-blue-500 to-blue-600';
      case 'AÇÃO':
        return 'from-green-500 to-green-600';
      case 'US':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatNumber = (num: number) => {
    return num.toFixed(2).replace('.', ',');
  };

  const portfolioSummary = calculatePortfolioSummary();

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl">
          <Target className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-white">Composição do Portfólio</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {portfolioSummary.map((item, index) => (
          <motion.div
            key={item.ticker}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onTabChange(item.ticker)}
            className={`relative group cursor-pointer transition-all duration-300 ${
              activeTab === item.ticker
                ? 'ring-2 ring-blue-500 ring-opacity-50 scale-105'
                : 'hover:scale-105'
            }`}
          >
            <div className={`bg-gradient-to-br ${getTypeColor(item.type)} opacity-10 absolute inset-0 rounded-xl`} />
            
            <div className="relative bg-slate-700/50 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(item.type)}
                  <span className="font-bold text-white">{item.ticker}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getTypeColor(item.type)} text-white`}>
                  {item.type}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Posição</span>
                  <span className="text-sm font-semibold text-white">{item.position} cotas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Investido</span>
                  <span className="text-sm font-semibold text-green-400">R$ {formatNumber(item.invested)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Yield</span>
                  <span className={`text-sm font-semibold ${
                    item.yield >= 8 ? 'text-green-400' : 
                    item.yield >= 5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formatNumber(item.yield)}%
                  </span>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioOverview;