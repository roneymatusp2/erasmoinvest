import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SlidersHorizontal,
    Eye,
    EyeOff,
    TrendingUp,
    Building2,
    Coins,
    Shield,
    DollarSign,
    TrendingDown,
    RotateCcw,
    Search,
    BarChart3,
    Activity,
    Percent,
    X
} from 'lucide-react';
import { Portfolio } from '../types/investment';
import { getAssetType, ASSET_TYPE_NAMES } from '../utils/assetType';

// Keep ChartFilter interface here as it's tightly coupled with the filter component
export interface ChartFilter {
    assetTypes: string[];
    specificAssets: string[];
    metrics: string[];
    comparison: 'none' | 'benchmark' | 'peer' | 'sector';
    showOnlyPositive: boolean;
    showOnlyNegative: boolean;
    minValue: number;
    maxValue: number;
}

interface SuperAdvancedFiltersProps {
    filter: ChartFilter;
    setFilter: (filter: ChartFilter) => void;
    portfolios: Portfolio[];
    onQuickFilter: (type: string) => void;
}

const SuperAdvancedFilters: React.FC<SuperAdvancedFiltersProps> = ({ filter, setFilter, portfolios, onQuickFilter }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const availableAssetTypes = useMemo(() => {
        const types = new Set(portfolios.map(p => getAssetType(p.ticker, p.metadata)));
        return Array.from(types);
    }, [portfolios]);

    const availableAssets = useMemo(() => {
        return portfolios
            .filter(p => p.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(p => ({
                ticker: p.ticker,
                name: p.metadata?.nome || p.ticker,
                type: getAssetType(p.ticker, p.metadata),
                value: p.marketValue || p.totalInvested || 0,
                profit: p.profitPercent || 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [portfolios, searchTerm]);

    const updateFilter = (updates: Partial<ChartFilter>) => {
        setFilter({ ...filter, ...updates });
    };

    const clearFilters = () => {
        setFilter({
            assetTypes: [],
            specificAssets: [],
            metrics: ['rentabilidade'],
            comparison: 'none',
            showOnlyPositive: false,
            showOnlyNegative: false,
            minValue: 0,
            maxValue: Infinity
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 mb-6 shadow-2xl"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <SlidersHorizontal className="h-6 w-6 text-indigo-400" />
                    Filtros Profissionais Ultra-Avançados
                    <span className="text-sm text-gray-400 font-normal">
                        ({portfolios.length} ativos disponíveis)
                    </span>
                </h3>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${ // Added flex
                            isExpanded
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        {isExpanded ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {isExpanded ? 'Simplificar' : 'Expandir'}
                    </motion.button>
                </div>
            </div>

            {/* Quick Action Buttons - Always Visible */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                 <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('acoes')}
                    className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-all flex items-center gap-2"
                >
                    <TrendingUp className="h-4 w-4" />
                    Só Ações
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('fiis')}
                    className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 transition-all flex items-center gap-2"
                >
                    <Building2 className="h-4 w-4" />
                    Só FIIs
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('crypto')}
                    className="px-3 py-2 bg-amber-600/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-600/30 transition-all flex items-center gap-2"
                >
                    <Coins className="h-4 w-4" />
                    Cripto
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('renda-fixa')}
                    className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-600/30 transition-all flex items-center gap-2"
                >
                    <Shield className="h-4 w-4" />
                    Renda Fixa
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('proventos')}
                    className="px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30 transition-all flex items-center gap-2"
                >
                    <DollarSign className="h-4 w-4" />
                    Proventos
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('lucro')}
                    className="px-3 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/30 transition-all flex items-center gap-2"
                >
                    <TrendingUp className="h-4 w-4" />
                    Em Lucro
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickFilter('prejuizo')}
                    className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all flex items-center gap-2"
                >
                    <TrendingDown className="h-4 w-4" />
                    Em Prejuízo
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearFilters}
                    className="px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-600/30 transition-all flex items-center gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    Limpar
                </motion.button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6"
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Buscar ativos (ex: VALE3, ITUB4, BBAS3...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Tipos de Ativo</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-800/30 p-3 rounded-lg">
                                    {availableAssetTypes.map(type => (
                                        <label key={type} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/30 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={filter.assetTypes.includes(type)}
                                                onChange={(e) => {
                                                    const newTypes = e.target.checked
                                                        ? [...filter.assetTypes, type]
                                                        : filter.assetTypes.filter(t => t !== type);
                                                    updateFilter({ assetTypes: newTypes });
                                                }}
                                                className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-300 flex-1">
                                                {ASSET_TYPE_NAMES[type as keyof typeof ASSET_TYPE_NAMES] || type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {portfolios.filter(p => getAssetType(p.ticker, p.metadata) === type).length}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Ativos Específicos
                                    <span className="text-gray-500">({availableAssets.length})</span>
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-800/30 p-3 rounded-lg">
                                    {availableAssets.slice(0, 20).map(asset => (
                                        <label key={asset.ticker} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/30 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={filter.specificAssets.includes(asset.ticker)}
                                                onChange={(e) => {
                                                    const newAssets = e.target.checked
                                                        ? [...filter.specificAssets, asset.ticker]
                                                        : filter.specificAssets.filter(a => a !== asset.ticker);
                                                    updateFilter({ specificAssets: newAssets });
                                                }}
                                                className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">{asset.ticker}</span>
                                                    <span className={`text-xs px-2 py-1 rounded ${asset.profit >= 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                                        {asset.profit >= 0 ? '+' : ''}{asset.profit.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 truncate">{asset.name}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {availableAssets.length > 20 && (
                                        <p className="text-xs text-gray-500 text-center p-2">
                                            E mais {availableAssets.length - 20} ativos...
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Métricas de Análise</label>
                                <div className="space-y-2">
                                    {[
                                        { id: 'rentabilidade', label: 'Rentabilidade', icon: <TrendingUp className="h-4 w-4" /> },
                                        { id: 'proventos', label: 'Proventos', icon: <DollarSign className="h-4 w-4" /> },
                                        { id: 'volume', label: 'Volume Investido', icon: <BarChart3 className="h-4 w-4" /> },
                                        { id: 'volatilidade', label: 'Volatilidade', icon: <Activity className="h-4 w-4" /> },
                                        { id: 'dividendos', label: 'Dividend Yield', icon: <Percent className="h-4 w-4" /> },
                                        { id: 'crescimento', label: 'Crescimento', icon: <TrendingUp className="h-4 w-4" /> }
                                    ].map(metric => (
                                        <label key={metric.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/20 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={filter.metrics.includes(metric.id)}
                                                onChange={(e) => {
                                                    const newMetrics = e.target.checked
                                                        ? [...filter.metrics, metric.id]
                                                        : filter.metrics.filter(m => m !== metric.id);
                                                    updateFilter({ metrics: newMetrics });
                                                }}
                                                className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-400">{metric.icon}</span>
                                            <span className="text-sm text-gray-300">{metric.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Opções Avançadas</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Comparação</label>
                                        <select
                                            value={filter.comparison}
                                            onChange={(e) => updateFilter({ comparison: e.target.value as ChartFilter['comparison'] })}
                                            className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="none">Nenhuma</option>
                                            <option value="benchmark">Benchmark (IBOV)</option>
                                            <option value="peer">Pares do Setor</option>
                                            <option value="sector">Setor</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Apenas em Lucro</span>
                                        <button
                                            onClick={() => updateFilter({ showOnlyPositive: !filter.showOnlyPositive })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filter.showOnlyPositive ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${filter.showOnlyPositive ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Apenas em Prejuízo</span>
                                        <button
                                            onClick={() => updateFilter({ showOnlyNegative: !filter.showOnlyNegative })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filter.showOnlyNegative ? 'bg-red-500' : 'bg-gray-600'}`}>
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${filter.showOnlyNegative ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Filters Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-wrap gap-2 items-center">
                <span className="text-sm font-semibold text-gray-400 mr-2">Filtros Ativos:</span>
                {filter.assetTypes.map(type => (
                    <div key={type} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full text-xs">
                        {ASSET_TYPE_NAMES[type as keyof typeof ASSET_TYPE_NAMES] || type}
                        <button onClick={() => updateFilter({ assetTypes: filter.assetTypes.filter(t => t !== type) })}><X className="h-3 w-3" /></button>
                    </div>
                ))}
                {filter.specificAssets.map(asset => (
                    <div key={asset} className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                        {asset}
                        <button onClick={() => updateFilter({ specificAssets: filter.specificAssets.filter(a => a !== asset) })}><X className="h-3 w-3" /></button>
                    </div>
                ))}
                {filter.showOnlyPositive && (
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                        Em Lucro
                        <button onClick={() => updateFilter({ showOnlyPositive: false })}><X className="h-3 w-3" /></button>
                    </div>
                )}
                {filter.showOnlyNegative && (
                    <div className="flex items-center gap-1 bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs">
                        Em Prejuízo
                        <button onClick={() => updateFilter({ showOnlyNegative: false })}><X className="h-3 w-3" /></button>
                    </div>
                )}
                {(filter.assetTypes.length + filter.specificAssets.length > 0 || filter.showOnlyPositive || filter.showOnlyNegative) && (
                    <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white underline">Limpar Tudo</button>
                )}
            </div>
        </motion.div>
    );
};

export default SuperAdvancedFilters;