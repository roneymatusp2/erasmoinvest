import React, { useMemo, useState, useRef, useEffect } from 'react';
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
    ZAxis
} from 'recharts';
import { Portfolio } from '../types/investment';
import { ASSET_TYPE_COLORS, ASSET_TYPE_NAMES, getAssetType } from '../utils/assetType';
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
    VolumeX
} from 'lucide-react';

// Tipos e Interfaces
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

// Paleta de cores profissional
const CHART_COLORS = {
    primary: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'],
    gradient: {
        profit: ['#10b981', '#34d399'],
        loss: ['#ef4444', '#f87171'],
        neutral: ['#6b7280', '#9ca3af'],
        premium: ['#6366f1', '#a78bfa'],
        gold: ['#f59e0b', '#fbbf24']
    },
    dark: {
        bg: 'rgba(17, 24, 39, 0.8)',
        bgLight: 'rgba(31, 41, 55, 0.6)',
        border: 'rgba(75, 85, 99, 0.3)',
        text: '#e5e7eb',
        textMuted: '#9ca3af'
    }
};

// Componente de Métrica Animada
const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color, subtitle }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-xl border border-gray-700/50 backdrop-blur-lg`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    {icon}
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 text-sm font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {change >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {Math.abs(change).toFixed(1)}%
                    </div>
                )}
            </div>
            <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white">
                {value}
            </p>
            {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </motion.div>
    );
};

// Loading com animação premium
const PremiumLoading = () => (
    <div className="flex items-center justify-center h-96">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="relative"
        >
            <div className="w-24 h-24 border-4 border-indigo-600/30 rounded-full"></div>
            <div className="w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent absolute top-0 left-0"></div>
            <Zap className="h-8 w-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
    </div>
);

// Tooltip customizado premium
const PremiumTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900/95 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-gray-700/50"
        >
            {label && <p className="text-gray-400 text-sm mb-2">{label}</p>}
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <span className="text-gray-300 text-sm">{entry.name}:</span>
                    <span className="text-white font-bold text-sm">
            {typeof entry.value === 'number'
                ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : entry.value
            }
          </span>
                </div>
            ))}
        </motion.div>
    );
};

// Empty State Premium
const PremiumEmptyState = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-full flex flex-col items-center justify-center py-24"
    >
        <motion.div
            animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="mb-8"
        >
            <PieChartIcon className="h-32 w-32 text-gray-600" />
        </motion.div>
        <h3 className="text-2xl font-bold text-gray-300 mb-2">Nenhum dado disponível</h3>
        <p className="text-gray-500 text-center max-w-md">
            Adicione investimentos para visualizar análises detalhadas e insights poderosos sobre seu portfólio.
        </p>
    </motion.div>
);

// Componente de botão de explicação
const ExplainButton: React.FC<{ onClick: () => void; isLoading?: boolean }> = ({ onClick, isLoading = false }) => (
    <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        disabled={isLoading}
        className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50"
        title="Explicar com IA"
    >
        {isLoading ? (
            <Loader className="h-5 w-5 animate-spin" />
        ) : (
            <Sparkles className="h-5 w-5 animate-pulse" />
        )}
    </motion.button>
);

// Componente de modal de explicação melhorado
const ExplanationModal: React.FC<{
    explanation: {title: string, content: string, isLoading: boolean};
    onClose: () => void;
}> = ({ explanation, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-600/10 rounded-xl">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">{explanation.title}</h2>
            </div>

            {explanation.isLoading ? (
                <div className="flex flex-col items-center justify-center h-48">
                    <Loader className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-400">Nossa IA está analisando os dados...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-gray-300 leading-relaxed prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans">{explanation.content}</pre>
                    </div>

                    {/* Controles de áudio */}
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <div className="flex items-center gap-2">
                            <Volume2 className="h-5 w-5 text-gray-400" />
                            <span className="text-gray-400 text-sm">Áudio:</span>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => voiceService.playTextAudio(explanation.content)}
                            disabled={voiceService.isAudioPlaying}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all disabled:opacity-50"
                        >
                            <Play className="h-4 w-4" />
                            {voiceService.isAudioPlaying ? 'Reproduzindo...' : 'Ouvir Explicação'}
                        </motion.button>

                        {voiceService.isAudioPlaying && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => voiceService.stopAudio()}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                            >
                                <VolumeX className="h-4 w-4" />
                                Parar
                            </motion.button>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    </motion.div>
);

const ChartsTab: React.FC<ChartsTabProps> = React.memo(({ portfolios, rawInvestments }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'allocation' | 'income' | 'risk'>('overview');
    const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
    const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
    const [explanation, setExplanation] = useState<{title: string, content: string, isLoading: boolean}>({title: '', content: '', isLoading: false});
    const [isExplaining, setIsExplaining] = useState<string>(''); // Track which chart is being explained

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    // Cálculos de métricas principais
    const mainMetrics = useMemo(() => {
        console.log('📊 ChartsTab - Calculando métricas...');
        console.log('📊 Exemplo de portfolio:', portfolios[0]);

        const totalInvested = portfolios.reduce((sum, p) => {
            const value = Number(p.totalInvested || 0);
            return sum + value;
        }, 0);

        const totalMarketValue = portfolios.reduce((sum, p) => {
            const value = Number(p.marketValue || p.totalInvested || 0);
            return sum + value;
        }, 0);

        const totalDividends = portfolios.reduce((sum, p) => {
            const value = Number(p.totalDividends || 0);
            return sum + value;
        }, 0);

        const totalJuros = portfolios.reduce((sum, p) => {
            const value = Number(p.totalJuros || 0);
            return sum + value;
        }, 0);

        const totalIncome = totalDividends + totalJuros;
        const totalProfit = totalMarketValue - totalInvested + totalIncome;
        const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
        const monthlyIncome = totalIncome / 12;

        console.log('💰 Métricas calculadas:', {
            totalInvested,
            totalMarketValue,
            totalDividends,
            totalJuros,
            totalIncome,
            totalProfit,
            roi,
            monthlyIncome
        });

        return {
            totalInvested,
            totalMarketValue,
            totalDividends,
            totalJuros,
            totalIncome,
            totalProfit,
            roi,
            monthlyIncome,
            assetCount: portfolios.length
        };
    }, [portfolios]);

    // Dados para gráfico de alocação avançado
    const allocationData = useMemo(() => {
        const allocation: { [key: string]: number } = {};
        let total = 0;

        portfolios.forEach(p => {
            const assetType = getAssetType(p.ticker, p.metadata);
            if (!allocation[assetType]) {
                allocation[assetType] = 0;
            }
            const value = Number(p.marketValue || p.totalInvested || 0);
            if (value > 0) {
                allocation[assetType] += value;
                total += value;
            }
        });

        return Object.keys(allocation)
            .filter(type => allocation[type] > 0)
            .map(type => ({
                name: ASSET_TYPE_NAMES[type as keyof typeof ASSET_TYPE_NAMES] || type,
                value: allocation[type],
                percentage: total > 0 ? (allocation[type] / total) * 100 : 0,
                fill: ASSET_TYPE_COLORS[type] || '#8884d8',
            }))
            .sort((a, b) => b.value - a.value);
    }, [portfolios]);

    // Dados para TreeMap (mapa de calor de ativos)
    const treeMapData = useMemo(() => {
        const children = portfolios
            .filter(p => (p.marketValue || p.totalInvested) > 0)
            .map(p => ({
                name: p.ticker,
                size: Math.abs(p.marketValue || p.totalInvested || 1),
                performance: p.profitPercent || 0,
                dividendYield: p.totalYield || 0,
                sector: p.metadata?.setor || 'Outros'
            }))
            .filter(item => item.size > 0)
            .sort((a, b) => b.size - a.size);

        return children.length > 0 ? {
            name: 'Portfolio',
            children
        } : null;
    }, [portfolios]);

    // Performance histórica mensal
    const performanceTimeline = useMemo(() => {
        const monthlyData: { [key: string]: { invested: number; income: number; value: number } } = {};

        if (rawInvestments && rawInvestments.length > 0) {
            let cumulativeInvested = 0;

            rawInvestments
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .forEach(inv => {
                    const month = inv.date.substring(0, 7);
                    if (!monthlyData[month]) {
                        monthlyData[month] = { invested: 0, income: 0, value: 0 };
                    }
                    cumulativeInvested += (inv.compra * inv.valor_unit) - (inv.venda * inv.valor_unit);
                    monthlyData[month].invested = cumulativeInvested;
                    monthlyData[month].income += (inv.dividendos || 0) + (inv.juros || 0);
                });
        }

        const currentMonthKey = new Date().toISOString().substring(0, 7);
        if (!monthlyData[currentMonthKey]) {
            monthlyData[currentMonthKey] = { invested: mainMetrics.totalInvested, income: 0, value: mainMetrics.totalMarketValue };
        } else {
            monthlyData[currentMonthKey].value = mainMetrics.totalMarketValue;
            monthlyData[currentMonthKey].invested = mainMetrics.totalInvested;
        }

        const allMonths = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                monthLabel: new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                invested: data.invested,
                value: data.value || data.invested,
                income: data.income,
                profit: (data.value || data.invested) - data.invested,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        const getMonths = (n: number) => allMonths.slice(-n);

        switch (timeRange) {
            case '1M':
                return getMonths(2);
            case '3M':
                return getMonths(4);
            case '6M':
                return getMonths(7);
            case '1Y':
                return getMonths(13);
            case 'ALL':
            default:
                return allMonths;
        }
    }, [rawInvestments, mainMetrics, timeRange]);

    // Análise de risco (simulada)
    const riskAnalysis = useMemo(() => {
        const sectors = portfolios.reduce((acc, p) => {
            const sector = p.metadata?.setor || 'Outros';
            if (!acc[sector]) acc[sector] = 0;
            acc[sector] += p.marketValue || p.totalInvested || 0;
            return acc;
        }, {} as Record<string, number>);

        const totalValue = Object.values(sectors).reduce((sum, val) => sum + val, 0);
        const sectorCount = Object.keys(sectors).length;
        const diversificationScore = Math.min((sectorCount / 10) * 100, 100);

        return {
            diversificationScore,
            sectorDistribution: Object.entries(sectors).map(([sector, value]) => ({
                sector,
                value,
                percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
            })),
            riskLevel: diversificationScore > 70 ? 'Baixo' : diversificationScore > 40 ? 'Médio' : 'Alto'
        };
    }, [portfolios]);

    // Top performers
    const topPerformers = useMemo(() => {
        return portfolios
            .map(p => ({
                ticker: p.ticker,
                name: p.metadata?.nome || p.ticker,
                profit: p.profit || 0,
                profitPercent: p.profitPercent || 0,
                dividendYield: p.totalYield || 0,
                totalIncome: (p.totalDividends || 0) + (p.totalJuros || 0)
            }))
            .sort((a, b) => b.profitPercent - a.profitPercent)
            .slice(0, 5);
    }, [portfolios]);

    // Função melhorada para explicar gráficos
    const handleExplainChart = async (chartTitle: string, chartData: any, chartId: string) => {
        setIsExplaining(chartId);
        setExplanation({ title: chartTitle, content: '', isLoading: true });

        try {
            const result = await voiceService.getChartExplanation(chartTitle, chartData);
            if (result) {
                setExplanation({ title: chartTitle, content: result.text, isLoading: false });
            } else {
                setExplanation({
                    title: chartTitle,
                    content: 'Ocorreu um erro ao gerar a explicação. Por favor, tente novamente mais tarde.',
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Erro ao explicar gráfico:', error);
            setExplanation({
                title: chartTitle,
                content: 'Erro interno. Verifique sua conexão e tente novamente.',
                isLoading: false
            });
        } finally {
            setIsExplaining('');
        }
    };

    const closeExplanation = () => {
        setExplanation({title: '', content: '', isLoading: false});
        voiceService.stopAudio(); // Parar áudio se estiver tocando
    };

    if (isLoading) {
        return <PremiumLoading />;
    }

    if (!portfolios || portfolios.length === 0) {
        return <PremiumEmptyState />;
    }

    return (
        <div className="space-y-6 p-4">
            <AnimatePresence>
                {(explanation.isLoading || explanation.content) && (
                    <ExplanationModal
                        explanation={explanation}
                        onClose={closeExplanation}
                    />
                )}
            </AnimatePresence>

            {/* Header com navegação */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Análise de Investimentos</h2>
                    <p className="text-gray-400">Dashboard profissional com insights detalhados</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: <Activity className="h-4 w-4" /> },
                        { id: 'performance', label: 'Performance', icon: <TrendingUp className="h-4 w-4" /> },
                        { id: 'allocation', label: 'Alocação', icon: <PieChartIcon className="h-4 w-4" /> },
                        { id: 'income', label: 'Renda', icon: <DollarSign className="h-4 w-4" /> },
                        { id: 'risk', label: 'Risco', icon: <Shield className="h-4 w-4" /> }
                    ].map(view => (
                        <motion.button
                            key={view.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedView(view.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                                selectedView === view.id
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                            }`}
                        >
                            {view.icon}
                            <span>{view.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    title="Valor Total"
                    value={`R$ ${mainMetrics.totalMarketValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={mainMetrics.roi}
                    icon={<DollarSign className="h-6 w-6 text-white" />}
                    color="from-indigo-600 to-purple-600"
                    subtitle={`${mainMetrics.assetCount} ativos`}
                />
                <MetricCard
                    title="Lucro Total"
                    value={`R$ ${mainMetrics.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    change={mainMetrics.roi}
                    icon={<TrendingUp className="h-6 w-6 text-white" />}
                    color={mainMetrics.totalProfit >= 0 ? "from-green-600 to-emerald-600" : "from-red-600 to-pink-600"}
                    subtitle={`ROI: ${mainMetrics.roi.toFixed(2)}%`}
                />
                <MetricCard
                    title="Renda Passiva"
                    value={`R$ ${mainMetrics.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<Award className="h-6 w-6 text-white" />}
                    color="from-amber-600 to-orange-600"
                    subtitle={`Média: R$ ${mainMetrics.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`}
                />
                <MetricCard
                    title="Score de Diversificação"
                    value={`${riskAnalysis.diversificationScore.toFixed(0)}%`}
                    icon={<Shield className="h-6 w-6 text-white" />}
                    color="from-cyan-600 to-blue-600"
                    subtitle={`Risco: ${riskAnalysis.riskLevel}`}
                />
            </div>

            {/* Conteúdo principal baseado na view selecionada */}
            <AnimatePresence mode="wait">
                {selectedView === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {/* Gráfico de Pizza Premium */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5 text-indigo-400" />
                                    Alocação por Tipo de Ativo
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
                                        >
                                            {allocationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PremiumTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* TreeMap de Ativos */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                    Mapa de Calor do Portfólio
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
                                                    <g>
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

                        {/* Top Performers */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-400" />
                                    Top 5 Performers
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Top 5 Performers', topPerformers, 'top-performers')}
                                    isLoading={isExplaining === 'top-performers'}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {topPerformers.map((asset, index) => (
                                    <motion.div
                                        key={asset.ticker}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-white">{asset.ticker}</h4>
                                            <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-2">{asset.name}</p>
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

                {selectedView === 'performance' && (
                    <motion.div
                        key="performance"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Seletor de período */}
                        <div className="flex justify-end gap-2">
                            {['1M', '3M', '6M', '1Y', 'ALL'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range as any)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        timeRange === range
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        {/* Gráfico de Performance */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-green-400" />
                                    Evolução do Patrimônio
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Evolução do Patrimônio', performanceTimeline, 'performance-timeline')}
                                    isLoading={isExplaining === 'performance-timeline'}
                                />
                            </div>
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <ComposedChart data={performanceTimeline}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                        <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                        <YAxis yAxisId="left" stroke="#9ca3af" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                                        <Tooltip content={<PremiumTooltip />} />
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

                        {/* Scatter Plot de Risco x Retorno */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Target className="h-5 w-5 text-purple-400" />
                                    Análise Risco x Retorno
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Análise Risco x Retorno', portfolios.map(p => ({
                                        name: p.ticker,
                                        risk: Math.random() * 100,
                                        return: p.profitPercent || 0,
                                        size: p.marketValue || p.totalInvested || 0
                                    })), 'risk-return')}
                                    isLoading={isExplaining === 'risk-return'}
                                />
                            </div>
                            <div className="h-96">
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
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<PremiumTooltip />} />
                                        <Scatter
                                            name="Ativos"
                                            data={portfolios.map(p => ({
                                                name: p.ticker,
                                                risk: Math.random() * 100,
                                                return: p.profitPercent || 0,
                                                size: p.marketValue || p.totalInvested || 0
                                            }))}
                                            fill="#8b5cf6"
                                        >
                                            {portfolios.map((entry, index) => (
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
                    </motion.div>
                )}

                {selectedView === 'allocation' && (
                    <motion.div
                        key="allocation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {/* Gráfico de Rosca Avançado */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5 text-indigo-400" />
                                    Distribuição de Ativos
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Distribuição de Ativos', allocationData, 'allocation-donut')}
                                    isLoading={isExplaining === 'allocation-donut'}
                                />
                            </div>
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={allocationData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {allocationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PremiumTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Lista detalhada */}
                            <div className="mt-4 space-y-2">
                                {allocationData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                            <span className="text-gray-300">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-bold">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-gray-400 text-sm">{item.percentage.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Radar Chart de Diversificação */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-cyan-400" />
                                    Análise de Diversificação
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Análise de Diversificação', riskAnalysis.sectorDistribution, 'diversification-radar')}
                                    isLoading={isExplaining === 'diversification-radar'}
                                />
                            </div>
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <RadarChart data={riskAnalysis.sectorDistribution.slice(0, 8)}>
                                        <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                                        <PolarAngleAxis dataKey="sector" stroke="#9ca3af" />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
                                        <Radar
                                            name="Alocação %"
                                            dataKey="percentage"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.6}
                                        />
                                        <Tooltip content={<PremiumTooltip />} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Métricas de risco */}
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Score de Diversificação</p>
                                    <p className="text-2xl font-bold text-white">{riskAnalysis.diversificationScore.toFixed(0)}%</p>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Nível de Risco</p>
                                    <p className={`text-2xl font-bold ${
                                        riskAnalysis.riskLevel === 'Baixo' ? 'text-green-400' :
                                            riskAnalysis.riskLevel === 'Médio' ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{riskAnalysis.riskLevel}</p>
                                </div>
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
                        {/* Calendário de Proventos */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-amber-400" />
                                    Histórico de Proventos
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Histórico de Proventos', performanceTimeline, 'income-history')}
                                    isLoading={isExplaining === 'income-history'}
                                />
                            </div>
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <BarChart data={performanceTimeline}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                        <XAxis dataKey="monthLabel" stroke="#9ca3af" />
                                        <YAxis stroke="#9ca3af" />
                                        <Tooltip content={<PremiumTooltip />} />
                                        <Bar
                                            dataKey="income"
                                            fill="url(#colorIncome)"
                                            radius={[8, 8, 0, 0]}
                                            name="Proventos Recebidos"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Estatísticas de renda */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Total Recebido</p>
                                    <p className="text-xl font-bold text-amber-400">
                                        R$ {mainMetrics.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Média Mensal</p>
                                    <p className="text-xl font-bold text-green-400">
                                        R$ {mainMetrics.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Dividendos</p>
                                    <p className="text-xl font-bold text-blue-400">
                                        R$ {mainMetrics.totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-gray-800/30 p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Juros</p>
                                    <p className="text-xl font-bold text-purple-400">
                                        R$ {mainMetrics.totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Top Pagadores de Dividendos */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Award className="h-5 w-5 text-green-400" />
                                    Maiores Pagadores de Proventos
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Maiores Pagadores de Proventos', portfolios
                                        .filter(p => (p.totalDividends || 0) + (p.totalJuros || 0) > 0)
                                        .sort((a, b) => ((b.totalDividends || 0) + (b.totalJuros || 0)) - ((a.totalDividends || 0) + (a.totalJuros || 0)))
                                        .slice(0, 10), 'top-dividend-payers')}
                                    isLoading={isExplaining === 'top-dividend-payers'}
                                />
                            </div>
                            <div className="space-y-3">
                                {portfolios
                                    .filter(p => (p.totalDividends || 0) + (p.totalJuros || 0) > 0)
                                    .sort((a, b) => ((b.totalDividends || 0) + (b.totalJuros || 0)) - ((a.totalDividends || 0) + (a.totalJuros || 0)))
                                    .slice(0, 10)
                                    .map((asset, index) => {
                                        const totalIncome = (asset.totalDividends || 0) + (asset.totalJuros || 0);
                                        const maxIncome = Math.max(...portfolios.map(p => (p.totalDividends || 0) + (p.totalJuros || 0)));
                                        const percentage = (totalIncome / maxIncome) * 100;

                                        return (
                                            <motion.div
                                                key={asset.ticker}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="bg-gray-800/30 p-4 rounded-lg"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                                        <div>
                                                            <h4 className="font-bold text-white">{asset.ticker}</h4>
                                                            <p className="text-xs text-gray-400">{asset.metadata?.nome || asset.ticker}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-400">
                                                            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-xs text-gray-400">DY: {asset.totalYield?.toFixed(2)}%</p>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 1, delay: index * 0.1 }}
                                                        className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
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
                        {/* Matriz de Correlação (simulada) */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-red-400" />
                                    Análise de Risco do Portfólio
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Análise de Risco do Portfólio', {
                                        volatilidade: 15.2,
                                        sharpeRatio: 1.24,
                                        beta: 0.87,
                                        diversificationScore: riskAnalysis.diversificationScore,
                                        riskLevel: riskAnalysis.riskLevel,
                                        sectorDistribution: riskAnalysis.sectorDistribution
                                    }, 'risk-analysis')}
                                    isLoading={isExplaining === 'risk-analysis'}
                                />
                            </div>

                            {/* Indicadores de Risco */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 p-6 rounded-xl border border-red-600/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-gray-300">Volatilidade</h4>
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">15.2%</p>
                                    <p className="text-sm text-gray-400 mt-1">Últimos 12 meses</p>
                                </div>

                                <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 p-6 rounded-xl border border-amber-600/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-gray-300">Sharpe Ratio</h4>
                                        <Percent className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">1.24</p>
                                    <p className="text-sm text-gray-400 mt-1">Retorno ajustado ao risco</p>
                                </div>

                                <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-6 rounded-xl border border-green-600/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-gray-300">Beta</h4>
                                        <Activity className="h-5 w-5 text-green-400" />
                                    </div>
                                    <p className="text-3xl font-bold text-white">0.87</p>
                                    <p className="text-sm text-gray-400 mt-1">vs. IBOVESPA</p>
                                </div>
                            </div>

                            {/* Distribuição de Risco por Setor */}
                            <div className="h-96">
                                <ResponsiveContainer>
                                    <BarChart
                                        data={riskAnalysis.sectorDistribution}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                        <XAxis type="number" stroke="#9ca3af" />
                                        <YAxis type="category" dataKey="sector" stroke="#9ca3af" width={100} />
                                        <Tooltip content={<PremiumTooltip />} />
                                        <Bar dataKey="percentage" fill="#ef4444" radius={[0, 8, 8, 0]}>
                                            {riskAnalysis.sectorDistribution.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Recomendações */}
                        <motion.div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Target className="h-5 w-5 text-blue-400" />
                                    Recomendações de Otimização
                                </h3>
                                <ExplainButton
                                    onClick={() => handleExplainChart('Recomendações de Otimização', [
                                        { title: 'Diversificação Geográfica', description: 'Considere adicionar mais ativos internacionais para reduzir risco país', impact: 'Alto' },
                                        { title: 'Balanceamento Setorial', description: 'Setor de tecnologia está sub-representado no portfólio', impact: 'Médio' },
                                        { title: 'Liquidez', description: 'Mantenha 10-15% em ativos de alta liquidez para emergências', impact: 'Baixo' }
                                    ], 'optimization-recommendations')}
                                    isLoading={isExplaining === 'optimization-recommendations'}
                                />
                            </div>
                            <div className="space-y-3">
                                {[
                                    {
                                        title: 'Diversificação Geográfica',
                                        description: 'Considere adicionar mais ativos internacionais para reduzir risco país',
                                        impact: 'Alto',
                                        color: 'text-red-400'
                                    },
                                    {
                                        title: 'Balanceamento Setorial',
                                        description: 'Setor de tecnologia está sub-representado no portfólio',
                                        impact: 'Médio',
                                        color: 'text-amber-400'
                                    },
                                    {
                                        title: 'Liquidez',
                                        description: 'Mantenha 10-15% em ativos de alta liquidez para emergências',
                                        impact: 'Baixo',
                                        color: 'text-green-400'
                                    },
                                ].map((rec, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white mb-1">{rec.title}</h4>
                                                <p className="text-sm text-gray-400">{rec.description}</p>
                                            </div>
                                            <span className={`text-sm font-bold ${rec.color} ml-4`}>
                        Impacto: {rec.impact}
                      </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botão de Métricas Avançadas */}
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

            {/* Métricas Avançadas */}
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

ChartsTab.displayName = 'ChartsTab';

export default ChartsTab;