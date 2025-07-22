export type SimplifiedAssetType = 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO' | 'OUTRO';

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