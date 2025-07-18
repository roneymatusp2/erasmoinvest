import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { currencyService } from '../services/currencyService';

interface CurrencyConverterProps {
  className?: string;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ className = '' }) => {
  const [exchangeRate, setExchangeRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchExchangeRate = async () => {
    setLoading(true);
    try {
      const rate = await currencyService.getUSDToBRLRate();
      setExchangeRate(rate);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      console.error('Erro ao obter cotação:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  if (!exchangeRate) {
    return (
      <div className={`bg-slate-800 rounded-xl p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getSourceIcon = (source: string) => {
    if (source.includes('brapi')) return '🇧🇷';
    if (source.includes('exchange')) return '🌍';
    return '🎲';
  };

  const getSourceName = (source: string) => {
    if (source.includes('brapi')) return 'Brapi.dev';
    if (source.includes('exchange')) return 'ExchangeRate-API';
    return 'Estimativa';
  };

  return (
    <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <DollarSign className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">USD → BRL</h3>
            <p className="text-xs text-slate-400">
              {getSourceIcon(exchangeRate.source)} {getSourceName(exchangeRate.source)}
            </p>
          </div>
        </div>
        <button
          onClick={fetchExchangeRate}
          disabled={loading}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">
            R$ {exchangeRate.rate.toFixed(4)}
          </span>
          <span className="text-sm text-slate-400">por dólar</span>
        </div>
        
        {lastUpdate && (
          <p className="text-xs text-slate-500">
            Atualizado às {lastUpdate}
          </p>
        )}
      </div>

      {/* Calculadora rápida */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center">
            <p className="text-slate-400">$100 USD</p>
            <p className="font-medium text-white">
              R$ {(100 * exchangeRate.rate).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-400">$1,000 USD</p>
            <p className="font-medium text-white">
              R$ {(1000 * exchangeRate.rate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;