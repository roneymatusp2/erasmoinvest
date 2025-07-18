import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, TrendingUp, DollarSign, Globe, Building } from 'lucide-react';
import { marketApiService, SearchResult } from '../services/marketApi';
import { searchMappings, TickerMapping } from '../data/tickerMapping';
import { investmentService } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [mappingResults, setMappingResults] = useState<TickerMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | TickerMapping | null>(null);
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar ativos quando a query muda
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
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

    // Buscar nas APIs com delay para evitar muitas requisições
    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await marketApiService.searchTickers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Erro na busca:', error);
        toast.error('Erro ao buscar ativos');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectAsset = (asset: SearchResult | TickerMapping) => {
    setSelectedAsset(asset);
    setStep('confirm');
  };

  // Type guards
  const isTickerMapping = (asset: SearchResult | TickerMapping): asset is TickerMapping => {
    return 'officialTicker' in asset;
  };

  const handleAddAsset = async () => {
    if (!selectedAsset) return;

    try {
      setLoading(true);
      
      // Determinar o ticker oficial
      const ticker = isTickerMapping(selectedAsset) 
        ? selectedAsset.officialTicker 
        : selectedAsset.symbol;

      // Buscar dados detalhados do ativo
      const details = await marketApiService.getTickerDetails(ticker);
      
      // Criar metadata do ativo
      const metadata = {
        ticker: ticker,
        nome: isTickerMapping(selectedAsset) ? selectedAsset.friendlyName : selectedAsset.name,
        setor: isTickerMapping(selectedAsset) ? selectedAsset.sector : selectedAsset.type,
        tipo: isTickerMapping(selectedAsset) ? selectedAsset.sector : selectedAsset.type,
        moeda: isTickerMapping(selectedAsset) ? 'BRL' : selectedAsset.currency,
        mercado: isTickerMapping(selectedAsset) ? selectedAsset.market : selectedAsset.market,
        logo_url: isTickerMapping(selectedAsset) ? null : selectedAsset.logo || null,
        preco_atual: details?.data?.regularMarketPrice || details?.data?.['05. price'] || 0,
        variacao_dia: details?.data?.regularMarketChange || 0,
        variacao_percentual: details?.data?.regularMarketChangePercent || 0,
        volume: details?.data?.regularMarketVolume || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Por enquanto, só mostrar sucesso já que a estrutura está criada
      toast.success(`${metadata.nome} será adicionado em breve! (Funcionalidade em desenvolvimento)`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar ativo:', error);
      toast.error('Erro ao adicionar ativo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
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
                  {mappingResults.slice(0, 5).map((mapping) => (
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

            {/* Resultados da API */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Resultados da Busca
                </h3>
                <div className="grid gap-3">
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={`${result.symbol}-${index}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleSelectAsset(result)}
                      className="p-4 bg-slate-700/50 rounded-xl border border-slate-600 cursor-pointer hover:border-blue-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {result.logo ? (
                            <img 
                              src={result.logo} 
                              alt={result.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                              {getAssetIcon(result.type)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">{result.name}</span>
                              <span className="text-slate-400">({result.symbol})</span>
                              <span className="text-lg">{getMarketFlag(result.market)}</span>
                            </div>
                            <p className="text-slate-400 text-sm">{result.type} • {result.currency} • {result.market}</p>
                            {result.matchScore && (
                              <p className="text-xs text-green-400">
                                Relevância: {Math.round(result.matchScore * 100)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <Plus className="h-5 w-5 text-blue-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado de Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                <span className="ml-3 text-slate-400">Buscando ativos...</span>
              </div>
            )}

            {/* Mensagem quando não há resultados */}
            {searchQuery.length >= 2 && !loading && searchResults.length === 0 && mappingResults.length === 0 && (
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
                  {(!isTickerMapping(selectedAsset) && selectedAsset.logo) ? (
                    <img 
                      src={selectedAsset.logo} 
                      alt={selectedAsset.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="p-4 bg-green-600/20 rounded-lg">
                      {getAssetIcon(isTickerMapping(selectedAsset) ? selectedAsset.sector : selectedAsset.type)}
                    </div>
                  )}
                   <div>
                     <h3 className="text-2xl font-bold text-white">
                       {isTickerMapping(selectedAsset) ? selectedAsset.friendlyName : selectedAsset.name}
                     </h3>
                     <p className="text-slate-400">
                       {isTickerMapping(selectedAsset) ? selectedAsset.officialTicker : selectedAsset.symbol}
                     </p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-slate-400">Tipo:</span>
                     <p className="text-white font-medium">{isTickerMapping(selectedAsset) ? selectedAsset.sector : selectedAsset.type}</p>
                   </div>
                   <div>
                     <span className="text-slate-400">Mercado:</span>
                     <p className="text-white font-medium">
                       {selectedAsset.market}
                     </p>
                   </div>
                   <div>
                     <span className="text-slate-400">Moeda:</span>
                     <p className="text-white font-medium">{isTickerMapping(selectedAsset) ? 'BRL' : selectedAsset.currency}</p>
                   </div>
                   {!isTickerMapping(selectedAsset) && selectedAsset.matchScore && (
                    <div>
                      <span className="text-slate-400">Relevância:</span>
                      <p className="text-white font-medium">{Math.round(selectedAsset.matchScore * 100)}%</p>
                    </div>
                  )}
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