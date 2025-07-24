import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { Portfolio } from '../types/investment';
import { marketApiService } from './marketApi';
import { toast } from 'sonner';

// Tipos exportados para uso em outros lugares da aplicação
export type AssetMetadata = Database['public']['Tables']['asset_metadata']['Row'];
export type Investment = Database['public']['Tables']['investments']['Row'];

/**
 * Serviço para interagir com os metadados dos ativos.
 */
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

/**
 * Serviço para interagir com a função SQL customizada no Supabase.
 */
export const investmentService = {
  async getAll(userId: string): Promise<Portfolio[]> {
    // A função RPC busca e já pré-calcula os dados no banco de dados.
    const { data, error } = await supabase.rpc('get_investments_by_user_id', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Erro ao chamar a função RPC do Supabase:', error);
      toast.error('Erro ao buscar seus dados de investimento.');
      throw error;
    }

    // Mapear os dados da função SQL para o formato Portfolio
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
      totalYield: 0, // Será calculado depois
      investments: row.investments || [], // Agora temos as transações individuais!
      transactions: row.transactions || []
    }));

    return portfolios;
  }
};

// Função de fallback para criar metadados básicos caso não existam no banco
const createAutoMetadata = (ticker: string): AssetMetadata => {
  const isUS = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O', 'AAPL', 'MSFT'].includes(ticker);
  const isTesouro = ticker.toUpperCase().includes('TESOURO');
  
  // Custom mappings para ativos conhecidos sem metadados no banco
  const hardcodedMap: Record<string, Partial<AssetMetadata>> = {
    'BRBI11': {
      setor: 'Financeiro',
      subsetor: 'Banco de Investimento',
      segmento: 'Assessoria financeira',
      categoria_dy: 'RENDA_VARIAVEL',
    },
    'BBDC3': {
      setor: 'Financeiro',
      subsetor: 'Banco Múltiplo',
      segmento: 'Serviços Bancários',
      categoria_dy: 'RENDA_VARIAVEL',
    }
  };

  if (hardcodedMap[ticker.toUpperCase()]) {
    const h = hardcodedMap[ticker.toUpperCase()];
    return {
      id: `auto-${ticker}`,
      ticker,
      nome: ticker,
      tipo: ticker.endsWith('11') ? 'FII' : 'ACAO',
      pais: 'BRASIL',
      moeda: 'BRL',
      setor: h.setor as string,
      subsetor: h.subsetor || null,
      segmento: h.segmento || null,
      liquidez: 'MEDIA',
      categoria_dy: h.categoria_dy as string,
      benchmark: 'IBOVESPA',
      isin: null,
      cnpj: null,
      gestora: null,
      descricao: 'Metadado gerado automaticamente',
      cor_tema: '#8b5cf6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AssetMetadata;
  }

  // Metadados específicos para Tesouro Direto
  if (isTesouro) {
    let tipoTesouro = 'SELIC';
    if (ticker.toUpperCase().includes('IPCA')) tipoTesouro = 'IPCA';
    if (ticker.toUpperCase().includes('PREFIXADO')) tipoTesouro = 'PREFIXADO';
    
    return {
      id: `auto-${ticker}`,
      ticker: ticker,
      nome: ticker,
      tipo: 'TESOURO_DIRETO',
      pais: 'BRASIL',
      moeda: 'BRL',
      setor: 'Renda Fixa',
      subsetor: 'Títulos Públicos',
      segmento: 'Governo Federal',
      liquidez: 'ALTA',
      categoria_dy: 'RENDA_FIXA',
      benchmark: tipoTesouro,
      isin: null,
      cnpj: null,
      gestora: 'Tesouro Nacional',
      descricao: `Título público ${tipoTesouro} do Tesouro Nacional`,
      // campos extras omitidos para compatibilidade com tipos
      site_oficial: null,
      logo_url: null,
      cor_tema: '#1e40af', // Azul para Títulos Públicos
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  
  // Metadados para outros ativos
  return {
    id: `auto-${ticker}`,
    ticker: ticker,
    nome: ticker,
    tipo: isUS ? 'STOCK' : ticker.endsWith('11') ? 'FII' : 'ACAO',
    pais: isUS ? 'EUA' : 'BRASIL',
    moeda: isUS ? 'USD' : 'BRL',
    setor: 'Desconhecido',
    subsetor: null,
    segmento: null,
    liquidez: 'MEDIA',
    categoria_dy: 'RENDA_VARIAVEL',
    benchmark: 'N/A',
    isin: null,
    cnpj: null,
    gestora: null,
    descricao: 'Metadado gerado automaticamente',
    // campos extras omitidos
    site_oficial: null,
    logo_url: null,
    cor_tema: '#64748b',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * O serviço principal do portfólio, responsável por orquestrar toda a lógica de negócios.
 */
export const portfolioService = {
  async getPortfolioSummary(): Promise<Portfolio[]> {
    console.log('🚀 [CORE] Iniciando cálculo completo do portfólio...');

    const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';

    try {
      console.log('🔄 [CORE] Buscando dados do Supabase e taxa de câmbio...');
      
      // 1. Busca todos os dados já pré-calculados e a taxa de câmbio em paralelo
      const [portfoliosFromRPC, metadata, usdToBrlRate] = await Promise.all([
        investmentService.getAll(userId),
        assetMetadataService.getAll(),
        marketApiService.getUSDBRLExchangeRate(),
      ]);

      console.log(`📊 [CORE] Dados recebidos: ${portfoliosFromRPC.length} portfólios`);
      console.log(`💲 [CORE] Taxa de câmbio USD-BRL: ${usdToBrlRate}`);
      console.log(`📝 [CORE] Metadados carregados: ${metadata.length} ativos`);

      // 2. Anexa os metadados aos portfólios recebidos e calcula totalYield
      const portfoliosWithMetadata = portfoliosFromRPC.map(p => {
        const meta = metadata.find(m => m.ticker === p.ticker);
        // Calcular totalYield
        const totalProventos = p.totalDividends + p.totalJuros;
        const totalYield = p.totalInvested > 0 ? (totalProventos / p.totalInvested) * 100 : 0;
        
        return { 
          ...p, 
          metadata: meta || createAutoMetadata(p.ticker),
          totalYield
        };
      });

      console.log('💹 [CORE] Buscando dados de mercado para todos os ativos...');
      
      // 3. Busca os preços de mercado para todos os ativos de uma vez
      let marketDataMap = new Map<string, MarketDataResponse>();
      
      // Adicionar flag temporária para pular busca de mercado se estiver muito lento
      const SKIP_MARKET_DATA = false; // Mude para true se quiser pular temporariamente
      
      if (!SKIP_MARKET_DATA) {
        try {
          marketDataMap = await marketApiService.getMultipleMarketData(portfoliosWithMetadata);
          console.log(`✅ [CORE] Dados de mercado obtidos para ${marketDataMap.size}/${portfoliosWithMetadata.length} ativos`);
        } catch (error) {
          console.error('❌ Erro ao buscar dados de mercado, continuando com preços médios:', error);
        }
      } else {
        console.log('⚠️ PULANDO busca de dados de mercado (modo desenvolvimento)');
      }

      const finalPortfolios: Portfolio[] = [];
      let totalConvertedValue = 0;
      let totalUSAssets = 0;

      for (const portfolio of portfoliosWithMetadata) {
        const marketData = marketDataMap.get(portfolio.ticker);
        const isUSAsset = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O', 'AAPL', 'MSFT'].includes(portfolio.ticker);

        if (marketData) {
          portfolio.currentPrice = marketData.currentPrice;
          portfolio.priceChangePercent = marketData.priceChangePercent;
          portfolio.marketValue = portfolio.currentPosition * portfolio.currentPrice;
          portfolio.moeda = marketData.currency as 'BRL' | 'USD';
        } else {
          // Fallback para ativos sem dados de mercado
          portfolio.currentPrice = portfolio.averagePrice || 0;
          portfolio.priceChangePercent = 0;
          portfolio.marketValue = portfolio.currentPosition * (portfolio.averagePrice || 0);
          portfolio.moeda = isUSAsset ? 'USD' : 'BRL';
        }

        // ✅ LÓGICA DE CONVERSÃO DE CÂMBIO PARA ATIVOS AMERICANOS
        if (isUSAsset || portfolio.moeda === 'USD') {
          totalUSAssets++;
          const originalValue = portfolio.marketValue;
          
          console.log(`🇺🇸 Convertendo ${portfolio.ticker} de USD para BRL (Taxa: ${usdToBrlRate})`);
          console.log(`   - Valor original USD: ${(originalValue / usdToBrlRate).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
          
          // Converter todos os valores de USD para BRL
          portfolio.totalInvested *= usdToBrlRate;
          portfolio.marketValue *= usdToBrlRate;
          portfolio.totalDividends *= usdToBrlRate;
          portfolio.totalJuros *= usdToBrlRate;
          portfolio.averagePrice *= usdToBrlRate;
          portfolio.currentPrice *= usdToBrlRate;
          
          totalConvertedValue += portfolio.marketValue;
          
          // Marcar como convertido para BRL
          portfolio.moeda = 'BRL';
          
          console.log(`   - Valor convertido BRL: R$ ${portfolio.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
          console.log(`✅ ${portfolio.ticker} convertido com sucesso`);
        }

        // Recalcular lucro e rentabilidade após conversão
        portfolio.profit = portfolio.marketValue - portfolio.totalInvested;
        portfolio.profitPercent = portfolio.totalInvested > 0 ? (portfolio.profit / portfolio.totalInvested) * 100 : 0;

        // Recalcular yield total
        const totalProventos = portfolio.totalDividends + portfolio.totalJuros;
        portfolio.totalYield = portfolio.totalInvested > 0 ? (totalProventos / portfolio.totalInvested) * 100 : 0;

        if (portfolio.currentPosition > 0) {
          finalPortfolios.push(portfolio);
        }
      }

      console.log(`🔄 [CORE] Processamento de conversão concluído:`);
      console.log(`   - Ativos americanos convertidos: ${totalUSAssets}`);
      console.log(`   - Valor total convertido: R$ ${totalConvertedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`✅ [CORE] Processamento finalizado. Retornando ${finalPortfolios.length} ativos.`);
      
      return finalPortfolios.sort((a, b) => a.ticker.localeCompare(b.ticker));

    } catch (error) {
      console.error('❌ [CORE] Erro fatal no cálculo do portfólio:', error);
      if (error instanceof Error) {
        console.error('❌ [CORE] Detalhes do erro:', error.message);
        console.error('❌ [CORE] Stack trace:', error.stack);
      }
      toast.error("Ocorreu um erro grave ao buscar seus dados.");
      return [];
    }
  },
};
