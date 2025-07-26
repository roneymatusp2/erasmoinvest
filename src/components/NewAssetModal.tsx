import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, TrendingUp, DollarSign, Globe, Building, Loader2, CheckCircle } from 'lucide-react';
import { searchMappings, TickerMapping } from '../data/tickerMapping';
import { createInvestment } from '../services/investmentService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mappingResults, setMappingResults] = useState<TickerMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<TickerMapping | null>(null);
  const [step, setStep] = useState<'search' | 'confirm' | 'add_operation'>('search');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [operationData, setOperationData] = useState({
    date: new Date().toISOString().split('T')[0],
    quantidade: 0,
    valor_unitario: 0,
    observacoes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleConfirmAsset = () => {
    if (!selectedAsset) return;
    setStep('add_operation');
  };

  const handleOperationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumber = ['quantidade', 'valor_unitario'].includes(name);
    setOperationData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateOperationForm = () => {
    const newErrors: Record<string, string> = {};
    if (operationData.quantidade <= 0) {
      newErrors.quantidade = 'Quantidade deve ser maior que zero';
    }
    if (operationData.valor_unitario <= 0) {
      newErrors.valor_unitario = 'Valor unitário deve ser maior que zero';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateInvestment = async () => {
    if (!selectedAsset || !validateOperationForm()) {
      toast.error('Por favor, preencha os dados da operação.');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado.');

      const { quantidade, valor_unitario, date, observacoes } = operationData;
      const valor_compra = (quantidade * valor_unitario).toFixed(2);

      const payload = {
        user_id: userId,
        ticker: selectedAsset.officialTicker.toUpperCase(),
        date,
        compra: quantidade,
        venda: 0,
        valor_unit: valor_unitario,
        dividendos: 0,
        juros: 0,
        observacoes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        currency: 'BRL', // Assuming BRL for now, can be dynamic later
        valor_compra,
        valor_venda: 0,
        impostos: 0,
        dyc_percent: 0,
        valor_total: valor_compra,
      };

      await createInvestment(payload as any);
      toast.success(`Investimento em ${selectedAsset.friendlyName} adicionado com sucesso!`);
      onSuccess();
      handleClose();
    } catch (error) { 
      console.error('Erro ao criar investimento:', error);
      toast.error('Erro ao criar investimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setMappingResults([]);
    setSelectedAsset(null);
    setStep('search');
    setOperationData({
        date: new Date().toISOString().split('T')[0],
        quantidade: 0,
        valor_unitario: 0,
        observacoes: ''
    });
    setErrors({});
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
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Plus className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Novo Investimento</h2>
              <p className="text-slate-400">
                {step === 'search' && 'Busque por ações, FIIs, ETFs...'}
                {step === 'confirm' && 'Confirme os dados do ativo'}
                {step === 'add_operation' && `Adicione sua primeira compra de ${selectedAsset?.friendlyName}`}
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

        <div className="overflow-y-auto flex-grow pr-2 -mr-2">
          {step === 'search' && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome ou ticker (ex: Petrobras, PETR4, Apple, AAPL...)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                {mappingResults.length > 0 && (
                  <div className="grid gap-3">
                    {mappingResults.slice(0, 10).map((mapping) => (
                      <motion.div
                        key={mapping.officialTicker}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
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
                )}

                {searchQuery.length >= 2 && !loading && mappingResults.length === 0 && (
                  <div className="text-center py-8">
                    <div className="p-4 bg-slate-700/50 rounded-xl">
                      <Search className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-white mb-2">Nenhum ativo encontrado</h3>
                      <p className="text-slate-400">
                        Tente buscar por outro nome ou ticker.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {step === 'confirm' && selectedAsset && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-6 bg-slate-700/50 rounded-xl border border-slate-600 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-600/20 rounded-lg">
                      {getAssetIcon(selectedAsset.sector)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center">
                        {selectedAsset.friendlyName}
                        <span className="ml-2 text-lg">{getMarketFlag(selectedAsset.market)}</span>
                      </h3>
                      <p className="text-slate-400">{selectedAsset.officialTicker}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-slate-400">Tipo:</p>
                      <p className="text-white font-medium">{selectedAsset.sector}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Mercado:</p>
                      <p className="text-white font-medium">{selectedAsset.market}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Moeda:</p>
                      <p className="text-white font-medium">BRL</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep('search')} className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-semibold transition-colors">Voltar</button>
                  <button onClick={handleConfirmAsset} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-semibold transition-colors flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Operação
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {step === 'add_operation' && selectedAsset && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-2">Quantidade</label>
                      <input type="number" name="quantidade" value={operationData.quantidade || ''} onChange={handleOperationInputChange} className={`w-full bg-slate-700 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${errors.quantidade ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-green-500 focus:ring-green-500'}`} />
                      {errors.quantidade && <p className="text-red-400 text-xs mt-1">{errors.quantidade}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-2">Valor Unitário (R$)</label>
                      <input type="number" name="valor_unitario" value={operationData.valor_unitario || ''} onChange={handleOperationInputChange} className={`w-full bg-slate-700 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${errors.valor_unitario ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-green-500 focus:ring-green-500'}`} />
                      {errors.valor_unitario && <p className="text-red-400 text-xs mt-1">{errors.valor_unitario}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Data da Operação</label>
                    <input type="date" name="date" value={operationData.date} onChange={handleOperationInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Observações (Opcional)</label>
                    <input type="text" name="observacoes" value={operationData.observacoes} onChange={handleOperationInputChange} placeholder="Ex: Compra de oportunidade" className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setStep('confirm')} className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-semibold transition-colors">Voltar</button>
                  <button onClick={handleCreateInvestment} disabled={loading} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-semibold transition-colors flex items-center gap-2 disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    {loading ? 'Salvando...' : 'Concluir Operação'}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NewAssetModal;