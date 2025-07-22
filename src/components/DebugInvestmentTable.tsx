import React from 'react';

interface DebugInvestmentTableProps {
  investments: any[];
  totals: any;
  activeTab: string;
}

const DebugInvestmentTable: React.FC<DebugInvestmentTableProps> = ({ investments, totals, activeTab }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">DEBUG: {activeTab}</h3>
      <div className="space-y-1">
        <p>Total Investments: {investments?.length || 0}</p>
        <p>Total Investido: R$ {totals.totalInvestido?.toFixed(2) || '0.00'}</p>
        <p>Posição: {totals.currentPosition?.toFixed(0) || '0'} cotas</p>
        <p>Dividendos: R$ {totals.totalDividendos?.toFixed(2) || '0.00'}</p>
        <p>Juros: R$ {totals.totalJuros?.toFixed(2) || '0.00'}</p>
        <p>DY: {totals.dyGeral?.toFixed(2) || '0.00'}%</p>
      </div>
      {investments && investments.length > 0 && (
        <div className="mt-2 text-xs">
          <p className="font-bold">Amostra (primeiro):</p>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(investments[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugInvestmentTable;
