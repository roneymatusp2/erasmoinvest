import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import { Portfolio } from '../types/investment';
import { getAssetType } from '../utils/assetType';
import AssetCard from './AssetCard';
import Summary from './Summary';

interface PortfolioTabProps {
  portfolios: Portfolio[];
  onAddInvestment: () => void;
  onNewAsset: () => void;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ 
  portfolios, 
  onAddInvestment, 
  onNewAsset 
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FII' | 'ACAO_BR' | 'EUA' | 'TESOURO_DIRETO'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrar portfolios
  const filteredPortfolios = portfolios.filter(portfolio => {
    const matchesSearch = portfolio.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.metadata?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === 'ALL') return true;
    
    const tipo = getAssetType(portfolio.ticker, portfolio.metadata);
    const mapped = tipo === 'FII'
      ? 'FII'
      : tipo === 'TESOURO_DIRETO'
      ? 'TESOURO_DIRETO'
      : tipo === 'ACAO'
      ? 'ACAO_BR'
      : ['ETF', 'REIT', 'STOCK'].includes(tipo)
      ? 'EUA'
      : 'OUTRO';

    return mapped === filterType;
  });

  // Portfolios ativos (com posição > 0)
  const activePortfolios = filteredPortfolios.filter(p => p.currentPosition > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* 🎯 HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Gestão do Portfólio
          </h1>
          <p className="text-slate-400 text-lg">
            Gerencie seus {activePortfolios.length} ativos em carteira
          </p>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewAsset}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Novo Ativo
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddInvestment}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nova Operação
          </motion.button>
        </div>
      </div>

      {/* 🔍 CONTROLES DE FILTRO E BUSCA */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ticker ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filtro por Tipo */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'ALL' | 'FII' | 'ACAO_BR' | 'EUA' | 'TESOURO_DIRETO')}
              className="bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="FII">FIIs</option>
              <option value="ACAO_BR">Ações Brasil</option>
              <option value="EUA">Internacional (EUA)</option>
              <option value="TESOURO_DIRETO">Tesouro Direto</option>
            </select>
          </div>
          
          {/* Modo de Visualização */}
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Estatísticas Rápidas */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{activePortfolios.length}</div>
            <div className="text-sm text-slate-400">Ativos</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {filteredPortfolios.filter(p => {
                const tipo = getAssetType(p.ticker, p.metadata);
                return tipo === 'FII';
              }).length}
            </div>
            <div className="text-sm text-slate-400">FIIs</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {filteredPortfolios.filter(p => {
                const tipo = getAssetType(p.ticker, p.metadata);
                return tipo === 'ACAO';
              }).length}
            </div>
            <div className="text-sm text-slate-400">Ações BR</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {filteredPortfolios.filter(p => ['ETF', 'REIT', 'STOCK'].includes(getAssetType(p.ticker, p.metadata))).length}
            </div>
            <div className="text-sm text-slate-400">Internacional</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {filteredPortfolios.filter(p => getAssetType(p.ticker, p.metadata) === 'TESOURO_DIRETO').length}
            </div>
            <div className="text-sm text-slate-400">Tesouro</div>
          </div>
        </div>
      </div>

      {/* 📊 PORTFOLIO GRID/LIST */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {activePortfolios.map((portfolio, index) => (
              <motion.div
                key={portfolio.ticker}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AssetCard 
                  portfolio={portfolio}
                  onClick={() => setSelectedAsset(
                    selectedAsset === portfolio.ticker ? null : portfolio.ticker
                  )}
                  isActive={selectedAsset === portfolio.ticker}
                  index={index}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {activePortfolios.map((portfolio, index) => (
              <motion.div
                key={portfolio.ticker}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-colors cursor-pointer"
                onClick={() => setSelectedAsset(
                  selectedAsset === portfolio.ticker ? null : portfolio.ticker
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {portfolio.metadata?.pais === 'EUA' ? '🇺🇸' : '🇧🇷'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{portfolio.ticker}</h3>
                      <p className="text-slate-400">{portfolio.metadata?.nome || 'N/A'}</p>
                      <p className="text-sm text-slate-500">
                        {portfolio.currentPosition} cotas
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      R$ {portfolio.marketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-sm ${portfolio.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolio.profitPercent >= 0 ? '+' : ''}{portfolio.profitPercent.toFixed(2)}%
                    </div>
                    <div className="text-sm text-slate-400">
                      DY: {portfolio.totalYield.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📋 SUMMARY DO ATIVO SELECIONADO */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Summary 
              portfolio={activePortfolios.find(p => p.ticker === selectedAsset)!}
              marketData={null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 MENSAGEM QUANDO NÃO HÁ RESULTADOS */}
      {activePortfolios.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-xl font-bold text-white mb-2">
            Nenhum ativo encontrado
          </h3>
          <p className="text-slate-400">
            Ajuste os filtros ou adicione novos investimentos
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PortfolioTab; 