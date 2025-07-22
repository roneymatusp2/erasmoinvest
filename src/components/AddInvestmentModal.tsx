import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  DollarSign,
  Calendar,
  Tag,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Gift,
  Percent,
  Hash,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { createInvestment } from '../services/investmentService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Portfolio } from '../types/investment';

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  portfolios: Portfolio[];
  initialTicker?: string;
}

type OperationType = 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS' | 'DESDOBRAMENTO';

const operationTypes = [
  { value: 'COMPRA', label: 'Compra', icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-600/20' },
  { value: 'VENDA', label: 'Venda', icon: TrendingDown, color: 'text-red-400', bgColor: 'bg-red-600/20' },
  { value: 'DIVIDENDO', label: 'Dividendo', icon: DollarSign, color: 'text-blue-400', bgColor: 'bg-blue-600/20' },
  { value: 'JUROS', label: 'Juros (JCP)', icon: Percent, color: 'text-yellow-400', bgColor: 'bg-yellow-600/20' },
  { value: 'DESDOBRAMENTO', label: 'Desdobramento', icon: Gift, color: 'text-purple-400', bgColor: 'bg-purple-600/20' }
];

const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 onSuccess,
                                                                 portfolios,
                                                                 initialTicker
                                                               }) => {
  const [formData, setFormData] = useState({
    ticker: initialTicker || '',
    date: new Date().toISOString().split('T')[0],
    tipo: 'COMPRA' as OperationType,
    quantidade: 0,
    valor_unitario: 0,
    valor_total_provento: 0,
    observacoes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialTicker) {
        setFormData(prev => ({ ...prev, ticker: initialTicker }));
      } else if (portfolios.length > 0 && !formData.ticker) {
        setFormData(prev => ({ ...prev, ticker: portfolios[0].ticker }));
      }
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen, portfolios, initialTicker]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.ticker) {
      newErrors.ticker = 'Selecione um ativo';
    }

    if (formData.tipo === 'COMPRA' || formData.tipo === 'VENDA' || formData.tipo === 'DESDOBRAMENTO') {
      if (formData.quantidade <= 0) {
        newErrors.quantidade = 'Quantidade deve ser maior que zero';
      }
      if ((formData.tipo === 'COMPRA' || formData.tipo === 'VENDA') && formData.valor_unitario <= 0) {
        newErrors.valor_unitario = 'Valor unitário deve ser maior que zero';
      }
    }

    if ((formData.tipo === 'DIVIDENDO' || formData.tipo === 'JUROS') && formData.valor_total_provento <= 0) {
      newErrors.valor_total_provento = 'Valor deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['quantidade', 'valor_unitario', 'valor_total_provento'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      const compraQtd = formData.tipo === 'COMPRA' || formData.tipo === 'DESDOBRAMENTO' ? formData.quantidade : 0;
      const vendaQtd = formData.tipo === 'VENDA' ? formData.quantidade : 0;
      const valorUnit = formData.tipo === 'COMPRA' || formData.tipo === 'VENDA' ? formData.valor_unitario : 0;
      const dividendosVal = formData.tipo === 'DIVIDENDO' ? formData.valor_total_provento : 0;
      const jurosVal = formData.tipo === 'JUROS' ? formData.valor_total_provento : 0;

      const valor_compra = (compraQtd * valorUnit).toFixed(2);
      const valor_venda = (vendaQtd * valorUnit).toFixed(2);
      const valor_total = (
        parseFloat(valor_compra) - parseFloat(valor_venda) + dividendosVal + jurosVal
      ).toFixed(2);

      const timestamp = new Date().toISOString();

      const payload = {
        user_id: userId,
        ticker: formData.ticker.toUpperCase(),
        date: formData.date,
        compra: compraQtd,
        venda: vendaQtd,
        valor_unit: valorUnit,
        dividendos: dividendosVal,
        juros: jurosVal,
        observacoes: formData.observacoes,
        created_at: timestamp,
        updated_at: timestamp,
        currency: 'BRL',
        valor_compra,
        valor_venda,
        impostos: 0,
        dyc_percent: 0,
        valor_total
      };

      await createInvestment(payload as any);
      onSuccess();
      resetFormAndClose();
      toast.success('Operação adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar operação:', error);
      toast.error('Erro ao adicionar operação. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const resetFormAndClose = () => {
    setFormData({
      ticker: '',
      date: new Date().toISOString().split('T')[0],
      tipo: 'COMPRA',
      quantidade: 0,
      valor_unitario: 0,
      valor_total_provento: 0,
      observacoes: ''
    });
    setErrors({});
    onClose();
  };

  const getCurrentOperation = () => {
    return operationTypes.find(op => op.value === formData.tipo);
  };

  const currentOp = getCurrentOperation();

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-lg w-full border border-slate-700/50 shadow-2xl backdrop-blur-xl"
        >
          {/* Header Aprimorado */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl ${currentOp?.bgColor || 'bg-blue-600/20'}`}>
                {React.createElement(currentOp?.icon || Plus, {
                  className: `h-6 w-6 ${currentOp?.color || 'text-blue-400'}`
                })}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nova Operação</h2>
                <p className="text-sm text-slate-400">Adicione uma nova transação ao seu portfólio</p>
              </div>
            </div>
            <button
                onClick={resetFormAndClose}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Formulário Melhorado */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Seletores Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor de Ativo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-400" />
                  Ativo
                </label>
                <div className="relative">
                  <select
                      name="ticker"
                      value={formData.ticker}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all appearance-none pr-10 ${
                          errors.ticker ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                      }`}
                      required
                  >
                    <option value="" disabled>Selecione um ativo</option>
                    {portfolios.map(p => (
                        <option key={p.ticker} value={p.ticker}>
                          {p.ticker} - {p.metadata?.nome?.substring(0, 30) || 'Nome não disponível'}
                        </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                </div>
                {errors.ticker && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {errors.ticker}
                    </motion.p>
                )}
              </div>

              {/* Seletor de Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-400" />
                  Tipo de Operação
                </label>
                <div className="relative">
                  <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleInputChange}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all appearance-none pr-10"
                  >
                    {operationTypes.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Campos Condicionais com Animação */}
            <AnimatePresence mode="wait">
              {(formData.tipo === 'COMPRA' || formData.tipo === 'VENDA' || formData.tipo === 'DESDOBRAMENTO') && (
                  <motion.div
                      key="quantity-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-slate-400" />
                          Quantidade
                        </label>
                        <input
                            type="number"
                            name="quantidade"
                            value={formData.quantidade || ''}
                            onChange={handleInputChange}
                            min="0"
                            step="any"
                            placeholder="0"
                            className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${
                                errors.quantidade ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                            }`}
                        />
                        {errors.quantidade && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-400 text-xs flex items-center gap-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              {errors.quantidade}
                            </motion.p>
                        )}
                      </div>

                      {formData.tipo !== 'DESDOBRAMENTO' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-slate-400" />
                              Valor Unitário (R$)
                            </label>
                            <input
                                type="number"
                                name="valor_unitario"
                                value={formData.valor_unitario || ''}
                                onChange={handleInputChange}
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${
                                    errors.valor_unitario ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                                }`}
                            />
                            {errors.valor_unitario && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400 text-xs flex items-center gap-1"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  {errors.valor_unitario}
                                </motion.p>
                            )}
                          </div>
                      )}
                    </div>
                  </motion.div>
              )}

              {(formData.tipo === 'DIVIDENDO' || formData.tipo === 'JUROS') && (
                  <motion.div
                      key="dividend-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        Valor Total Recebido (R$)
                      </label>
                      <input
                          type="number"
                          name="valor_total_provento"
                          value={formData.valor_total_provento || ''}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          className={`w-full bg-slate-700/50 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${
                              errors.valor_total_provento ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                      />
                      {errors.valor_total_provento && (
                          <motion.p
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-xs flex items-center gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            {errors.valor_total_provento}
                          </motion.p>
                      )}
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>

            {/* Data */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                Data da Operação
              </label>
              <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  required
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                Observações
              </label>
              <input
                  type="text"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInputChange}
                  placeholder="Informações adicionais sobre a operação..."
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Preview do Valor Total */}
            {((formData.tipo === 'COMPRA' || formData.tipo === 'VENDA') && formData.quantidade > 0 && formData.valor_unitario > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Valor Total da Operação:</span>
                    <span className="text-white font-bold text-lg">
                  R$ {(formData.quantidade * formData.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                  </div>
                </motion.div>
            )}

            {/* Footer com Botões Melhorados */}
            <div className="flex space-x-4 pt-4">
              <button
                  type="button"
                  onClick={resetFormAndClose}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-xl transition-all duration-200 font-medium"
                  disabled={loading}
              >
                Cancelar
              </button>
              <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Adicionar Operação
                    </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
  );
};

export default AddInvestmentModal;