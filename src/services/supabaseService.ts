import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { Portfolio, AssetMetadata, MarketDataResponse } from '../types/investment';
import { marketApiService } from './marketApi';
import { toast } from 'sonner';

export type Investment = Database['public']['Tables']['investments']['Row'];


// ====================================================================================
// SERVIÇO DE METADADOS DE ATIVOS
// ====================================================================================
export const assetMetadataService = {
  async getAll(): Promise<AssetMetadata[]> {
    const { data, error } = await supabase
        .from('asset_metadata')
        .select('*')
        .order('ticker', { ascending: true });

    if (error) {
      console.error('Erro ao buscar metadados:', error);
      toast.error('Não foi possível carregar os metadados dos ativos.');
      return [];
    }
    return data || [];
  },
};


// ====================================================================================
// SERVIÇO DE INVESTIMENTOS (COM FUNÇÃO DELETE ADICIONADA)
// ====================================================================================
export const investmentService = {
  async getAll(userId: string): Promise<Portfolio[]> {
    const { data, error } = await supabase.rpc('get_investments_by_user_id', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Erro ao chamar a função RPC do Supabase:', error);
      toast.error('Erro ao buscar seus dados de investimento.');
      throw error;
    }

    const portfolios: Portfolio[] = (data || []).map((row: any) => ({
      ticker: row.ticker,
      totalInvested: Number(row.totalInvested || 0),
      totalDividends: Number(row.totalDividends || 0),
      totalJuros: Number(row.totalJuros || 0),
      totalImpostos: Number(row.totalImpostos || 0),
      currentPosition: Number(row.currentPosition || 0),
      averagePrice: Number(row.averagePrice || 0),
      currentPrice: Number(row.currentPrice || 0),
      marketValue: Number(row.currentValue || 0),
      profit: Number(row.potentialProfitLoss || 0),
      profitPercent: Number(row.potentialProfitLossPct || 0),
      totalYield: 0, 
      investments: row.investments || [],
      transactions: row.transactions || []
    }));

    return portfolios;
  },

  async delete(transactionId: string): Promise<void> {
    const { error } = await supabase
      .from('investments')
      .delete()
      .match({ id: transactionId });

    if (error) {
      console.error('Erro ao deletar investimento:', error);
      toast.error('Falha ao deletar a operação.');
      throw error;
    }
    toast.success('Operação deletada com sucesso!');
  },

  async fetchAllRaw(userId: string): Promise<Investment[]> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar todos os investimentos brutos:', error);
      toast.error('Não foi possível carregar o histórico de operações.');
      return [];
    }
    return data || [];
  }
};


// ====================================================================================
// FUNÇÃO DE FALLBACK PARA METADADOS (CORRIGIDA)
// ====================================================================================
const createAutoMetadata = (ticker: string): AssetMetadata => {
  const isUS = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O', 'AAPL', 'MSFT'].includes(ticker);
  const isTesouro = ticker.toUpperCase().includes('TESOURO');

  const hardcodedMap: Record<string, Partial<AssetMetadata>> = {
    'BRBI11': { setor: 'Financeiro', subsetor: 'Banco de Investimento', segmento: 'Assessoria financeira', categoria_dy: 'RENDA_VARIAVEL' },
    'BBDC3': { setor: 'Financeiro', subsetor: 'Banco Múltiplo', segmento: 'Serviços Bancários', categoria_dy: 'RENDA_VARIAVEL' }
  };

  let baseMetadata: Omit<AssetMetadata, 'id' | 'created_at' | 'updated_at'>;

  if (hardcodedMap[ticker.toUpperCase()]) {
    const h = hardcodedMap[ticker.toUpperCase()];
    baseMetadata = {
      ticker, nome: ticker, tipo: ticker.endsWith('11') ? 'FII' : 'ACAO', pais: 'BRASIL', moeda: 'BRL',
      setor: h.setor!, subsetor: h.subsetor || null, segmento: h.segmento || null, liquidez: 'MEDIA',
      categoria_dy: h.categoria_dy!, benchmark: 'IBOVESPA', isin: null, cnpj: null, gestora: null,
      descricao: 'Metadado gerado automaticamente', cor_tema: '#8b5cf6', site_oficial: null
    };
  } else if (isTesouro) {
    let tipoTesouro = 'SELIC';
    if (ticker.toUpperCase().includes('IPCA')) tipoTesouro = 'IPCA';
    if (ticker.toUpperCase().includes('PREFIXADO')) tipoTesouro = 'PREFIXADO';
    baseMetadata = {
      ticker, nome: ticker, tipo: 'TESOURO_DIRETO', pais: 'BRASIL', moeda: 'BRL', setor: 'Renda Fixa',
      subsetor: 'Títulos Públicos', segmento: 'Governo Federal', liquidez: 'ALTA', categoria_dy: 'RENDA_FIXA',
      benchmark: tipoTesouro, isin: null, cnpj: null, gestora: 'Tesouro Nacional',
      descricao: `Título público ${tipoTesouro} do Tesouro Nacional`, cor_tema: '#1e40af', site_oficial: null
    };
  } else {
    baseMetadata = {
      ticker, nome: ticker, tipo: isUS ? 'STOCK' : ticker.endsWith('11') ? 'FII' : 'ACAO', pais: isUS ? 'EUA' : 'BRASIL',
      moeda: isUS ? 'USD' : 'BRL', setor: 'Desconhecido', subsetor: null, segmento: null, liquidez: 'MEDIA',
      categoria_dy: 'RENDA_VARIAVEL', benchmark: 'N/A', isin: null, cnpj: null, gestora: null,
      descricao: 'Metadado gerado automaticamente', cor_tema: '#64748b', site_oficial: null
    };
  }

  return {
    ...baseMetadata,
    id: `auto-${ticker}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AssetMetadata;
};


// ====================================================================================
// SERVIÇO PRINCIPAL DO PORTFÓLIO (ORQUESTRADOR)
// ====================================================================================
export const portfolioService = {
  async getPortfolioSummary(): Promise<Portfolio[]> {
    console.log('🚀 [CORE] Iniciando cálculo completo do portfólio...');
    const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';

    try {
      console.log('🔄 [CORE] Buscando dados do Supabase e taxa de câmbio...');
      const [portfoliosFromRPC, metadata, usdToBrlRate, rawInvestments] = await Promise.all([
        investmentService.getAll(userId),
        assetMetadataService.getAll(),
        marketApiService.getUSDBRLExchangeRate(),
        // Carrega também todos os investimentos brutos para anexar por ticker
        investmentService.fetchAllRaw(userId),
      ]);

      console.log(`📊 [CORE] Dados recebidos: ${portfoliosFromRPC.length} portfólios`);
      console.log(`💲 [CORE] Taxa de câmbio USD-BRL: ${usdToBrlRate}`);
      console.log(`📝 [CORE] Metadados carregados: ${metadata.length} ativos`);
      console.log(`📜 [CORE] Investimentos brutos carregados: ${rawInvestments.length}`);

      // Agrupar investimentos por ticker (case-insensitive)
      const investmentsByTicker = rawInvestments.reduce<Record<string, any[]>>((acc, inv: any) => {
        const t = (inv.ticker || '').toUpperCase();
        if (!t) return acc;
        if (!acc[t]) acc[t] = [];
        acc[t].push(inv);
        return acc;
      }, {});

      const portfoliosWithMetadata = portfoliosFromRPC.map(p => {
        const meta = metadata.find(m => m.ticker === p.ticker);
        const totalProventos = p.totalDividends + p.totalJuros;
        const totalYield = p.totalInvested > 0 ? (totalProventos / p.totalInvested) * 100 : 0;
        // Garante que a tela por ativo tenha as operações necessárias
        const mergedInvestments = (p.investments && p.investments.length > 0)
          ? p.investments
          : (investmentsByTicker[p.ticker.toUpperCase()] || []);

        return { 
          ...p, 
          metadata: (meta || createAutoMetadata(p.ticker)) as AssetMetadata, 
          totalYield,
          investments: mergedInvestments,
        };
      });

      console.log('💹 [CORE] Buscando dados de mercado para todos os ativos...');
      let marketDataMap = new Map<string, MarketDataResponse>();
      const SKIP_MARKET_DATA = false;
      
      if (!SKIP_MARKET_DATA) {
        try {
          marketDataMap = await marketApiService.getMultipleMarketData(portfoliosWithMetadata as any);
          console.log(`✅ [CORE] Dados de mercado obtidos para ${marketDataMap.size}/${portfoliosWithMetadata.length} ativos`);
        } catch (error) {
          console.error('❌ Erro ao buscar dados de mercado, continuando com preços médios:', error);
        }
      } else {
        console.log('⚠️ PULANDO busca de dados de mercado (modo desenvolvimento)');
      }

      const finalPortfolios: Portfolio[] = [];
      for (const portfolio of portfoliosWithMetadata) {
        const marketData = marketDataMap.get(portfolio.ticker);
        const isUSAsset = portfolio.metadata?.pais === 'EUA';

        if (marketData) {
          portfolio.currentPrice = marketData.currentPrice;
          portfolio.priceChangePercent = marketData.priceChangePercent;
          portfolio.marketValue = portfolio.currentPosition * portfolio.currentPrice;
        }

        if (isUSAsset) {
          portfolio.totalInvested *= usdToBrlRate;
          portfolio.marketValue *= usdToBrlRate;
          portfolio.totalDividends *= usdToBrlRate;
          portfolio.totalJuros *= usdToBrlRate;
          portfolio.averagePrice *= usdToBrlRate;
          portfolio.currentPrice *= usdToBrlRate;
        }

        portfolio.profit = portfolio.marketValue - portfolio.totalInvested;
        portfolio.profitPercent = portfolio.totalInvested > 0 ? (portfolio.profit / portfolio.totalInvested) * 100 : 0;
        const totalProventos = portfolio.totalDividends + portfolio.totalJuros;
        portfolio.totalYield = portfolio.totalInvested > 0 ? (totalProventos / portfolio.totalInvested) * 100 : 0;

        if (portfolio.currentPosition > 0.000001) { // Tolerância para posições zeradas
          finalPortfolios.push(portfolio);
        }
      }

      console.log(`✅ [CORE] Processamento finalizado. Retornando ${finalPortfolios.length} ativos.`);
      return finalPortfolios.sort((a, b) => a.ticker.localeCompare(b.ticker));

    } catch (error) {
      console.error('❌ [CORE] Erro fatal no cálculo do portfólio:', error);
      if (error instanceof Error) {
        console.error('❌ [CORE] Detalhes do erro:', error.message, error.stack);
      }
      toast.error("Ocorreu um erro grave ao buscar seus dados.");
      return [];
    }
  },
};
