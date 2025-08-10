import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Globe, 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Target, 
  Info,
  ExternalLink,
  Activity,
  Eye,
  Calculator
} from 'lucide-react';
import { AssetMetadata } from '../types/investment';
import { marketApiService } from '../services/marketApi';

interface AssetDetailsProps {
  metadata: AssetMetadata;
  totalInvested: number;
  totalYield: number;
  currentPosition: number;
  marketValue?: number;
  currentPrice?: number;
}

const AssetDetails: React.FC<AssetDetailsProps> = ({ 
  metadata, 
  totalInvested, 
  totalYield, 
  currentPosition,
  marketValue: portfolioMarketValue,
  currentPrice: portfolioCurrentPrice
}) => {
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usdToBrl, setUsdToBrl] = useState<number>(1);

  // 🚨 DESABILITADO TEMPORARIAMENTE - Evitar piscar infinito
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // setLoading(true); // ❌ COMENTADO para evitar piscar
        const data = await marketApiService.getMarketData(metadata.ticker);
        setMarketData(data);
      } catch (error) {
        console.error('Erro ao buscar dados de mercado:', error);
      } finally {
        setLoading(false);
      }
    };

    // Buscar dados de mercado apenas uma vez ao montar
    fetchMarketData();
    // Buscar taxa de câmbio USD->BRL para exibição padronizada
    marketApiService.getUSDBRLExchangeRate()
      .then((rate) => { if (rate && rate > 0) setUsdToBrl(rate); })
      .catch(() => {});
    
    // ✅ INTERVALO REMOVIDO - Evita piscar constante
    // const interval = setInterval(fetchMarketData, 30000);
    // return () => clearInterval(interval);
  }, [metadata.ticker]);

  // 💰 CALCULAR VALORES REAIS (sempre exibir em BRL)
  const rawPrice = marketData ? marketData.currentPrice : (portfolioCurrentPrice || 0);
  const rawCurrency = marketData?.currency || (metadata.moeda || 'BRL');
  const displayPriceBRL = rawCurrency === 'USD' ? rawPrice * usdToBrl : rawPrice;
  const currentMarketValue = (metadata.moeda === 'USD' || rawCurrency === 'USD')
    ? currentPosition * displayPriceBRL
    : (marketData ? currentPosition * rawPrice : (portfolioMarketValue || (currentPosition * rawPrice)));
  const totalProfit = currentMarketValue - totalInvested;
  const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  const isProfit = totalProfit >= 0;

  const formatNumber = (num: number, decimals = 2) => {
    if (num === null || num === undefined) return '0,00';
    const parts = num.toFixed(decimals).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  const formatCurrency = (value: number) => {
    const symbol = 'R$';
    return `${symbol} ${Math.abs(value).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getTypeIcon = () => {
    switch (metadata.tipo) {
      case 'FII':
        return <Building2 className="w-5 h-5" />;
      case 'ACAO':
        return <TrendingUp className="w-5 h-5" />;
      case 'ETF':
      case 'REIT':
        return <Globe className="w-5 h-5" />;
      case 'STOCK':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getCountryFlag = () => {
    switch (metadata.pais) {
      case 'BRASIL':
        return '🇧🇷';
      case 'EUA':
        return '🇺🇸';
      case 'GLOBAL':
        return '🌍';
      default:
        return '🏁';
    }
  };

  return (
    <div className="space-y-6">
      {/* 🎯 HEADER PRINCIPAL MELHORADO */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700"
      >
        {/* Linha 1: Ticker + Classificação + Preço Atual */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">
              {metadata.ticker}
            </h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                {getCountryFlag()} {metadata.pais}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                {getTypeIcon()}
                <span>{metadata.tipo}</span>
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-green-600/20 text-green-300 border border-green-500/30">
                {metadata.moeda}
              </span>
            </div>
          </div>

          {/* PREÇO ATUAL - GRANDE E DESTACADO */}
          <div className="text-right">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-lg text-slate-400">Carregando...</span>
              </div>
            ) : marketData ? (
              <div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatCurrency(displayPriceBRL)}
                </div>
                <div className={`flex items-center justify-end space-x-1 text-sm ${
                  marketData.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {marketData.priceChangePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatPercent(marketData.priceChangePercent || 0)}</span>
                </div>
              </div>
            ) : portfolioCurrentPrice ? (
              <div>
                <div className="text-3xl font-bold text-white mb-1">
                  {formatCurrency(metadata.moeda === 'USD' ? portfolioCurrentPrice * usdToBrl : portfolioCurrentPrice)}
                </div>
                <div className="text-sm text-slate-400">
                  Preço médio do portfolio
                </div>
              </div>
            ) : (
              <div className="text-xl text-slate-400">Preço indisponível</div>
            )}
          </div>
        </div>

        {/* Linha 2: Nome da Empresa */}
        <div className="mb-4">
          <h2 className="text-xl text-slate-300 font-medium">
            {metadata.nome}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {metadata.setor} {metadata.subsetor && `• ${metadata.subsetor}`}
          </p>
        </div>

        {/* 💰 LINHA 3: ANÁLISE FINANCEIRA DETALHADA */}
        <div className="grid grid-cols-4 gap-6 pt-4 border-t border-slate-700">
          {/* Posição Atual */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-slate-400">Posição Atual</span>
            </div>
            <div className="text-lg font-bold text-purple-400">{formatNumber(currentPosition, 4)} cotas</div>
            <div className="text-xs text-slate-500">
              Valor investido: {formatCurrency(totalInvested)}
            </div>
          </div>

          {/* Valor Total Atual */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Calculator className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-sm text-slate-400">Valor se Vender Tudo</span>
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(currentMarketValue)}
            </div>
            <div className="text-xs text-slate-500">
              {marketData ? 
                `${currentPosition.toLocaleString('pt-BR')} × ${formatCurrency(displayPriceBRL)}` : 
                portfolioCurrentPrice ? 
                  `${currentPosition.toLocaleString('pt-BR')} × ${formatCurrency(metadata.moeda === 'USD' ? portfolioCurrentPrice * usdToBrl : portfolioCurrentPrice)}` :
                  'Aguardando preço de mercado...'}
            </div>
          </div>

          {/* Lucro/Prejuízo */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400 mr-2" />
              )}
              <span className="text-sm text-slate-400">
                {isProfit ? 'Lucro' : 'Prejuízo'}
              </span>
            </div>
            <div className={`text-lg font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : '-'}{formatCurrency(Math.abs(totalProfit))}
            </div>
            <div className={`text-xs ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercent(profitPercent)}
            </div>
          </div>

          {/* Dividend Yield */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-yellow-400 mr-2" />
              <span className="text-sm text-slate-400">DY Acumulado</span>
            </div>
            <div className="text-lg font-bold text-yellow-400">
              {totalYield.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-500">
              Proventos recebidos
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Informações Básicas
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Setor:</span>
              <span className="text-white">{metadata.setor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subsetor:</span>
              <span className="text-white">{metadata.subsetor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Segmento:</span>
              <span className="text-white">{metadata.segmento}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Liquidez:</span>
              <span className={`${
                metadata.liquidez === 'ALTA' ? 'text-green-400' : 
                metadata.liquidez === 'MEDIA' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {metadata.liquidez}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            Dados de Mercado
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Benchmark:</span>
              <span className="text-white">{metadata.benchmark}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ISIN:</span>
              <span className="text-white font-mono text-xs">{metadata.isin}</span>
            </div>
            {metadata.cnpj && (
              <div className="flex justify-between">
                <span className="text-slate-400">CNPJ:</span>
                <span className="text-white font-mono text-xs">{metadata.cnpj}</span>
              </div>
            )}
            {metadata.gestora && (
              <div className="flex justify-between">
                <span className="text-slate-400">Gestora:</span>
                <span className="text-white">{metadata.gestora}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Sua Posição
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Investido:</span>
              <span className="text-white font-semibold">{formatCurrency(Math.abs(totalInvested))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DY Atual:</span>
              <span className={`font-semibold ${
                totalYield >= 8 ? 'text-green-400' : 
                totalYield >= 5 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {totalYield.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações Específicas por Tipo */}
      {metadata.fundo_imobiliario && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-700 rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Informações do FII
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Tipo FII:</span>
              <div className="text-white font-semibold">{metadata.fundo_imobiliario.tipo_fii}</div>
            </div>
            <div>
              <span className="text-slate-400">Patrimônio:</span>
              <div className="text-white font-semibold">
                {formatCurrency(metadata.fundo_imobiliario.patrimonio_liquido)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Cotistas:</span>
              <div className="text-white font-semibold">
                {formatLargeNumber(metadata.fundo_imobiliario.num_cotistas)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">P/VP:</span>
              <div className="text-white font-semibold">
                {metadata.fundo_imobiliario.p_vp.toFixed(2)}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {metadata.acao && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-700 rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Indicadores Fundamentais
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">P/L:</span>
              <div className="text-white font-semibold">{metadata.acao.p_l.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-slate-400">P/VP:</span>
              <div className="text-white font-semibold">{metadata.acao.p_vp.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-slate-400">ROE:</span>
              <div className="text-white font-semibold">{metadata.acao.roe.toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-slate-400">ROIC:</span>
              <div className="text-white font-semibold">{metadata.acao.roic.toFixed(2)}%</div>
            </div>
          </div>
        </motion.div>
      )}

      {metadata.etf && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-700 rounded-lg p-4"
        >
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" />
            Informações do ETF
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Taxa de Admin:</span>
              <div className="text-white font-semibold">{metadata.etf.expense_ratio.toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-slate-400">Patrimônio:</span>
              <div className="text-white font-semibold">
                {formatCurrency(metadata.etf.aum)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Tracking Error:</span>
              <div className="text-white font-semibold">{metadata.etf.tracking_error.toFixed(2)}%</div>
            </div>
            <div>
              <span className="text-slate-400">Início:</span>
              <div className="text-white font-semibold">{metadata.etf.inception_date}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AssetDetails;