import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, DollarSign, Calendar, Tag } from 'lucide-react';
import { Investment, investmentService, AssetMetadata } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface EditInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment | null;
  metadata: AssetMetadata | null;
  onSuccess: () => void;
}

const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({
  isOpen,
  onClose,
  investment,
  metadata,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    data: '',
    quantidade_compra: 0,
    quantidade_venda: 0,
    valor_unitario: 0,
    dividendos: 0,
    juros: 0,
    impostos: 0,
    observacoes: ''
  });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen && investment) {
      setFormData({
        data: investment.data,
        quantidade_compra: investment.tipo === 'COMPRA' ? investment.quantidade || 0 : 0,
        quantidade_venda: investment.tipo === 'VENDA' ? investment.quantidade || 0 : 0,
        valor_unitario: investment.valor_unitario || 0,
        dividendos: investment.dividendos || 0,
        juros: investment.juros || 0,
        impostos: investment.impostos || 0,
        observacoes: investment.observacoes || ''
      });
    }
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, investment]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!investment?.id) {
      toast.error('Dados inválidos para edição');
      return;
    }
    
    setLoading(true);

    try {
      const quantidade = formData.quantidade_compra || formData.quantidade_venda;
      const tipo = formData.quantidade_compra > 0 ? 'COMPRA' : 
                   formData.quantidade_venda > 0 ? 'VENDA' : 
                   formData.dividendos > 0 ? 'DIVIDENDO' :
                   formData.juros > 0 ? 'JUROS' : investment.tipo;

      await investmentService.update(investment.id, {
        data: formData.data,
        tipo: tipo,
        quantidade: quantidade,
        valor_unitario: formData.valor_unitario,
        dividendos: formData.dividendos,
        juros: formData.juros,
        impostos: formData.impostos,
        observacoes: formData.observacoes
      });

      onSuccess();
      onClose();
      toast.success('Operação atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar operação:', error);
      toast.error('Erro ao atualizar operação');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen || !investment) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
              <Save className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Editar Operação - {metadata?.ticker}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="space-y-1">
            <label className="text-sm text-slate-300 flex items-center">
              <Calendar className="h-4 w-4 mr-1 text-slate-400" />
              Data
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Quantidade Compra</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.quantidade_compra || ''}
                onChange={(e) => setFormData({ ...formData, quantidade_compra: parseFloat(e.target.value) || 0, quantidade_venda: 0 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Quantidade Venda</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.quantidade_venda || ''}
                onChange={(e) => setFormData({ ...formData, quantidade_venda: parseFloat(e.target.value) || 0, quantidade_compra: 0 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-slate-300 flex items-center">
              <DollarSign className="h-4 w-4 mr-1 text-slate-400" />
              Valor Unitário ({metadata?.moeda || 'BRL'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_unitario || ''}
              onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Dividendos</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.dividendos || ''}
                onChange={(e) => setFormData({ ...formData, dividendos: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Juros</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.juros || ''}
                onChange={(e) => setFormData({ ...formData, juros: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm text-slate-300 flex items-center">
              <Tag className="h-4 w-4 mr-1 text-slate-400" />
              Observações
            </label>
            <input
              type="text"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          {/* Footer */}
          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none" 
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              <span>Salvar</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditInvestmentModal;