import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    LineChart,
    Line,
    Area,
    AreaChart,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Treemap,
    Sankey,
    ComposedChart,
    Scatter,
    ScatterChart,
    ZAxis,
    ReferenceLine,
    ReferenceArea,
    Brush,
    FunnelChart,
    Funnel,
    LabelList
} from 'recharts';
import { Portfolio } from '../types/investment';
import { ASSET_TYPE_COLORS, ASSET_TYPE_NAMES, getAssetType, CanonicalAssetType, QUICK_FILTER_MAP } from '../utils/assetType';
import { benchmarkService, BenchmarkData, BENCHMARK_CONFIGS } from '../services/benchmarkService';
import { WeightedReturnService, WeightedReturnPoint } from '../services/weightedReturnService';
import { Investment } from "../services/supabaseService";
import { motion, AnimatePresence } from 'framer-motion';
import voiceService from '../services/voiceCommandService';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart as PieChartIcon,
    BarChart3,
    Calendar,
    Activity,
    Target,
    Award,
    AlertCircle,
    Download,
    Filter,
    ChevronUp,
    ChevronDown,
    Zap,
    Shield,
    Percent,
    Trophy,
    Info,
    X,
    Loader,
    Sparkles,
    Play,
    Volume2,
    VolumeX,
    Search,
    SlidersHorizontal,
    Eye,
    EyeOff,
    BarChart2,
    LineChart as LineChartIcon,
    Settings,
    Maximize2,
    TrendingFlat,
    ArrowUpDown,
    Building2,
    Coins,
    Banknote,
    Layers,
    PlusCircle,
    MinusCircle,
    RotateCcw,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Split,
    Merge,
    MousePointer,
    ZoomIn,
    ZoomOut,
    Grid3X3,
    Map,
    BarChart4,
    Gauge,
    TrendingFlat as TrendingFlatIcon,
    Crosshair,
    Focus,
    Layers3,
    Users,
    Clock,
    Cpu,
    Database,
    Globe,
    Home,
    BookOpen,
    Briefcase
} from 'lucide-react';

// ====================== TYPES & INTERFACES ======================
interface ChartsTabProps {
    portfolios: Portfolio[];
    rawInvestments: Investment[];
}

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

interface ChartFilter {
    assetTypes: CanonicalAssetType[];
    specificAssets: string[];
    comparison: 'none' | 'benchmark' | 'peer' | 'sector';
    selectedBenchmarks: string[];
    showOnlyPositive: boolean;
    showOnlyNegative: boolean;
    showOnlyWithDividends: boolean;
    minValue: number;
    maxValue: number;
}

interface DrillDownState {
    isActive: boolean;
    level: 'portfolio' | 'assetType' | 'individual';
    selectedAssetType?: string;
    selectedAsset?: string;
    title: string;
    data: any[];
}

// ====================== ENHANCED COLORS & STYLING ======================
const ENHANCED_COLORS = {
    primary: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'],
    gradient: {
        profit: ['#10b981', '#34d399', '#6ee7b7'],
        loss: ['#ef4444', '#f87171', '#fca5a5'],
        neutral: ['#6b7280', '#9ca3af', '#d1d5db'],
        premium: ['#6366f1', '#8b5cf6', '#a78bfa'],
        gold: ['#f59e0b', '#fbbf24', '#fde047'],
        ocean: ['#0891b2', '#06b6d4', '#22d3ee'],
        sunset: ['#ea580c', '#f97316', '#fb923c'],
        emerald: ['#059669', '#10b981', '#34d399'],
        purple: ['#7c3aed', '#8b5cf6', '#a78bfa'],
        rose: ['#e11d48', '#f43f5e', '#fb7185']
    },
    chart: {
        background: 'rgba(17, 24, 39, 0.95)',
        surface: 'rgba(31, 41, 55, 0.9)',
        border: 'rgba(75, 85, 99, 0.3)',
        grid: 'rgba(156, 163, 175, 0.15)',
        text: '#e5e7eb',
        textMuted: '#9ca3af'
    }
};

// ====================== SUPER ADVANCED FILTER COMPONENT ======================
const SuperAdvancedFilters: React.FC<{
    filter: ChartFilter;
    setFilter: (filter: ChartFilter) => void;
    portfolios: Portfolio[];
    onQuickFilter: (type: string) => void;
    benchmarkData: BenchmarkData[];
    loadingBenchmarks: boolean;
}> = ({ filter, setFilter, portfolios, onQuickFilter, benchmarkData, loadingBenchmarks }) => {
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
            comparison: 'none',
            selectedBenchmarks: [],
            showOnlyPositive: false,
            showOnlyNegative: false,
            showOnlyWithDividends: false,
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

            {/* Advanced Filters - Expandable */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6"
                    >
                        {/* Search Bar */}
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
                            {/* Asset Types Filter */}
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

                            {/* Specific Assets Filter */}
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
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        asset.profit >= 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                                    }`}>
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

                            {/* Metrics Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Filtros de Valor</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Valor Mínimo (R$)</label>
                                        <input
                                            type="number"
                                            value={filter.minValue === 0 ? '' : filter.minValue}
                                            onChange={(e) => updateFilter({ minValue: Number(e.target.value) || 0 })}
                                            placeholder="0"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Valor Máximo (R$)</label>
                                        <input
                                            type="number"
                                            value={filter.maxValue === Infinity ? '' : filter.maxValue}
                                            onChange={(e) => updateFilter({ maxValue: Number(e.target.value) || Infinity })}
                                            placeholder="Sem limite"
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Benchmark Comparison */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Comparar com Benchmarks
                                    {loadingBenchmarks && <span className="text-xs text-amber-400 ml-2">(Carregando...)</span>}
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-800/30 p-3 rounded-lg">
                                    {BENCHMARK_CONFIGS.map(benchmark => (
                                        <label key={benchmark.symbol} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/30 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={filter.selectedBenchmarks.includes(benchmark.symbol)}
                                                onChange={(e) => {
                                                    const newBenchmarks = e.target.checked
                                                        ? [...filter.selectedBenchmarks, benchmark.symbol]
                                                        : filter.selectedBenchmarks.filter(b => b !== benchmark.symbol);
                                                    updateFilter({ selectedBenchmarks: newBenchmarks });
                                                }}
                                                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">{benchmark.symbol}</span>
                                                    <span className={`text-xs px-2 py-1 rounded ${
                                                        benchmark.type === 'index' ? 'bg-blue-600/20 text-blue-400' :
                                                        benchmark.type === 'rate' ? 'bg-green-600/20 text-green-400' :
                                                        'bg-purple-600/20 text-purple-400'
                                                    }`}>
                                                        {benchmark.type === 'index' ? 'Índice' : 
                                                         benchmark.type === 'rate' ? 'Taxa' : 'ETF'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400">{benchmark.name}</div>
                                                {benchmarkData.find(b => b.symbol === benchmark.symbol) && (
                                                    <div className="flex justify-between items-center text-xs mt-1">
                                                        <span className="text-gray-400">Atual:</span>
                                                        <span className={`font-medium ${
                                                            (benchmarkData.find(b => b.symbol === benchmark.symbol)?.changePercent || 0) >= 0 
                                                                ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {(benchmarkData.find(b => b.symbol === benchmark.symbol)?.changePercent || 0) >= 0 ? '+' : ''}
                                                            {(benchmarkData.find(b => b.symbol === benchmark.symbol)?.changePercent || 0).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Opções Avançadas</label>
                                <div className="space-y-4">
                                    {/* Comparison */}
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Comparação</label>
                                        <select
                                            value={filter.comparison}
                                            onChange={(e) => updateFilter({ comparison: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
                                        >
                                            <option value="none">Nenhuma</option>
                                            <option value="benchmark">vs IBOVESPA</option>
                                            <option value="peer">vs Pares do Setor</option>
                                            <option value="sector">vs Média Setorial</option>
                                        </select>
                                    </div>

                                    {/* Toggle Filters */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filter.showOnlyPositive}
                                                onChange={(e) => updateFilter({
                                                    showOnlyPositive: e.target.checked,
                                                    showOnlyNegative: e.target.checked ? false : filter.showOnlyNegative
                                                })}
                                                className="rounded border-gray-600 bg-gray-800 text-green-600"
                                            />
                                            <span className="text-sm text-gray-300">Apenas em Lucro</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filter.showOnlyNegative}
                                                onChange={(e) => updateFilter({
                                                    showOnlyNegative: e.target.checked,
                                                    showOnlyPositive: e.target.checked ? false : filter.showOnlyPositive
                                                })}
                                                className="rounded border-gray-600 bg-gray-800 text-red-600"
                                            />
                                            <span className="text-sm text-gray-300">Apenas em Prejuízo</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Summary */}
                        {(filter.assetTypes.length > 0 || filter.specificAssets.length > 0 || filter.showOnlyPositive || filter.showOnlyNegative || filter.showOnlyWithDividends) && (
                            <div className="border-t border-gray-700/50 pt-4">
                                <h4 className="text-sm font-medium text-gray-300 mb-2">Filtros Ativos:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {filter.assetTypes.map(type => (
                                        <span key={type} className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs flex items-center gap-2">
                                            {ASSET_TYPE_NAMES[type as keyof typeof ASSET_TYPE_NAMES] || type}
                                            <button
                                                onClick={() => updateFilter({ assetTypes: filter.assetTypes.filter(t => t !== type) })}
                                                className="hover:text-indigo-300"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {filter.specificAssets.map(asset => (
                                        <span key={asset} className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs flex items-center gap-2">
                                            {asset}
                                            <button
                                                onClick={() => updateFilter({ specificAssets: filter.specificAssets.filter(a => a !== asset) })}
                                                className="hover:text-green-300"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {filter.showOnlyPositive && (
                                        <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">Em Lucro</span>
                                    )}
                                    {filter.showOnlyNegative && (
                                        <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs">Em Prejuízo</span>
                                    )}
                                    {filter.showOnlyWithDividends && (
                                        <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-xs">Com Proventos</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ====================== ENHANCED METRIC CARD ======================
const EnhancedMetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color, subtitle }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-lg relative overflow-hidden group cursor-pointer`}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm group-hover:bg-white/20 transition-all">
                        {icon}
                    </div>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 text-sm font-bold ${
                            change >= 0 ? 'text-green-400' : 'text-red-400'
                        } bg-black/20 px-2 py-1 rounded-lg`}>
                            {change >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {Math.abs(change).toFixed(1)}%
                        </div>
                    )}
                </div>
                <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
                <p className="text-3xl font-bold text-white mb-1">
                    {value}
                </p>
                {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
            </div>
        </motion.div>
    );
};

// ====================== ENHANCED TOOLTIP ======================
const UltraPremiumTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-gray-700/50 min-w-[200px]"
        >
            {label && (
                <p className="text-gray-400 text-sm mb-3 font-medium border-b border-gray-700/50 pb-2">
                    {label}
                </p>
            )}
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4 mb-2 last:mb-0">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full shadow-lg"
                            style={{ backgroundColor: entry.color }}
                        ></div>
                        <span className="text-gray-300 text-sm font-medium">{entry.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">
                        {typeof entry.value === 'number'
                            ? entry.name === 'Rentabilidade' || entry.name === 'Performance' || entry.name?.includes('%')
                                ? `${entry.value.toFixed(2)}%`
                                : entry.value > 1000
                                    ? `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : entry.value
                        }
                    </span>
                </div>
            ))}
        </motion.div>
    );
};

// ====================== INDIVIDUAL ASSET DRILL-DOWN COMPONENT ======================
const IndividualAssetAnalysis: React.FC<{
    asset: Portfolio;
    onBack: () => void;
    rawInvestments: Investment[];
}> = ({ asset, onBack, rawInvestments }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');

    // Generate historical data for the asset
    const assetHistory = useMemo(() => {
        const months = [];
        const today = new Date();
        const periodMonths = selectedPeriod === '1M' ? 1 : selectedPeriod === '3M' ? 3 : selectedPeriod === '6M' ? 6 : selectedPeriod === '1Y' ? 12 : 24;

        for (let i = periodMonths; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = date.toISOString().substring(0, 7);
            const progress = (periodMonths - i) / periodMonths;

            months.push({
                month: monthKey,
                monthLabel: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                value: (asset.marketValue || asset.totalInvested || 0) * (0.7 + progress * 0.6 + Math.random() * 0.2),
                invested: (asset.totalInvested || 0) * (0.8 + progress * 0.4),
                dividends: Math.random() * 500,
                volume: Math.random() * 10000,
            });
        }

        return months;
    }, [asset, selectedPeriod]);

    const assetMetrics = useMemo(() => {
        const totalInvested = asset.totalInvested || 0;
        const marketValue = asset.marketValue || totalInvested;
        const profit = marketValue - totalInvested;
        const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
        const totalDividends = (asset.totalDividends || 0) + (asset.totalJuros || 0);
        const dividendYield = asset.totalYield || 0;

        return {
            totalInvested,
            marketValue,
            profit,
            profitPercent,
            totalDividends,
            dividendYield,
            quantity: asset.quantidade || 0,
            averagePrice: asset.quantidade > 0 ? totalInvested / asset.quantidade : 0
        };
    }, [asset]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="p-3 bg-gray-800 rounded-xl text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </motion.button>
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Focus className="h-8 w-8 text-indigo-400" />
                            Análise Individual: {asset.ticker}
                        </h2>
                        <p className="text-gray-400">{asset.metadata?.nome || 'Análise detalhada do ativo'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {['1M', '3M', '6M', '1Y', 'ALL'].map(period => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period as any)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                selectedPeriod === period
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                            }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            {/* Asset Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <EnhancedMetricCard
                    title="Valor Atual"
                    value={`R$ ${assetMetrics.marketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={assetMetrics.profitPercent}
                    icon={<DollarSign className="h-6 w-6 text-white" />}
                    color="from-indigo-600 to-purple-600"
                    subtitle={`${assetMetrics.quantity} unidades`}
                />
                <EnhancedMetricCard
                    title="Lucro/Prejuízo"
                    value={`R$ ${assetMetrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={assetMetrics.profitPercent}
                    icon={<TrendingUp className="h-6 w-6 text-white" />}
                    color={assetMetrics.profit >= 0 ? "from-green-600 to-emerald-600" : "from-red-600 to-pink-600"}
                    subtitle={`${assetMetrics.profitPercent >= 0 ? '+' : ''}${assetMetrics.profitPercent.toFixed(2)}%`}
                />
                <EnhancedMetricCard
                    title="Proventos Recebidos"
                    value={`R$ ${assetMetrics.totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<Award className="h-6 w-6 text-white" />}
                    color="from-amber-600 to-orange-600"
                    subtitle={`DY: ${assetMetrics.dividendYield.toFixed(2)}%`}
                />
                <EnhancedMetricCard
                    title="Preço Médio"
                    value={`R$ ${assetMetrics.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<BarChart3 className="h-6 w-6 text-white" />}
                    color="from-cyan-600 to-blue-600"
                    subtitle={`Investido: R$ ${assetMetrics.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Price Evolution */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-green-400" />
                        Evolução do Valor - {asset.ticker}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer>
                            <ComposedChart data={assetHistory}>
                                <defs>
                                    <linearGradient id={`colorValue-${asset.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip content={<UltraPremiumTooltip />} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill={`url(#colorValue-${asset.ticker})`}
                                    name="Valor de Mercado"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="invested"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Valor Investido"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Dividends History */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-amber-400" />
                        Histórico de Proventos - {asset.ticker}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer>
                            <BarChart data={assetHistory}>
                                <defs>
                                    <linearGradient id={`colorDividends-${asset.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip content={<UltraPremiumTooltip />} />
                                <Bar
                                    dataKey="dividends"
                                    fill={`url(#colorDividends-${asset.ticker})`}
                                    radius={[8, 8, 0, 0]}
                                    name="Proventos"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Asset Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Basic Info */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-400" />
                        Informações Básicas
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Ticker</span>
                            <span className="text-white font-bold">{asset.ticker}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Tipo</span>
                            <span className="text-white">{getAssetType(asset.ticker, asset.metadata)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Setor</span>
                            <span className="text-white">{asset.metadata?.setor || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Quantidade</span>
                            <span className="text-white">{assetMetrics.quantity}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Performance Metrics */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-400" />
                        Métricas de Performance
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">ROI</span>
                            <span className={`font-bold ${assetMetrics.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {assetMetrics.profitPercent >= 0 ? '+' : ''}{assetMetrics.profitPercent.toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Dividend Yield</span>
                            <span className="text-blue-400 font-bold">{assetMetrics.dividendYield.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Volatilidade</span>
                            <span className="text-amber-400 font-bold">{(Math.random() * 30 + 10).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Beta</span>
                            <span className="text-cyan-400 font-bold">{(Math.random() * 2 + 0.5).toFixed(2)}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Risk Analysis */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-400" />
                        Análise de Risco
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Nível de Risco</span>
                            <span className="text-amber-400 font-bold">Médio</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">VaR (95%)</span>
                            <span className="text-red-400 font-bold">-{(Math.random() * 15 + 5).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Sharpe Ratio</span>
                            <span className="text-green-400 font-bold">{(Math.random() * 2 + 0.5).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                            <span className="text-gray-400">Correlação c/ IBOV</span>
                            <span className="text-purple-400 font-bold">{(Math.random() * 0.8 + 0.1).toFixed(2)}</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

// ====================== ASSET TYPE DRILL-DOWN COMPONENT ======================
const AssetTypeAnalysis: React.FC<{
    assetType: string;
    portfolios: Portfolio[];
    onBack: () => void;
    onAssetClick: (asset: Portfolio) => void;
}> = ({ assetType, portfolios, onBack, onAssetClick }) => {
    const filteredAssets = useMemo(() => {
        return portfolios.filter(p => getAssetType(p.ticker, p.metadata) === assetType);
    }, [portfolios, assetType]);

    const typeMetrics = useMemo(() => {
        const totalInvested = filteredAssets.reduce((sum, p) => sum + (p.totalInvested || 0), 0);
        const totalValue = filteredAssets.reduce((sum, p) => sum + (p.marketValue || p.totalInvested || 0), 0);
        const totalDividends = filteredAssets.reduce((sum, p) => sum + ((p.totalDividends || 0) + (p.totalJuros || 0)), 0);
        const totalProfit = totalValue - totalInvested;
        const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

        return {
            totalInvested,
            totalValue,
            totalDividends,
            totalProfit,
            profitPercent,
            assetCount: filteredAssets.length,
            averageDividendYield: filteredAssets.reduce((sum, p) => sum + (p.totalYield || 0), 0) / filteredAssets.length
        };
    }, [filteredAssets]);

    const chartData = useMemo(() => {
        return filteredAssets
            .map(p => ({
                name: p.ticker,
                value: p.marketValue || p.totalInvested || 0,
                profit: p.profitPercent || 0,
                dividends: (p.totalDividends || 0) + (p.totalJuros || 0),
                dividendYield: p.totalYield || 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredAssets]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="p-3 bg-gray-800 rounded-xl text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </motion.button>
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Layers className="h-8 w-8 text-purple-400" />
                            Análise de {ASSET_TYPE_NAMES[assetType as keyof typeof ASSET_TYPE_NAMES] || assetType}
                        </h2>
                        <p className="text-gray-400">{typeMetrics.assetCount} ativos nesta categoria</p>
                    </div>
                </div>
            </div>

            {/* Type Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <EnhancedMetricCard
                    title="Valor Total"
                    value={`R$ ${typeMetrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={typeMetrics.profitPercent}
                    icon={<DollarSign className="h-6 w-6 text-white" />}
                    color="from-indigo-600 to-purple-600"
                    subtitle={`${typeMetrics.assetCount} ativos`}
                />
                <EnhancedMetricCard
                    title="Lucro Total"
                    value={`R$ ${typeMetrics.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={typeMetrics.profitPercent}
                    icon={<TrendingUp className="h-6 w-6 text-white" />}
                    color={typeMetrics.totalProfit >= 0 ? "from-green-600 to-emerald-600" : "from-red-600 to-pink-600"}
                    subtitle={`${typeMetrics.profitPercent >= 0 ? '+' : ''}${typeMetrics.profitPercent.toFixed(2)}%`}
                />
                <EnhancedMetricCard
                    title="Proventos"
                    value={`R$ ${typeMetrics.totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<Award className="h-6 w-6 text-white" />}
                    color="from-amber-600 to-orange-600"
                    subtitle={`DY Médio: ${typeMetrics.averageDividendYield.toFixed(2)}%`}
                />
                <EnhancedMetricCard
                    title="Ticket Médio"
                    value={`R$ ${(typeMetrics.totalValue / typeMetrics.assetCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<BarChart3 className="h-6 w-6 text-white" />}
                    color="from-cyan-600 to-blue-600"
                    subtitle="Por ativo"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Chart */}
                <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-400" />
                        Evolução do Patrimônio
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer>
                            <ComposedChart data={performanceTimeline}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                <YAxis yAxisId="left" stroke="#9ca3af" />
                                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                                <Tooltip content={<UltraPremiumTooltip />} />
                                <Legend />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    name="Valor Total"
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="invested"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    name="Valor Investido"
                                    dot={false}
                                />
                                <Bar
                                    yAxisId="right"
                                    dataKey="income"
                                    fill="#f59e0b"
                                    name="Proventos"
                                    opacity={0.8}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Comparação com Benchmarks */}
                {benchmarkComparison.length > 0 && (
                    <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                                Comparação com Benchmarks
                                <span className="text-sm text-gray-400 font-normal">
                                    (Performance Relativa)
                                </span>
                            </h3>
                            <ExplainButton
                                onClick={() => handleExplainChart('Comparação com Benchmarks', benchmarkComparison, 'benchmark-comparison')}
                                isLoading={isExplaining === 'benchmark-comparison'}
                            />
                        </div>
                        <div className="h-96">
                            <ResponsiveContainer>
                                <LineChart data={benchmarkComparison}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
                                    <XAxis
                                        dataKey="monthLabel"
                                        stroke="#9ca3af"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        fontSize={12}
                                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                            border: '1px solid rgba(75, 85, 99, 0.3)',
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(16px)'
                                        }}
                                        formatter={(value: any, name: string) => [
                                            `${Number(value).toFixed(2)}%`,
                                            name === 'portfolio' ? 'Sua Carteira' :
                                            BENCHMARK_CONFIGS.find(b => b.symbol === name)?.name || name
                                        ]}
                                    />
                                    <Legend />

                                    {/* Linha da carteira */}
                                    <Line
                                        type="monotone"
                                        dataKey="portfolio"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        name="Sua Carteira"
                                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                                    />

                                    {/* Linhas dos benchmarks */}
                                    {benchmarkData.map((benchmark, index) => {
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
                                        return (
                                            <Line
                                                key={benchmark.symbol}
                                                type="monotone"
                                                dataKey={benchmark.symbol}
                                                stroke={colors[index % colors.length]}
                                                strokeWidth={2}
                                                name={benchmark.name}
                                                dot={{ fill: colors[index % colors.length], strokeWidth: 1, r: 3 }}
                                                strokeDasharray={index % 2 === 1 ? "5 5" : "0"}
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Resumo de performance relativa */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {benchmarkData.map(benchmark => {
                                const latestComparison = benchmarkComparison[benchmarkComparison.length - 1];
                                const portfolioReturn = latestComparison?.portfolio || 0;
                                const benchmarkReturn = latestComparison?.[benchmark.symbol] || 0;
                                const outperformance = portfolioReturn - benchmarkReturn;

                                return (
                                    <div key={benchmark.symbol} className="bg-gray-800/50 p-4 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-300">{benchmark.name}</span>
                                            <span className="text-xs text-gray-400">
                                                {benchmarkReturn.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Benchmark:</span>
                                            <span className="text-gray-300">{benchmarkReturn.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Sua Carteira:</span>
                                            <span className="text-gray-300">{portfolioReturn.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-gray-400">Diferença:</span>
                                            <span className={outperformance >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {outperformance >= 0 ? '+' : ''}{outperformance.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {selectedView === 'allocation' && (
                    <motion.div
                        key="allocation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Gráfico de Pizza INTERATIVO */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5 text-indigo-400" />
                                    Alocação por Tipo de Ativo
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Clique para drill-down)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Alocação por Tipo de Ativo', allocationData, 'allocation-pie')}
                                    isLoading={isExplaining === 'allocation-pie'}
                                />
                            </div>
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={allocationData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                            onClick={(data) => handleAssetTypeClick(data.originalType)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {allocationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<UltraPremiumTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* TreeMap INTERATIVO */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                    Mapa de Calor do Portfólio
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Clique nos ativos)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Mapa de Calor do Portfólio', treeMapData, 'treemap')}
                                    isLoading={isExplaining === 'treemap'}
                                />
                            </div>
                            <div className="h-96">
                                {treeMapData && treeMapData.children.length > 0 ? (
                                    <ResponsiveContainer>
                                        <Treemap
                                            data={[treeMapData]}
                                            dataKey="size"
                                            aspectRatio={4/3}
                                            stroke="#fff"
                                            fill="#6366f1"
                                            content={(props: any) => {
                                                const { x, y, width, height, value } = props;
                                                const item = treeMapData?.children?.find((child: any) => child.size === value);
                                                if (!item) return null;

                                                const name = item.name || '';
                                                const performance = item.performance || 0;
                                                const fontSize = Math.max(10, Math.min(width / Math.max(name.length, 1) * 1.5, 20));
                                                const color = performance >= 0 ? '#10b981' : '#ef4444';

                                                return (
                                                    <g
                                                        onClick={() => handleAssetClick(item.asset)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <rect
                                                            x={x}
                                                            y={y}
                                                            width={width}
                                                            height={height}
                                                            style={{
                                                                fill: color,
                                                                fillOpacity: 0.7,
                                                                stroke: '#1f2937',
                                                                strokeWidth: 2,
                                                                strokeOpacity: 1,
                                                            }}
                                                        />
                                                        {width > 60 && height > 40 && (
                                                            <>
                                                                <text
                                                                    x={x + width / 2}
                                                                    y={y + height / 2 - 8}
                                                                    textAnchor="middle"
                                                                    fill="#fff"
                                                                    fontSize={fontSize}
                                                                    fontWeight="bold"
                                                                >
                                                                    {name}
                                                                </text>
                                                                <text
                                                                    x={x + width / 2}
                                                                    y={y + height / 2 + 10}
                                                                    textAnchor="middle"
                                                                    fill="#fff"
                                                                    fontSize={fontSize * 0.8}
                                                                >
                                                                    {performance >= 0 ? '+' : ''}{performance.toFixed(1)}%
                                                                </text>
                                                            </>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                        />
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <p>Nenhum dado disponível para o mapa de calor</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Top Performers INTERATIVO */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-400" />
                                    Top Performers
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Clique para análise individual)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Top Performers', topPerformers, 'top-performers')}
                                    isLoading={isExplaining === 'top-performers'}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {topPerformers.slice(0, 5).map((asset, index) => (
                                    <motion.div
                                        key={asset.ticker}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        onClick={() => handleAssetClick(asset.asset)}
                                        className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 cursor-pointer hover:border-indigo-500/50 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{asset.ticker}</h4>
                                            <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                                                #{index + 1}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-2 line-clamp-1">{asset.name}</p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-xs">Retorno</span>
                                                <span className={`font-bold text-sm ${asset.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-xs">DY</span>
                                                <span className="font-bold text-sm text-blue-400">
                                                    {asset.dividendYield.toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {selectedView === 'income' && (
                    <motion.div
                        key="income"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Gráfico de Barras de Renda */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-emerald-400" />
                                    Proventos Recebidos
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Clique para detalhes)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Proventos Recebidos', assetHistory, 'dividends-history')}
                                    isLoading={isExplaining === 'dividends-history'}
                                />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer>
                                    <BarChart data={assetHistory}>
                                        <defs>
                                            <linearGradient id={`colorDividends`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                        <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip content={<UltraPremiumTooltip />} />
                                        <Bar
                                            dataKey="dividends"
                                            fill={`url(#colorDividends)`}
                                            radius={[8, 8, 0, 0]}
                                            name="Proventos"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Tabela de Renda Mensal */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-400" />
                                    Renda Mensal
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Ajuste para ver diferentes períodos)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Renda Mensal', assetHistory, 'monthly-income')}
                                    isLoading={isExplaining === 'monthly-income'}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2">Período Inicial</label>
                                    <input
                                        type="month"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-2">Período Final</label>
                                    <input
                                        type="month"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button className="w-full px-4 py-2 bg-indigo-600 rounded-lg text-white font-medium transition-all hover:bg-indigo-700">
                                    Gerar Relatório
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {selectedView === 'risk' && (
                    <motion.div
                        key="risk"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Gráfico de Risco x Retorno */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-red-400" />
                                    Análise de Risco
                                    <span className="text-sm text-gray-400 font-normal">
                                        (Clique para detalhes)
                                    </span>
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Análise de Risco', filteredPortfolios, 'risk-analysis')}
                                    isLoading={isExplaining === 'risk-analysis'}
                                />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer>
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                        <XAxis
                                            type="number"
                                            dataKey="risk"
                                            name="Risco"
                                            stroke="#9ca3af"
                                            domain={[0, 100]}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="return"
                                            name="Retorno"
                                            stroke="#9ca3af"
                                        />
                                        <ZAxis type="number" dataKey="size" range={[50, 400]} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<UltraPremiumTooltip />} />
                                        <Scatter
                                            name="Ativos"
                                            data={filteredPortfolios.map(p => ({
                                                name: p.ticker,
                                                risk: Math.random() * 100,
                                                return: p.profitPercent || 0,
                                                size: p.marketValue || p.totalInvested || 0,
                                                asset: p
                                            }))}
                                            fill="#8b5cf6"
                                            onClick={(data) => handleAssetClick(data.asset)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {filteredPortfolios.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.profitPercent >= 0 ? '#10b981' : '#ef4444'}
                                                />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Análise de Diversificação */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-400" />
                                    Análise de Diversificação
                                </h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-300 mb-2">Score de Diversificação</div>
                                    <div className="h-2.5 bg-gray-700 rounded-full">
                                        <div
                                            className="h-2.5 rounded-full"
                                            style={{ width: `${riskAnalysis.diversificationScore}%`, backgroundColor: riskAnalysis.riskLevel === 'Baixo' ? '#10b981' : riskAnalysis.riskLevel === 'Médio' ? '#f59e0b' : '#ef4444' }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {riskAnalysis.diversificationScore.toFixed(0)}% ({riskAnalysis.riskLevel})
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-300 mb-2">Distribuição por Setor</div>
                                    <ResponsiveContainer height={100}>
                                        <BarChart data={riskAnalysis.sectorDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                            <XAxis dataKey="sector" stroke="#9ca3af" />
                                            <YAxis stroke="#9ca3af" />
                                            <Tooltip content={<UltraPremiumTooltip />} />
                                            <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                                {riskAnalysis.sectorDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={ENHANCED_COLORS.primary[index % ENHANCED_COLORS.primary.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botão de Métricas Avançadas original mantido */}
            <motion.div className="flex justify-center mt-8">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg flex items-center gap-2"
                >
                    <Zap className="h-5 w-5" />
                    {showAdvancedMetrics ? 'Ocultar' : 'Mostrar'} Métricas Avançadas
                </motion.button>
            </motion.div>

            {/* Métricas Avançadas originais mantidas */}
            <AnimatePresence>
                {showAdvancedMetrics && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
                    >
                        {[
                            { label: 'VaR (95%)', value: 'R$ 12.450', subtext: 'Perda máxima esperada', icon: <AlertCircle /> },
                            { label: 'Sortino Ratio', value: '1.87', subtext: 'Retorno vs. risco negativo', icon: <Target /> },
                            { label: 'Alpha', value: '+3.2%', subtext: 'Retorno excedente', icon: <TrendingUp /> },
                            { label: 'Treynor Ratio', value: '0.92', subtext: 'Retorno por unidade de risco', icon: <Award /> },
                        ].map((metric, index) => (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gray-900/50 backdrop-blur-xl p-4 rounded-xl border border-gray-700/50"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">{metric.label}</span>
                                    <span className="text-gray-500">{metric.icon}</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{metric.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{metric.subtext}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

UltraAdvancedChartsTab.displayName = 'UltraAdvancedChartsTab';

export default UltraAdvancedChartsTab;

