import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Building2, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Target,
  Shield,
  Activity,
  Award,
  Zap,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Portfolio } from '../types/investment';

interface AdvancedDashboardProps {
  portfolios: Portfolio[];
}

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ portfolios }) => {
  const analysis = useMemo(() => {
    const totalInvestido = portfolios.reduce((sum, p) => sum + Math.abs(p.totalInvested), 0);
    const valorMercado = portfolios.reduce((sum, p) => sum + (p.marketValue || 0), 0);
    const totalProventos = portfolios.reduce((sum, p) => sum + p.totalDividends + p.totalJuros, 0);
    
    // Análise por tipo
    const porTipo = portfolios.reduce((acc, p) => {
      const tipo = p.metadata.tipo;
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          valor_investido: 0, 
          percentual: 0,
          dy_medio: 0,
          renda_mensal: 0,
          ativos: []
        };
      }
      acc[tipo].valor_investido += Math.abs(p.totalInvested);
      acc[tipo].renda_mensal += (p.totalDividends + p.totalJuros) / 12;
      acc[tipo].ativos.push(p.ticker);
      return acc;
    }, {} as any);

    // Calcular percentuais e DY médio
    Object.keys(porTipo).forEach(tipo => {
      porTipo[tipo].percentual = (porTipo[tipo].valor_investido / totalInvestido) * 100;
      const ativosDoTipo = portfolios.filter(p => p.metadata?.tipo === tipo);
      porTipo[tipo].dy_medio = ativosDoTipo.length > 0 ? 
        ativosDoTipo.reduce((sum, p) => sum + p.totalYield, 0) / ativosDoTipo.length : 0;
    });

    // Análise por país
    const porPais = portfolios.reduce((acc, p) => {
      const pais = p.metadata?.pais || 'BRASIL';
      if (!acc[pais]) {
        acc[pais] = {
          pais,
          valor_investido: 0,
          percentual: 0,
          dy_medio: 0,
          moeda: p.metadata?.moeda || 'BRL',
          ativos: []
        };
      }
      acc[pais].valor_investido += Math.abs(p.totalInvested);
      acc[pais].ativos.push(p.ticker);
      return acc;
    }, {} as any);

    Object.keys(porPais).forEach(pais => {
      porPais[pais].percentual = (porPais[pais].valor_investido / totalInvestido) * 100;
      const ativosDoPais = portfolios.filter(p => p.metadata.pais === pais);
      porPais[pais].dy_medio = ativosDoPais.length > 0 ? 
        ativosDoPais.reduce((sum, p) => sum + p.totalYield, 0) / ativosDoPais.length : 0;
    });

    // Análise por setor
    const porSetor = portfolios.reduce((acc, p) => {
      const setor = p.metadata?.setor || 'Outros';
      if (!acc[setor]) {
        acc[setor] = {
          setor,
          valor_investido: 0,
          percentual: 0,
          dy_medio: 0,
          ativos: []
        };
      }
      acc[setor].valor_investido += Math.abs(p.totalInvested);
      acc[setor].ativos.push(p.ticker);
      return acc;
    }, {} as any);

    Object.keys(porSetor).forEach(setor => {
      porSetor[setor].percentual = (porSetor[setor].valor_investido / totalInvestido) * 100;
      const ativosDoSetor = portfolios.filter(p => p.metadata.setor === setor);
      porSetor[setor].dy_medio = ativosDoSetor.length > 0 ? 
        ativosDoSetor.reduce((sum, p) => sum + p.totalYield, 0) / ativosDoSetor.length : 0;
    });

    // Top performers
    const topPerformers = {
      maior_dy: [...portfolios].sort((a, b) => b.totalYield - a.totalYield).slice(0, 5),
      maior_rentabilidade: [...portfolios].sort((a, b) => b.profitPercent - a.profitPercent).slice(0, 5),
      maior_renda_mensal: [...portfolios].sort((a, b) => (b.totalDividends + b.totalJuros) - (a.totalDividends + a.totalJuros)).slice(0, 5),
      maior_crescimento: [...portfolios].sort((a, b) => b.profit - a.profit).slice(0, 5)
    };

    return {
      resumo_geral: {
        total_investido: totalInvestido,
        valor_mercado: valorMercado,
        lucro_prejuizo: valorMercado - totalInvestido,
        rentabilidade_total: totalInvestido > 0 ? ((valorMercado - totalInvestido) / totalInvestido) * 100 : 0,
        dy_medio: portfolios.reduce((sum, p) => sum + p.totalYield, 0) / portfolios.length,
        renda_mensal: totalProventos / 12,
        num_ativos: portfolios.length
      },
      por_tipo: porTipo,
      por_pais: porPais,
      por_setor: porSetor,
      top_performers: topPerformers
    };
  }, [portfolios]);

  const pieColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const pieDataTipo = Object.values(analysis.por_tipo).map((item: any, index) => ({
    name: item.tipo,
    value: item.valor_investido,
    percentage: item.percentual,
    color: pieColors[index % pieColors.length]
  }));

  const pieDataPais = Object.values(analysis.por_pais).map((item: any, index) => ({
    name: item.pais,
    value: item.valor_investido,
    percentage: item.percentual,
    color: pieColors[index % pieColors.length]
  }));

  const barDataSetor = Object.values(analysis.por_setor).map((item: any) => ({
    name: item.setor,
    valor: item.valor_investido,
    dy: item.dy_medio,
    percentage: item.percentual
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.name === 'valor' ? formatCurrency(entry.value) : `${entry.value.toFixed(2)}%`}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + (radius + 30) * Math.cos(-midAngle * RADIAN);
    const y = cy + (radius + 15) * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium fill-white"
        style={{ filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))' }}
      >
        {`${name.substring(0, 10)}${name.length > 10 ? '...' : ''} ${value > 0 ? ((value / analysis.resumo_geral.total_investido) * 100).toFixed(0) : 0}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Investido',
            value: formatCurrency(analysis.resumo_geral.total_investido),
            icon: DollarSign,
            gradient: 'from-blue-500 to-blue-600',
            change: '+12.5%',
            changeType: 'positive'
          },
          {
            title: 'Rentabilidade',
            value: `${analysis.resumo_geral.rentabilidade_total.toFixed(2)}%`,
            icon: TrendingUp,
            gradient: 'from-green-500 to-green-600',
            change: '+8.3%',
            changeType: 'positive'
          },
          {
            title: 'DY Médio',
            value: `${analysis.resumo_geral.dy_medio.toFixed(2)}%`,
            icon: Target,
            gradient: 'from-purple-500 to-purple-600',
            change: '+2.1%',
            changeType: 'positive'
          },
          {
            title: 'Renda Mensal',
            value: formatCurrency(analysis.resumo_geral.renda_mensal),
            icon: Activity,
            gradient: 'from-orange-500 to-orange-600',
            change: '+15.7%',
            changeType: 'positive'
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-10 group-hover:opacity-20 transition-all duration-500`} />
            
            <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} opacity-20`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  metric.changeType === 'positive' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {metric.change}
                </div>
              </div>
              
              <div className="text-sm text-neutral-400 mb-1">{metric.title}</div>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribuição por Tipo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="group relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
          
          <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <PieChartIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Distribuição por Tipo</h3>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataTipo}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieDataTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Distribuição por País */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="group relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10" />
          
          <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Globe className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Distribuição por País</h3>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataPais}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieDataPais.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Análise por Setor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="group relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-orange-500/10" />
        
        <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">Análise por Setor</h3>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barDataSetor}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="valor" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="group relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10" />
          
          <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Top 5 - Dividend Yield</h3>
            </div>
            
            <div className="space-y-4">
              {analysis.top_performers.maior_dy.map((portfolio, index) => (
                <div key={portfolio.ticker} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="text-yellow-400 font-bold text-lg">#{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">{portfolio.ticker}</div>
                      <div className="text-sm text-neutral-400 truncate max-w-[200px]">{portfolio.metadata.nome}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-400 text-lg">{portfolio.totalYield.toFixed(2)}%</div>
                    <div className="text-sm text-neutral-400">{formatCurrency(Math.abs(portfolio.totalInvested))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="group relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10" />
          
          <div className="relative glass border border-white/10 group-hover:border-white/20 rounded-2xl p-6 transition-all duration-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Top 5 - Rentabilidade</h3>
            </div>
            
            <div className="space-y-4">
              {analysis.top_performers.maior_rentabilidade.map((portfolio, index) => (
                <div key={portfolio.ticker} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="text-green-400 font-bold text-lg">#{index + 1}</div>
                    <div>
                      <div className="font-semibold text-white">{portfolio.ticker}</div>
                      <div className="text-sm text-neutral-400 truncate max-w-[200px]">{portfolio.metadata.nome}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-lg ${portfolio.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolio.profitPercent.toFixed(2)}%
                    </div>
                    <div className="text-sm text-neutral-400">{formatCurrency(portfolio.profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvancedDashboard;