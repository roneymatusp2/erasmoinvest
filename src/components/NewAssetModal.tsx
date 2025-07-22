import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, TrendingUp, DollarSign, Globe, Building } from 'lucide-react';
import { searchMappings, TickerMapping } from '../data/tickerMapping';
import { investmentService } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAddInvestment?: (ticker: string) => void;
}

const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenAddInvestment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mappingResults, setMappingResults] = useState<TickerMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<TickerMapping | null>(null);
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar ativos quando a query muda
  useEffect(() => {
    if (searchQuery.length < 2) {
      setMappingResults([]);
      return;
    }

    // Cancelar busca anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Buscar nos mapeamentos locais primeiro (instantâneo)
    const mappings = searchMappings(searchQuery);
    setMappingResults(mappings);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectAsset = (asset: TickerMapping) => {
    setSelectedAsset(asset);
    setStep('confirm');
  };

  const handleAddAsset = async () => {
    if (!selectedAsset) return;

    try {
      setLoading(true);
      
      // Fechar este modal e abrir o modal de operação com o ticker selecionado
      handleClose();
      
      if (onOpenAddInvestment) {
        onOpenAddInvestment(selectedAsset.officialTicker);
      }
      
      toast.success(`${selectedAsset.friendlyName} selecionado! Adicione sua operação.`);
    } catch (error) {
      console.error('Erro ao selecionar ativo:', error);
      toast.error('Erro ao selecionar ativo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setMappingResults([]);
    setSelectedAsset(null);
    setStep('search');
    onClose();
  };

  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fii':
      case 'reit':
        return <Building className="h-5 w-5" />;
      case 'etf':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getMarketFlag = (market: string) => {
    if (market.includes('Brasil') || market.includes('B3')) {
      return '🇧🇷';
    }
    if (market.includes('United States') || market.includes('NASDAQ') || market.includes('NYSE')) {
      return '🇺🇸';
    }
    return '🌍';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Plus className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Novo Investimento</h2>
              <p className="text-slate-400">
                {step === 'search' ? 'Busque ações, FIIs e ETFs brasileiros e americanos' : 'Confirme os dados do ativo'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {step === 'search' ? (
          <>
            {/* Campo de Busca */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome ou ticker (ex: Petrobras, PETR4, Apple, AAPL...)"
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Resultados dos Mapeamentos Locais */}
            {mappingResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <span className="mr-2">⭐</span> Ativos Populares
                </h3>
                <div className="grid gap-3">
                  {mappingResults.slice(0, 10).map((mapping) => (
                    <motion.div
                      key={mapping.officialTicker}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleSelectAsset(mapping)}
                      className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 cursor-pointer hover:border-green-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-600/20 rounded-lg">
                            {getAssetIcon(mapping.sector)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">{mapping.friendlyName}</span>
                              <span className="text-slate-400">({mapping.officialTicker})</span>
                              <span className="text-lg">{getMarketFlag(mapping.market)}</span>
                            </div>
                            <p className="text-slate-400 text-sm">{mapping.sector} • {mapping.market}</p>
                          </div>
                        </div>
                        <Plus className="h-5 w-5 text-green-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem quando não há resultados */}
            {searchQuery.length >= 2 && !loading && mappingResults.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <Search className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">Nenhum ativo encontrado</h3>
                  <p className="text-slate-400">
                    Tente buscar por outro nome ou ticker. 
                    <br />
                    Exemplos: "Petrobras", "PETR4", "Apple", "AAPL"
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Tela de Confirmação */
          selectedAsset && (
            <div className="space-y-6">
              <div className="p-6 bg-slate-700/50 rounded-xl border border-slate-600">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-4 bg-green-600/20 rounded-lg">
                    {getAssetIcon(selectedAsset.sector)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {selectedAsset.friendlyName}
                    </h3>
                    <p className="text-slate-400">
                      {selectedAsset.officialTicker}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Tipo:</span>
                    <p className="text-white font-medium">{selectedAsset.sector}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Mercado:</span>
                    <p className="text-white font-medium">
                      {selectedAsset.market}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Moeda:</span>
                    <p className="text-white font-medium">BRL</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('search')}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleAddAsset}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adicionando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Adicionar Investimento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
};

export default NewAssetModal;