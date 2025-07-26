export type SimplifiedAssetType = 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO' | 'OUTRO';

export const ASSET_TYPE_COLORS: { [key: string]: string } = {
  STOCK: '#3b82f6', // Azul
  REIT: '#16a34a', // Verde
  CRYPTO: '#f97316', // Laranja
  TESOURO_DIRETO: '#8b5cf6', // Roxo
  STOCK_US: '#ef4444', // Vermelho
  ETF: '#eab308',      // Amarelo
  FII: '#14b8a6',      // Ciano
  UNKNOWN: '#6b7280',  // Cinza
};

export const ASSET_TYPE_NAMES: { [key in SimplifiedAssetType]: string } = {
  ACAO: 'Ações',
  FII: 'Fundos Imobiliários',
  ETF: 'ETFs',
  STOCK: 'Stocks',
  REIT: 'REITs',
  TESOURO_DIRETO: 'Tesouro Direto',
  OUTRO: 'Outros',
};

export const getAssetType = (
  ticker: string,
  metadata?: { tipo?: string; pais?: string }
): SimplifiedAssetType => {
  const upperTicker = ticker.toUpperCase();

  // Regra fixa: BRBI11 é tratado como ação (BDR)
  if (upperTicker === 'BRBI11') return 'ACAO';

  // Usar metadados se disponíveis e válidos
  if (metadata?.tipo) {
    const tipoMeta = metadata.tipo as SimplifiedAssetType;
    if (
      ['FII', 'ACAO', 'ETF', 'REIT', 'STOCK', 'TESOURO_DIRETO'].includes(tipoMeta)
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

  // Mapas específicos para ETFs, REITs ou Stocks internacionais
  const etfs = ['VOO', 'VNQ'];
  const stocks = ['EVEX', 'DVN'];

  if (etfs.includes(upperTicker)) return 'ETF';
  if (stocks.includes(upperTicker)) return 'STOCK';
  if (upperTicker === 'O') return 'REIT';

  return 'OUTRO';
}; 