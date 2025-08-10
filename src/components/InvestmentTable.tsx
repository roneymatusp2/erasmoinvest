import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, Save, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { investmentService } from '../services/supabaseService';
import AssetDetails from './AssetDetails';
import PrecisionCalc from '../utils/precisionCalc';
import { marketApiService } from '../services/marketApi';

interface InvestmentTableProps {
  activeTab: string;
  portfolio?: any;
  investments: any[];
  metadata: any;
  onDataChange: () => void;
  onEditInvestment?: (investment: any) => void;
  readOnly?: boolean;
}

const InvestmentTable: React.FC<InvestmentTableProps> = ({ 
  activeTab, 
  portfolio,
  investments, 
  metadata, 
  onDataChange,
  onEditInvestment,
  readOnly = false
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [usdToBrl, setUsdToBrl] = useState<number>(1);

  useEffect(() => {
    // Buscar taxa de câmbio apenas para exibição BRL de ativos USD
    let mounted = true;
    marketApiService.getUSDBRLExchangeRate()
      .then((rate) => {
        if (mounted && rate && rate > 0) setUsdToBrl(rate);
      })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);

  const formatNumber = (num: number, decimals = 2) => {
    if (num === 0 || num === null || num === undefined) return '0,00';
    return PrecisionCalc.formatNumber(num, decimals);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const calculateHistoricalDY = (data: any[], index: number): number => {
    const row = data[index];
    const totalDividends = PrecisionCalc.add(row.dividendos || 0, row.juros || 0);
    
    if (totalDividends === 0) return 0;
    
    let accumulatedInvestment = 0;
    for (let i = 0; i <= index; i++) {
      const r = data[i];
      const valorTotal = r.tipo === 'COMPRA' ? (r.valor_total || 0) : 
                        r.tipo === 'VENDA' ? -(r.valor_total || 0) : 0;
      accumulatedInvestment = PrecisionCalc.add(accumulatedInvestment, valorTotal);
    }
    
    if (accumulatedInvestment <= 0) return 0;
    
    return PrecisionCalc.percentage(totalDividends, Math.abs(accumulatedInvestment));
  };

  const getDYClass = (value: number) => {
    if (value < 1) return 'text-green-400 bg-green-500/20';
    if (value < 2) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const handleEdit = (index: number) => {
    if (onEditInvestment) {
      onEditInvestment(investments[index]);
    } else {
      setEditData({ ...investments[index] });
      setEditingIndex(index);
    }
  };

  const handleSave = async () => {
    // Implementar lógica de salvamento real aqui se necessário
    toast.success('Alteração salva!');
    setEditingIndex(null);
    setEditData(null);
    onDataChange();
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  const handleDelete = async (index: number) => {
    const dataConverted = investments.map(convertToInvestmentRow);
    const investment = dataConverted[index];
    const currentMoeda = metadata?.moeda || 'BRL';
    
    if (!investment?.id) {
      console.error('❌ ID não encontrado no investment:', investment);
      toast.error('ID do investimento não encontrado');
      return;
    }

    const confirmMessage = [
      'Tem certeza que deseja deletar esta operação?',
      '',
      `Ticker: ${investment.ticker || activeTab}`,
      `Data: ${formatDate(investment.data)}`,
      `Tipo: ${investment.tipo}`,
      `Quantidade: ${investment.quantidade || 0}`,
      investment.dividendos > 0 ? `Dividendos: ${formatCurrency(investment.dividendos, currentMoeda)}` : '',
      investment.juros > 0 ? `Juros: ${formatCurrency(investment.juros, currentMoeda)}` : ''
    ].filter(Boolean).join('\n');

    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Tentando deletar investimento:', investment.id);
        await investmentService.delete(investment.id);
        toast.success('✅ Operação deletada com sucesso!');
        onDataChange(); // Recarrega os dados
      } catch (error) {
        console.error('❌ Erro ao deletar:', error);
        toast.error('❌ Erro ao deletar operação: ' + (error as Error).message);
      }
    }
  };

  // Função para converter Investment para InvestmentRow com alta precisão
  const convertToInvestmentRow = (inv: any): any => {
    // A estrutura do banco usa campos 'compra', 'venda', 'valor_unit'
    const row: any = {
      id: inv.id,
      ticker: inv.ticker,
      data: inv.date || inv.data,
      dividendos: PrecisionCalc.round7(Number(inv.dividendos || 0)),
      juros: PrecisionCalc.round7(Number(inv.juros || 0)),
      impostos: PrecisionCalc.round7(Number(inv.impostos || 0)),
      observacoes: inv.observacoes || ''
    };
    
    // Extrair valores com alta precisão
    const compra = PrecisionCalc.round7(Number(inv.compra || 0));
    const venda = PrecisionCalc.round7(Number(inv.venda || 0));
    const valorUnit = PrecisionCalc.round7(Number(inv.valor_unit || 0));
    let valorTotal = PrecisionCalc.round7(Number(inv.valor_total || 0));
    
    // Determinar o tipo baseado nos valores
    // Prioridade: COMPRA > VENDA > DIVIDENDO > JUROS > DESDOBRAMENTO
    if (compra > 0) {
      row.tipo = 'COMPRA';
      row.quantidade = compra;
      row.valor_unitario = valorUnit;
      // Sempre recalcular valor_total se estiver 0
      if (valorTotal === 0 && valorUnit > 0) {
        valorTotal = PrecisionCalc.multiply(compra, valorUnit);
      }
      row.valor_total = valorTotal;
    } else if (venda > 0) {
      row.tipo = 'VENDA';
      row.quantidade = venda;
      row.valor_unitario = valorUnit;
      // Sempre recalcular valor_total se estiver 0
      if (valorTotal === 0 && valorUnit > 0) {
        valorTotal = PrecisionCalc.multiply(venda, valorUnit);
      }
      row.valor_total = valorTotal;
    } else if (row.dividendos > 0) {
      row.tipo = 'DIVIDENDO';
      row.quantidade = 0;
      row.valor_unitario = 0;
      row.valor_total = 0;
    } else if (row.juros > 0) {
      row.tipo = 'JUROS';
      row.quantidade = 0;
      row.valor_unitario = 0;
      row.valor_total = 0;
    } else {
      // Default para desdobramento ou operações sem valor
      row.tipo = 'DESDOBRAMENTO';
      row.quantidade = 0;
      row.valor_unitario = 0;
      row.valor_total = 0;
    }
    
    return row;
  };

  // ✅ OS TOTAIS AGORA VÊM DIRETAMENTE DO BACKEND (prop 'portfolio')
  // A função de cálculo local foi removida para garantir consistência.
  const getTotalsFromPortfolio = () => {
    if (!portfolio || !investments || investments.length === 0) {
      return {
        totalInvestido: 0, currentPosition: 0, totalDividendos: 0,
        totalJuros: 0, totalImpostos: 0, totalProventos: 0,
        precoMedio: 0, dyGeral: 0, moeda: metadata?.moeda || 'BRL'
      };
    }

    const totalProventos = PrecisionCalc.add(portfolio.totalDividends || 0, portfolio.totalJuros || 0);
    const dyGeral = PrecisionCalc.percentage(totalProventos, portfolio.totalInvested || 0);

    const result = {
      totalInvestido: portfolio.totalInvested,
      currentPosition: portfolio.currentPosition,
      totalDividendos: portfolio.totalDividends,
      totalJuros: portfolio.totalJuros,
      totalImpostos: portfolio.totalImpostos || 0,
      totalProventos: totalProventos,
      precoMedio: portfolio.averagePrice,
      dyGeral: dyGeral,
      moeda: metadata?.moeda || 'BRL'
    };

    console.log(`[${activeTab}] Totais recebidos do backend:`, {
      totalInvestido: result.totalInvestido?.toFixed(2),
      precoMedio: result.precoMedio?.toFixed(2),
      currentPosition: result.currentPosition?.toFixed(2),
    });

    return result;
  };


  // Exibição sempre em BRL (preferência do usuário). Se o ativo estiver em USD,
  // converte apenas para exibição usando a taxa atual.
  const toDisplayValue = (value: number): number => {
    if (!value) return 0;
    return (metadata?.moeda === 'USD') ? PrecisionCalc.round7(value * usdToBrl) : value;
  };

  const formatCurrency = (value: number) => {
    return PrecisionCalc.formatCurrency(value, 'BRL');
  };

  // Converter todos os dados para o formato correto antes de usar
  const data = investments.map(convertToInvestmentRow);
  const totals = getTotalsFromPortfolio();
  // A UI deve sempre exibir em BRL, mas preservamos o indicador se o ativo é USD
  const isUSDAsset = metadata?.moeda === 'USD';
  const moeda = 'BRL';

  const renderHeader = () => {
    return (
      <div className="bg-slate-800 p-4 rounded-t-lg border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white">{activeTab}</h2>
          <div className="flex items-center space-x-2">
            <span className="text-xl">
              {metadata?.pais === 'BRASIL' ? '🇧🇷' : metadata?.pais === 'EUA' ? '🇺🇸' : '🌍'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600/30 text-blue-300 border border-blue-500/30">
              {metadata?.tipo || 'ATIVO'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-600/30 text-purple-300 border border-purple-500/30">
              {metadata?.moeda || 'BRL'}
            </span>

          </div>
        </div>
        <div className="flex flex-col text-right">
          <div className="text-sm text-slate-400">Posição Atual</div>
          <div className="text-lg font-semibold text-white">
            {formatNumber(totals.currentPosition, 4)} cotas
          </div>
        </div>
      </div>
    );
  };

  if (!investments || investments.length === 0) {
    return (
      <div className="bg-slate-900 rounded-lg shadow-xl border border-slate-800 mb-8 p-8 text-center">
        <p className="text-slate-400">Nenhum investimento encontrado para {activeTab}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 🎯 HEADER PREMIUM IGUAL AO SUMMARY */}
      {portfolio && (
        <AssetDetails 
          metadata={portfolio.metadata}
          totalInvested={portfolio.totalInvested}
          totalYield={portfolio.totalYield}
          currentPosition={portfolio.currentPosition}
          marketValue={portfolio.marketValue}
          currentPrice={portfolio.currentPrice}
        />
      )}
      
      {/* Tabela de Transações */}
      <div className="bg-slate-900 rounded-lg shadow-xl border border-slate-800 overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="overflow-x-auto scrollbar-thin"
      >
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-800/60 text-slate-300 text-left">
              <th className="px-4 py-4 font-semibold">Data</th>
              <th className="px-4 py-4 font-semibold">Tipo</th>
              <th className="px-4 py-4 font-semibold">Compra</th>
              <th className="px-4 py-4 font-semibold">Venda</th>
              <th className="px-4 py-4 font-semibold">Valor Unit.</th>
              <th className="px-4 py-4 font-semibold">Valor Total</th>
              <th className="px-4 py-4 font-semibold">Dividendos</th>
              <th className="px-4 py-4 font-semibold">Juros</th>
              {isUSDAsset && (
                <th className="px-4 py-4 font-semibold">Impostos</th>
              )}
              <th className="px-4 py-4 font-semibold">DY(%)</th>
              <th className="px-4 py-4 font-semibold max-w-xs truncate">Observações</th>
              <th className="px-4 py-4 font-semibold text-center w-20">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {data.map((row, index) => {
              const isEditing = editingIndex === index;
              const dy = calculateHistoricalDY(data, index);
              const valorTotal = row.valor_total || 0;

              return (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`hover:bg-slate-800/50 border-b border-slate-800/30 ${isEditing ? 'bg-slate-800/70' : ''}`}
                >
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData?.data || ''}
                        onChange={(e) => setEditData({ ...editData!, data: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      formatDate(row.data)
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      row.tipo === 'COMPRA' ? 'bg-green-500/20 text-green-400' :
                      row.tipo === 'VENDA' ? 'bg-red-500/20 text-red-400' :
                      row.tipo === 'DIVIDENDO' ? 'bg-blue-500/20 text-blue-400' :
                      row.tipo === 'JUROS' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {row.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={editData?.quantidade || 0}
                        onChange={(e) => setEditData({ ...editData!, quantidade: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.tipo === 'COMPRA' ? row.quantidade : ''
                    )}
                  </td>
                  <td className="px-4 py-2 text-red-400">
                    {isEditing && row.tipo === 'VENDA' ? (
                      <input
                        type="number"
                        step="any"
                        value={editData?.quantidade || 0}
                        onChange={(e) => setEditData({ ...editData!, quantidade: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.tipo === 'VENDA' ? row.quantidade : ''
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editData?.valor_unitario || 0}
                        onChange={(e) => setEditData({ ...editData!, valor_unitario: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.valor_unitario ? `${formatCurrency(toDisplayValue(row.valor_unitario))}` : ''
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">
                     {valorTotal && (row.tipo === 'COMPRA' || row.tipo === 'VENDA') ? 
                      `${formatCurrency(toDisplayValue(valorTotal))}` : ''}
                  </td>
                  <td className="px-4 py-2 text-green-400">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editData?.dividendos || 0}
                        onChange={(e) => setEditData({ ...editData!, dividendos: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.dividendos ? `${formatCurrency(toDisplayValue(row.dividendos))}` : ''
                    )}
                  </td>
                  <td className="px-4 py-2 text-blue-400">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editData?.juros || 0}
                        onChange={(e) => setEditData({ ...editData!, juros: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.juros ? `${formatCurrency(toDisplayValue(row.juros))}` : ''
                    )}
                  </td>
                  {isUSDAsset && (
                    <td className="px-4 py-2 text-yellow-400">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editData?.impostos || 0}
                          onChange={(e) => setEditData({ ...editData!, impostos: parseFloat(e.target.value) || 0 })}
                          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                        />
                      ) : (
                        row.impostos ? `${formatCurrency(toDisplayValue(row.impostos))}` : ''
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {dy > 0 && (
                      <span className={`px-2 py-1 rounded ${getDYClass(dy)}`}>
                        {formatNumber(dy, 2)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData?.observacoes || ''}
                        onChange={(e) => setEditData({ ...editData!, observacoes: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                      />
                    ) : (
                      row.observacoes
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="text-green-400 hover:text-green-300 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(index)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-semibold border-t-2 border-slate-700 hover:bg-slate-800">
              <td className="px-4 py-4 font-bold">TOTAIS</td>
              <td className="px-4 py-4 font-bold">-</td>
              <td className="px-4 py-4 font-bold">{formatNumber(totals.currentPosition, 4)}</td>
              <td className="px-4 py-4 text-red-400 font-bold">-</td>
              <td className="px-4 py-4 font-bold">
                <span className="bg-blue-900/40 px-2 py-1 rounded">P.M: {formatCurrency(totals.precoMedio, moeda)}</span>
              </td>
              <td className="px-4 py-4 font-bold">
                <span className="bg-slate-700/40 px-2 py-1 rounded">{formatCurrency(totals.totalInvestido, moeda)}</span>
              </td>
              <td className="px-4 py-4 text-green-400 font-bold">
                <span className="bg-green-900/20 px-2 py-1 rounded">{formatCurrency(totals.totalDividendos, moeda)}</span>
              </td>
              <td className="px-4 py-4 text-blue-400 font-bold">
                <span className="bg-blue-900/20 px-2 py-1 rounded">{formatCurrency(totals.totalJuros, moeda)}</span>
              </td>
              {isUSDAsset && (
                <td className="px-4 py-3 text-yellow-400">
                  {formatCurrency(toDisplayValue(totals.totalImpostos))}
                </td>
              )}
              <td className="px-4 py-4 font-bold">
                <span className={`px-2 py-1 rounded text-lg ${getDYClass(totals.dyGeral)}`}>
                  {formatNumber(totals.dyGeral, 2)}%
                </span>
              </td>
              <td className="px-4 py-4 font-bold" colSpan={2}>
                <span className="bg-purple-900/20 px-2 py-1 rounded text-purple-300">SALDO: {formatNumber(totals.currentPosition, 4)} cotas</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800 p-6 rounded-b-lg border-t border-slate-700 flex flex-col md:flex-row md:justify-between md:items-center"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 md:mb-0 w-full">
          <div className="text-center p-4 bg-slate-900/60 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors shadow-lg">
            <div className="text-sm text-slate-400 mb-1">Total Investido</div>
            <div className="text-xl font-bold text-white">{formatCurrency(totals.totalInvestido, moeda)}</div>
          </div>
          <div className="text-center p-4 bg-slate-900/60 rounded-lg border border-slate-700 hover:border-green-500/50 transition-colors shadow-lg">
            <div className="text-sm text-slate-400 mb-1">Total Proventos</div>
            <div className="text-xl font-bold text-green-400">{formatCurrency(totals.totalProventos, moeda)}</div>
          </div>
          <div className="text-center p-4 bg-slate-900/60 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors shadow-lg">
            <div className="text-sm text-slate-400 mb-1">Yield Total</div>
            <div className="text-xl font-bold text-blue-400">{formatNumber(totals.dyGeral, 2)}%</div>
          </div>
          <div className="text-center p-4 bg-slate-900/60 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors shadow-lg">
            <div className="text-sm text-slate-400 mb-1">Posição Atual</div>
            <div className="text-xl font-bold text-purple-400">{formatNumber(totals.currentPosition, 4)} cotas</div>
          </div>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
};

export default InvestmentTable;