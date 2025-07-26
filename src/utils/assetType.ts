export type CanonicalAssetType = 
  | 'ACAO'
  | 'FII' 
  | 'ETF'
  | 'REIT' 
  | 'STOCK' 
  | 'TESOURO_DIRETO'
  | 'CRYPTO'
  | 'OUTRO';

export const ASSET_TYPE_COLORS: { [key in CanonicalAssetType]: string } = {
  ACAO: '#3b82f6',
  FII: '#14b8a6',
  ETF: '#eab308',
  REIT: '#16a34a',
  STOCK: '#ef4444',
  TESOURO_DIRETO: '#8b5cf6',
  CRYPTO: '#f97316',
  OUTRO: '#6b7280',
};

export const ASSET_TYPE_NAMES: { [key in CanonicalAssetType]: string } = {
  ACAO: 'Ações',
  FII: 'FIIs',
  ETF: 'ETFs',
  STOCK: 'Stocks',
  REIT: 'REITs',
  TESOURO_DIRETO: 'Tesouro Direto',
  CRYPTO: 'Criptomoedas',
  OUTRO: 'Outros',
};

export const normalize = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const QUICK_FILTER_MAP: Record<string, CanonicalAssetType[]> = {
  acoes: ['ACAO'],
  fiis: ['FII'],
  crypto: ['CRYPTO'],
  'renda-fixa': ['TESOURO_DIRETO'],
  stocks: ['STOCK'],
  reits: ['REIT'],
  etfs: ['ETF'],
};

export const getAssetType = (
  ticker: string,
  metadata?: { tipo?: string; pais?: string }
): CanonicalAssetType => {
  const upperTicker = ticker.toUpperCase();

  // Regra fixa: BRBI11 é tratado como ação (BDR)
  if (upperTicker === 'BRBI11') return 'ACAO';

  // Usar metadados se disponíveis e válidos
  if (metadata?.tipo) {
    const tipoMeta = metadata.tipo as CanonicalAssetType;
    if (
      ['FII', 'ACAO', 'ETF', 'REIT', 'STOCK', 'TESOURO_DIRETO', 'CRYPTO'].includes(tipoMeta)
    ) {
      return tipoMeta;
    }
  }

  // Ações brasileiras (terminam com 3 ou 4)
  if (upperTicker.endsWith('3') || upperTicker.endsWith('4')) return 'ACAO';

  // FII (terminam com 11)
  if (upperTicker.endsWith('11')) return 'FII';

  // Tesouro Direto
  if (upperTicker.includes('TESOURO')) return 'TESOURO_DIRETO';

  // Criptomoedas
  const cryptos = ['BTC', 'ETH', 'ADA', 'DOT', 'BITCOIN', 'ETHEREUM'];
  if (cryptos.some(crypto => upperTicker.includes(crypto))) return 'CRYPTO';

  // Mapas específicos para ETFs, REITs ou Stocks internacionais
  const etfs = ['VOO', 'VNQ', 'SPY', 'QQQ', 'VTI'];
  const stocks = ['EVEX', 'DVN', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

  if (etfs.includes(upperTicker)) return 'ETF';
  if (stocks.includes(upperTicker)) return 'STOCK';
  if (upperTicker === 'O') return 'REIT';

  return 'OUTRO';
}; 