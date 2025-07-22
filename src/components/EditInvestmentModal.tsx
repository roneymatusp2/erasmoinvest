import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, DollarSign, Calendar, Tag, Hash } from 'lucide-react';
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
        data: investment.date || new Date().toISOString().split('T')[0],
        quantidade_compra: investment.compra || 0,
        quantidade_venda: investment.venda || 0,
        valor_unitario: investment.valor_unit || 0,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumber = ['quantidade_compra', 'quantidade_venda', 'valor_unitario', 'dividendos', 'juros', 'impostos'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investment?.id) {
      toast.error('Dados inválidos para edição');
      return;
    }
    setLoading(true);

    try {
      // ✅ PAYLOAD CORRIGIDO: Este payload corresponde à estrutura da sua tabela no Supabase
      const payload = {
        date: formData.data,
        compra: formData.quantidade_compra,
        venda: formData.quantidade_venda,
        valor_unit: formData.valor_unitario,
        dividendos: formData.dividendos,
        juros: formData.juros,
        impostos: formData.impostos,
        observacoes: formData.observacoes,
      };

      await investmentService.update(investment.id, payload);

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
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/20 p-2 rounded-lg"><Save className="h-5 w-5 text-blue-400" /></div>
            <h2 className="text-lg font-semibold text-white">Editar Operação - {metadata?.ticker}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="space-y-1">
              <label className="text-sm text-slate-300 flex items-center"><Calendar className="h-4 w-4 mr-1 text-slate-400" />Data</label>
              <input type="date" name="data" value={formData.data} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-slate-300 flex items-center"><Hash className="h-4 w-4 mr-1 text-green-400" /> Quantidade Compra</label>
                <input type="number" min="0" step="any" name="quantidade_compra" value={formData.quantidade_compra || ''} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300 flex items-center"><Hash className="h-4 w-4 mr-1 text-red-400" /> Quantidade Venda</label>
                <input type="number" min="0" step="any" name="quantidade_venda" value={formData.quantidade_venda || ''} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300 flex items-center"><DollarSign className="h-4 w-4 mr-1 text-slate-400" />Valor Unitário ({metadata?.moeda || 'BRL'})</label>
              <input type="number" step="0.01" min="0" name="valor_unitario" value={formData.valor_unitario || ''} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-sm text-slate-300 flex items-center"><DollarSign className="h-4 w-4 mr-1 text-purple-400" /> Dividendos</label>
                <input type="number" step="0.01" min="0" name="dividendos" value={formData.dividendos || ''} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-300 flex items-center"><DollarSign className="h-4 w-4 mr-1 text-yellow-400" /> Juros (JCP)</label>
                <input type="number" step="0.01" min="0" name="juros" value={formData.juros || ''} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300 flex items-center"><Tag className="h-4 w-4 mr-1 text-slate-400" />Observações</label>
              <input type="text" name="observacoes" value={formData.observacoes} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="flex space-x-4 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                {loading ? 'Salvando...' : <><Save className="h-5 w-5 mr-2" /><span>Salvar</span></>}
              </button>
            </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditInvestmentModal;