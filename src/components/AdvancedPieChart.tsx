import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, Sector, 
  ResponsiveContainer, Tooltip, 
  Legend, LabelList
} from 'recharts';
import { PieChartData, ChartTooltipProps } from '../types/investment';

interface AdvancedPieChartProps {
  data: PieChartData[];
  title: string;
  icon: React.ReactNode;
  formatValue?: (value: number) => string;
  height?: number;
  animate?: boolean;
  exploded?: boolean;
  gradients?: boolean;
  is3d?: boolean;
}

const RADIAN = Math.PI / 180;

const AdvancedPieChart: React.FC<AdvancedPieChartProps> = ({ 
  data, 
  title, 
  icon, 
  formatValue = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
  height = 400,
  animate = true,
  exploded = true,
  gradients = true,
  is3d = true
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoverDelayTimeout, setHoverDelayTimeout] = useState<NodeJS.Timeout | null>(null); 
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // After initial animation, set flag to true
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1500); // Match with animation duration
    
    return () => clearTimeout(timer);
  }, []);

  const onPieEnter = (_: any, index: number) => {
    if (hoverDelayTimeout) {
      clearTimeout(hoverDelayTimeout);
    }
    
    // Small delay to prevent flickering on hover
    const timeout = setTimeout(() => {
      setActiveIndex(index);
    }, 50);
    
    setHoverDelayTimeout(timeout);
  };
  
  const onPieLeave = () => {
    if (hoverDelayTimeout) {
      clearTimeout(hoverDelayTimeout);
    }
    
    const timeout = setTimeout(() => {
      setActiveIndex(-1);
    }, 50);
    
    setHoverDelayTimeout(timeout);
  };

  const renderActiveShape = (props: any) => {
    const { 
      cx, cy, innerRadius, outerRadius, startAngle, endAngle, 
      fill, payload, value, percentage
    } = props;

    // Only apply explode effect if requested and animation is complete
    const explosion = exploded && animationComplete ? 10 : 0;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + explosion}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke={fill}
          strokeWidth={1}
          style={{ filter: is3d ? 'drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.3))' : 'none' }}
        />
        {/* Outer arc for active segment */}
        {animationComplete && (
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={outerRadius + explosion + 2}
            outerRadius={outerRadius + explosion + 4}
            fill={fill}
            opacity={0.4}
          />
        )}

        {/* Label for active segment */}
        <text 
          x={cx} 
          y={cy - 10} 
          textAnchor="middle" 
          fill="#ffffff" 
          fontSize={16}
          fontWeight="bold"
        >
          {payload.name}
        </text>
        <text 
          x={cx} 
          y={cy + 10} 
          textAnchor="middle" 
          fill="#94a3b8"
          fontSize={14} 
        >
          {percentage.toFixed(1)}%
        </text>
        <text 
          x={cx} 
          y={cy + 30} 
          textAnchor="middle" 
          fill="#64748b"
          fontSize={12}
        >
          {formatValue(value)}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload || {};
      return (
        <div className="bg-slate-800/95 backdrop-blur-lg border border-slate-600/50 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center space-x-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data?.color || '#3b82f6' }}
            />
            <span className="text-white font-semibold">{data?.name || 'N/A'}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="text-slate-300">Valor: <span className="text-white">{formatValue(data?.value || 0)}</span></div>
            <div className="text-slate-300">Percentual: <span className="text-white">{(data?.percentage || 0).toFixed(1)}%</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <motion.div
            key={`legend-${entry.value}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 + 0.3 }}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full 
              ${activeIndex === index ? 'bg-slate-700 ring-2 ring-slate-500' : 'bg-slate-800'} 
              hover:bg-slate-700 transition-all cursor-pointer`}
            onMouseEnter={() => onPieEnter(null, index)}
            onMouseLeave={onPieLeave}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ 
                backgroundColor: entry.color,
                boxShadow: activeIndex === index ? `0 0 8px ${entry.color}` : 'none' 
              }}
            />
            <span className="text-sm text-slate-300">{entry?.value || ''}</span>
            <span className="text-sm text-slate-400">{data[index]?.percentage?.toFixed(0) || 0}%</span>
          </motion.div>
        ))}
      </div>
    );
  };

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-lg h-[400px] flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="text-slate-400 mb-2">Sem dados disponíveis</div>
          <div className="text-slate-500 text-sm">Não há informações suficientes para exibir este gráfico</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl hover:border-slate-600/70 transition-colors"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-600/20 backdrop-blur-sm">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            {gradients && (
              <defs>
                {data.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`${entry.color}`} stopOpacity={1} />
                    <stop offset="100%" stopColor={`${entry.color}`} stopOpacity={0.7} />
                  </linearGradient>
                ))}
                
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
            )}
            
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              innerRadius={is3d ? 60 : 0}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={1500}
              animationBegin={0}
              animationEasing="ease-out"
              isAnimationActive={animate}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={gradients ? `url(#gradient-${index})` : entry.color} 
                  stroke={entry.color}
                  strokeWidth={1}
                  style={{ filter: activeIndex === index ? 'url(#glow)' : 'none' }}
                />
              ))}
              
              {/* Display percentages on the chart */}
              <LabelList 
                dataKey="percentage" 
                position="inside" 
                fill="#ffffff"
                stroke="none"
                fontSize={14}
                fontWeight="bold"
                formatter={(value: number) => value ? `${value.toFixed(0)}%` : ''}
              />
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Data display as fallback */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 hidden md:grid">
        {data.slice(0, 6).map((entry, index) => (
          <motion.div 
            key={`data-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
            className="bg-slate-900/50 rounded-lg p-2 text-sm border border-slate-800"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <div className="font-medium text-white">{entry.name}</div>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-400">{formatValue(entry.value)}</span>
              <span className="text-slate-300">{entry.percentage.toFixed(1)}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdvancedPieChart;