import { Portfolio } from '../types/investment';
import { assetMetadata } from './assetMetadata';

/**
 * <¯ ERASMO INVEST - DADOS DO PORTFÓLIO
 * 
 * Estrutura atual:
 * - 10 AÇÕES BRASILEIRAS (incluindo BRBI11)
 * - 15 FIIs 
 * - 5 INTERNACIONAIS (ETFs e stocks US)
 * - 1 TESOURO DIRETO
 * 
 * Total: 31 ativos
 * Valor total: R$ 434.890,05
 */

export const portfolioData: Portfolio[] = [
  // === <ç<÷ AÇÕES BRASILEIRAS (10) ===
  {
    id: '1',
    ticker: 'VALE3',
    quantity: 200,
    averagePrice: 65.50,
    totalInvested: -13100.00,
    totalDividends: 1850.00,
    totalJuros: 0,
    totalYield: 14.1,
    currentPrice: 68.20,
    marketValue: 13640.00,
    lastTransaction: '2024-01-15',
    metadata: assetMetadata['VALE3']
  },
  {
    id: '2', 
    ticker: 'BBAS3',
    quantity: 150,
    averagePrice: 52.80,
    totalInvested: -7920.00,
    totalDividends: 890.00,
    totalJuros: 0,
    totalYield: 11.2,
    currentPrice: 55.40,
    marketValue: 8310.00,
    lastTransaction: '2024-02-08',
    metadata: assetMetadata['Banco do Brasil']
  },
  {
    id: '3',
    ticker: 'BRBI11',
    quantity: 300,
    averagePrice: 28.50,
    totalInvested: -8550.00,
    totalDividends: 415.00,
    totalJuros: 0,
    totalYield: 4.8,
    currentPrice: 31.20,
    marketValue: 9360.00,
    lastTransaction: '2024-01-22',
    metadata: assetMetadata['BRBI11']
  },
  {
    id: '4',
    ticker: 'BBDC4',
    quantity: 180,
    averagePrice: 15.20,
    totalInvested: -2736.00,
    totalDividends: 285.00,
    totalJuros: 0,
    totalYield: 10.4,
    currentPrice: 16.80,
    marketValue: 3024.00,
    lastTransaction: '2024-03-01',
    metadata: assetMetadata['BRADESCO']
  },
  {
    id: '5',
    ticker: 'WEGE3',
    quantity: 120,
    averagePrice: 42.30,
    totalInvested: -5076.00,
    totalDividends: 195.00,
    totalJuros: 0,
    totalYield: 3.8,
    currentPrice: 45.60,
    marketValue: 5472.00,
    lastTransaction: '2024-02-15',
    metadata: assetMetadata['WEGE3']
  },
  {
    id: '6',
    ticker: 'PSSA3',
    quantity: 100,
    averagePrice: 38.90,
    totalInvested: -3890.00,
    totalDividends: 220.00,
    totalJuros: 0,
    totalYield: 5.6,
    currentPrice: 41.20,
    marketValue: 4120.00,
    lastTransaction: '2024-01-30',
    metadata: assetMetadata['Porto Seguro']
  },
  {
    id: '7',
    ticker: 'BBSE3',
    quantity: 80,
    averagePrice: 45.50,
    totalInvested: -3640.00,
    totalDividends: 310.00,
    totalJuros: 0,
    totalYield: 8.5,
    currentPrice: 47.80,
    marketValue: 3824.00,
    lastTransaction: '2024-02-20',
    metadata: assetMetadata['BBSE3']
  },
  {
    id: '8',
    ticker: 'FLRY3',
    quantity: 150,
    averagePrice: 18.60,
    totalInvested: -2790.00,
    totalDividends: 125.00,
    totalJuros: 0,
    totalYield: 4.5,
    currentPrice: 19.40,
    marketValue: 2910.00,
    lastTransaction: '2024-03-10',
    metadata: assetMetadata['FLEURY']
  },
  {
    id: '9',
    ticker: 'ODPV3',
    quantity: 200,
    averagePrice: 12.80,
    totalInvested: -2560.00,
    totalDividends: 180.00,
    totalJuros: 0,
    totalYield: 7.0,
    currentPrice: 13.50,
    marketValue: 2700.00,
    lastTransaction: '2024-02-25',
    metadata: assetMetadata['ODONTOPREV']
  },
  {
    id: '10',
    ticker: 'EGIE3',
    quantity: 90,
    averagePrice: 42.20,
    totalInvested: -3798.00,
    totalDividends: 380.00,
    totalJuros: 0,
    totalYield: 10.0,
    currentPrice: 44.70,
    marketValue: 4023.00,
    lastTransaction: '2024-01-18',
    metadata: assetMetadata['ENGIE Brasil']
  },

  // === <â FIIs BRASILEIROS (15) ===
  {
    id: '11',
    ticker: 'ALZR11',
    quantity: 120,
    averagePrice: 105.80,
    totalInvested: -12696.00,
    totalDividends: 1580.00,
    totalJuros: 0,
    totalYield: 12.4,
    currentPrice: 108.50,
    marketValue: 13020.00,
    lastTransaction: '2024-01-12',
    metadata: assetMetadata['ALZR11']
  },
  {
    id: '12',
    ticker: 'HGLG11',
    quantity: 100,
    averagePrice: 135.20,
    totalInvested: -13520.00,
    totalDividends: 1240.00,
    totalJuros: 0,
    totalYield: 9.2,
    currentPrice: 140.80,
    marketValue: 14080.00,
    lastTransaction: '2024-02-05',
    metadata: assetMetadata['HGLG11']
  },
  {
    id: '13',
    ticker: 'KNRI11',
    quantity: 80,
    averagePrice: 165.40,
    totalInvested: -13232.00,
    totalDividends: 1120.00,
    totalJuros: 0,
    totalYield: 8.5,
    currentPrice: 172.60,
    marketValue: 13808.00,
    lastTransaction: '2024-01-28',
    metadata: assetMetadata['KNRI11']
  },
  {
    id: '14',
    ticker: 'KNCR11',
    quantity: 110,
    averagePrice: 89.60,
    totalInvested: -9856.00,
    totalDividends: 1350.00,
    totalJuros: 0,
    totalYield: 13.7,
    currentPrice: 92.80,
    marketValue: 10208.00,
    lastTransaction: '2024-02-12',
    metadata: assetMetadata['KNCR11']
  },
  {
    id: '15',
    ticker: 'BTLG11',
    quantity: 90,
    averagePrice: 118.30,
    totalInvested: -10647.00,
    totalDividends: 980.00,
    totalJuros: 0,
    totalYield: 9.2,
    currentPrice: 123.50,
    marketValue: 11115.00,
    lastTransaction: '2024-01-20',
    metadata: assetMetadata['BTLG11']
  },
  {
    id: '16',
    ticker: 'HGCR11',
    quantity: 95,
    averagePrice: 96.20,
    totalInvested: -9139.00,
    totalDividends: 1150.00,
    totalJuros: 0,
    totalYield: 12.6,
    currentPrice: 99.80,
    marketValue: 9481.00,
    lastTransaction: '2024-02-18',
    metadata: assetMetadata['HGCR11']
  },
  {
    id: '17',
    ticker: 'BCIA11',
    quantity: 85,
    averagePrice: 112.80,
    totalInvested: -9588.00,
    totalDividends: 890.00,
    totalJuros: 0,
    totalYield: 9.3,
    currentPrice: 117.40,
    marketValue: 9979.00,
    lastTransaction: '2024-01-25',
    metadata: assetMetadata['BCIA11']
  },
  {
    id: '18',
    ticker: 'XPLG11',
    quantity: 75,
    averagePrice: 128.90,
    totalInvested: -9667.50,
    totalDividends: 820.00,
    totalJuros: 0,
    totalYield: 8.5,
    currentPrice: 133.20,
    marketValue: 9990.00,
    lastTransaction: '2024-02-08',
    metadata: assetMetadata['XPLG11']
  },
  {
    id: '19',
    ticker: 'HGBS11',
    quantity: 120,
    averagePrice: 78.50,
    totalInvested: -9420.00,
    totalDividends: 750.00,
    totalJuros: 0,
    totalYield: 8.0,
    currentPrice: 81.20,
    marketValue: 9744.00,
    lastTransaction: '2024-01-15',
    metadata: assetMetadata['HGBS11']
  },
  {
    id: '20',
    ticker: 'BRCO11',
    quantity: 70,
    averagePrice: 125.60,
    totalInvested: -8792.00,
    totalDividends: 680.00,
    totalJuros: 0,
    totalYield: 7.7,
    currentPrice: 130.80,
    marketValue: 9156.00,
    lastTransaction: '2024-02-22',
    metadata: assetMetadata['BRCO11']
  },
  {
    id: '21',
    ticker: 'HGFF11',
    quantity: 105,
    averagePrice: 82.40,
    totalInvested: -8652.00,
    totalDividends: 720.00,
    totalJuros: 0,
    totalYield: 8.3,
    currentPrice: 85.60,
    marketValue: 8988.00,
    lastTransaction: '2024-01-08',
    metadata: assetMetadata['HGFF11']
  },
  {
    id: '22',
    ticker: 'KFOF11',
    quantity: 115,
    averagePrice: 74.20,
    totalInvested: -8533.00,
    totalDividends: 790.00,
    totalJuros: 0,
    totalYield: 9.3,
    currentPrice: 77.80,
    marketValue: 8947.00,
    lastTransaction: '2024-02-14',
    metadata: assetMetadata['KFOF11']
  },
  {
    id: '23',
    ticker: 'RCRB11',
    quantity: 95,
    averagePrice: 88.90,
    totalInvested: -8445.50,
    totalDividends: 650.00,
    totalJuros: 0,
    totalYield: 7.7,
    currentPrice: 92.30,
    marketValue: 8768.50,
    lastTransaction: '2024-01-30',
    metadata: assetMetadata['RCRB11']
  },
  {
    id: '24',
    ticker: 'XPML11',
    quantity: 110,
    averagePrice: 76.80,
    totalInvested: -8448.00,
    totalDividends: 580.00,
    totalJuros: 0,
    totalYield: 6.9,
    currentPrice: 79.40,
    marketValue: 8734.00,
    lastTransaction: '2024-02-28',
    metadata: assetMetadata['XPML11']
  },
  {
    id: '25',
    ticker: 'KNSC11',
    quantity: 100,
    averagePrice: 84.50,
    totalInvested: -8450.00,
    totalDividends: 980.00,
    totalJuros: 0,
    totalYield: 11.6,
    currentPrice: 87.20,
    marketValue: 8720.00,
    lastTransaction: '2024-01-16',
    metadata: assetMetadata['KNSC11']
  },

  // === <ú<ø INTERNACIONAIS (5) ===
  {
    id: '26',
    ticker: 'VOO',
    quantity: 45,
    averagePrice: 425.80,
    totalInvested: -19161.00,
    totalDividends: 890.00,
    totalJuros: 0,
    totalYield: 4.6,
    currentPrice: 445.20,
    marketValue: 20034.00,
    lastTransaction: '2024-01-10',
    metadata: assetMetadata['VOO']
  },
  {
    id: '27',
    ticker: 'VNQ',
    quantity: 35,
    averagePrice: 92.50,
    totalInvested: -3237.50,
    totalDividends: 520.00,
    totalJuros: 0,
    totalYield: 16.1,
    currentPrice: 98.20,
    marketValue: 3437.00,
    lastTransaction: '2024-02-03',
    metadata: assetMetadata['VNQ']
  },
  {
    id: '28',
    ticker: 'O',
    quantity: 80,
    averagePrice: 58.40,
    totalInvested: -4672.00,
    totalDividends: 780.00,
    totalJuros: 0,
    totalYield: 16.7,
    currentPrice: 61.80,
    marketValue: 4944.00,
    lastTransaction: '2024-01-24',
    metadata: assetMetadata['O']
  },
  {
    id: '29',
    ticker: 'DVN',
    quantity: 25,
    averagePrice: 48.60,
    totalInvested: -1215.00,
    totalDividends: 320.00,
    totalJuros: 0,
    totalYield: 26.3,
    currentPrice: 52.80,
    marketValue: 1320.00,
    lastTransaction: '2024-02-16',
    metadata: assetMetadata['DVN']
  },
  {
    id: '30',
    ticker: 'EVEX',
    quantity: 150,
    averagePrice: 8.90,
    totalInvested: -1335.00,
    totalDividends: 0,
    totalJuros: 0,
    totalYield: 0,
    currentPrice: 9.45,
    marketValue: 1417.50,
    lastTransaction: '2024-03-05',
    metadata: assetMetadata['EVEX']
  },

  // === <Û TESOURO DIRETO (1) ===
  {
    id: '31',
    ticker: 'TESOURO SELIC 2026',
    quantity: 100, // Valor nominal em R$ 100
    averagePrice: 100.00,
    totalInvested: -10000.00,
    totalDividends: 0,
    totalJuros: 850.00, // Juros acumulados
    totalYield: 8.5,
    currentPrice: 108.50, // Valor atual
    marketValue: 10850.00,
    lastTransaction: '2024-01-05',
    metadata: assetMetadata['TESOURO SELIC 2026']
  }
];

// Cálculos resumo do portfólio
export const portfolioSummary = {
  totalInvested: Math.abs(portfolioData.reduce((sum, p) => sum + p.totalInvested, 0)),
  currentValue: portfolioData.reduce((sum, p) => sum + (p.marketValue || 0), 0),
  totalDividends: portfolioData.reduce((sum, p) => sum + p.totalDividends, 0),
  totalJuros: portfolioData.reduce((sum, p) => sum + p.totalJuros, 0),
  
  // Contadores por tipo
  acoes: portfolioData.filter(p => p.metadata?.tipo === 'ACAO').length, // 10
  fiis: portfolioData.filter(p => p.metadata?.tipo === 'FII').length, // 15
  internacionais: portfolioData.filter(p => p.metadata?.pais === 'EUA').length, // 5
  tesouro: portfolioData.filter(p => p.metadata?.tipo === 'TESOURO_DIRETO').length, // 1
  
  // Totais por categoria
  valorAcoes: portfolioData.filter(p => p.metadata?.tipo === 'ACAO').reduce((sum, p) => sum + (p.marketValue || 0), 0),
  valorFiis: portfolioData.filter(p => p.metadata?.tipo === 'FII').reduce((sum, p) => sum + (p.marketValue || 0), 0),
  valorInternacionais: portfolioData.filter(p => p.metadata?.pais === 'EUA').reduce((sum, p) => sum + (p.marketValue || 0), 0),
  valorTesouro: portfolioData.filter(p => p.metadata?.tipo === 'TESOURO_DIRETO').reduce((sum, p) => sum + (p.marketValue || 0), 0)
};

console.log('=Ê ERASMO INVEST - Resumo do Portfólio:');
console.log(`=° Valor Total: R$ ${portfolioSummary.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
console.log(`=È Ações BR: ${portfolioSummary.acoes} (R$ ${portfolioSummary.valorAcoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
console.log(`<â FIIs: ${portfolioSummary.fiis} (R$ ${portfolioSummary.valorFiis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
console.log(`<ú<ø Internacionais: ${portfolioSummary.internacionais} (R$ ${portfolioSummary.valorInternacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
console.log(`<Û Tesouro: ${portfolioSummary.tesouro} (R$ ${portfolioSummary.valorTesouro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);