import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type AssetMetadata = Database['public']['Tables']['asset_metadata']['Row'];
export type Investment = Database['public']['Tables']['investments']['Row'];

export type InvestmentInsert = Database['public']['Tables']['investments']['Insert'];
export type InvestmentUpdate = Database['public']['Tables']['investments']['Update'];

// Tipo adaptado para trabalhar com a estrutura atual
export interface AdaptedInvestment {
  id: string;
  ticker: string;
  data: string;
  tipo: 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS' | 'DESDOBRAMENTO';
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  dividendos: number;
  juros: number;
  impostos: number;
  observacoes: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Verificar autenticação
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
};

// Serviços para Asset Metadata
export const assetMetadataService = {
  async getAll(): Promise<AssetMetadata[]> {
    const { data, error } = await supabase
      .from('asset_metadata')
      .select('*')
      .order('ticker', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getByTicker(ticker: string): Promise<AssetMetadata | null> {
    const { data, error } = await supabase
      .from('asset_metadata')
      .select('*')
      .eq('ticker', ticker)
      .single();
    
    if (error) return null;
    return data;
  },

  async create(metadata: Omit<AssetMetadata, 'created_at' | 'updated_at'>): Promise<AssetMetadata> {
    const { data, error } = await supabase
      .from('asset_metadata')
      .insert(metadata)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(ticker: string, updates: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const { data, error } = await supabase
      .from('asset_metadata')
      .update(updates)
      .eq('ticker', ticker)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Função para converter entre formatos
// 🔧 ADAPTADOR CORRIGIDO - Converte dados do banco para formato da aplicação
const adaptInvestmentFromDB = (investment: Investment): AdaptedInvestment => {
  const compra = Number(investment.compra) || 0;
  const venda = Number(investment.venda) || 0;
  const valor_unit = Number(investment.valor_unit) || 0;
  
  let tipo: AdaptedInvestment['tipo'] = 'COMPRA';
  let quantidade = 0;
  let valor_total = 0;

  // 💰 LÓGICA CORRIGIDA: Determinar tipo baseado nos dados
  if (compra > 0) {
    tipo = 'COMPRA';
    quantidade = compra;
    valor_total = compra * valor_unit;
  } else if (venda > 0) {
    tipo = 'VENDA';
    quantidade = venda;
    valor_total = venda * valor_unit;
  } else if ((investment.dividendos || 0) > 0) {
    tipo = 'DIVIDENDO';
    quantidade = 0;
    valor_total = Number(investment.dividendos) || 0;
  } else if ((investment.juros || 0) > 0) {
    tipo = 'JUROS';
    quantidade = 0;
    valor_total = Number(investment.juros) || 0;
  }

  return {
    id: investment.id || '',
    ticker: investment.ticker,
    data: investment.date?.toString() || '',
    tipo,
    quantidade,
    valor_unitario: valor_unit,
    valor_total,
    dividendos: Number(investment.dividendos) || 0,
    juros: Number(investment.juros) || 0,
    impostos: Number((investment as any).impostos) || 0,
    observacoes: investment.observacoes || '',
    user_id: investment.user_id || '',
    created_at: investment.created_at || '',
    updated_at: investment.updated_at || ''
  };
};

const adaptInvestmentToDB = (investment: Partial<AdaptedInvestment>): Partial<InvestmentInsert> => {
  let compra = 0;
  let venda = 0;

  if (investment.tipo === 'COMPRA') {
    compra = investment.quantidade || 0;
  } else if (investment.tipo === 'VENDA') {
    venda = investment.quantidade || 0;
  }

  return {
    ticker: investment.ticker,
    date: investment.data,
    compra,
    venda,
    valor_unit: investment.valor_unitario,
    dividendos: investment.dividendos,
    juros: investment.juros,
    observacoes: investment.observacoes || ''
  };
};

// Serviços para Investments
export const investmentService = {
  async getAll(): Promise<AdaptedInvestment[]> {
    // Usar o user_id fixo do Erasmo se localStorage auth está ativo
    const isLocalAuth = localStorage.getItem('erasmoInvestAuth') === 'true';
    let userId = null;
    
    console.log('🔍 investmentService.getAll() - localStorage auth:', isLocalAuth);
    
    if (isLocalAuth) {
      // User ID fixo do Erasmo Russo
      userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      console.log('✅ Usando user_id fixo:', userId);
    } else {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');
      userId = user.id;
      console.log('✅ Usando user_id do Supabase:', userId);
    }

    console.log('🔄 Fazendo query no Supabase para user_id:', userId);
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('❌ Erro na query Supabase:', error);
      throw error;
    }
    
    console.log('📊 Dados retornados do Supabase:', data?.length, 'registros');
    const adaptedData = (data || []).map(adaptInvestmentFromDB);
    console.log('✅ Dados adaptados:', adaptedData.length, 'registros');
    
    return adaptedData;
  },

  async getByTicker(ticker: string): Promise<AdaptedInvestment[]> {
    // Usar o user_id fixo do Erasmo se localStorage auth está ativo
    const isLocalAuth = localStorage.getItem('erasmoInvestAuth') === 'true';
    let userId = null;
    
    if (isLocalAuth) {
      // User ID fixo do Erasmo Russo
      userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
    } else {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(adaptInvestmentFromDB);
  },

  async create(investment: Partial<AdaptedInvestment>): Promise<AdaptedInvestment> {
    // Usar o user_id fixo do Erasmo se localStorage auth está ativo
    const isLocalAuth = localStorage.getItem('erasmoInvestAuth') === 'true';
    let userId = null;
    
    if (isLocalAuth) {
      // User ID fixo do Erasmo Russo
      userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      console.log('✅ CREATE usando user_id fixo:', userId);
    } else {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');
      userId = user.id;
    }

    const dbInvestment = adaptInvestmentToDB(investment);
    
    const { data, error } = await supabase
      .from('investments')
      .insert({
        ...dbInvestment,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return adaptInvestmentFromDB(data);
  },

  async update(id: string, updates: Partial<AdaptedInvestment>): Promise<AdaptedInvestment> {
    // Usar o user_id fixo do Erasmo se localStorage auth está ativo
    const isLocalAuth = localStorage.getItem('erasmoInvestAuth') === 'true';
    let userId = null;
    
    if (isLocalAuth) {
      // User ID fixo do Erasmo Russo
      userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      console.log('✅ UPDATE usando user_id fixo:', userId);
    } else {
      const user = await getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');
      userId = user.id;
    }

    const dbUpdates = adaptInvestmentToDB(updates);

    const { data, error } = await supabase
      .from('investments')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return adaptInvestmentFromDB(data);
  },

  async delete(id: string): Promise<void> {
    console.log('🗑️ DELETE: Excluindo investimento ID:', id);
    
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Erro no DELETE:', error);
      throw error;
    }
    
    console.log('✅ DELETE: Investimento excluído com sucesso');
  }
};

// Serviços para cálculos de portfólio
export const portfolioService = {
  async getPortfolioSummary() {
    console.log('🔧 ERASMO INVEST - Configurações:');
    console.log('🌐 SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NÃO DEFINIDA');
    console.log('🔑 SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
    console.log('🔒 Auth Estado:', localStorage.getItem('erasmoInvestAuth'));

    console.log('🚀 ERASMO INVEST - Iniciando carregamento de dados...');
    console.log('📊 Portfolio Service: DISPONÍVEL');
    console.log('🔧 Use Local Data:', localStorage.getItem('erasmoInvestAuth') === 'true');
    
    const isLocalAuth = localStorage.getItem('erasmoInvestAuth') === 'true';
    
    if (!isLocalAuth) {
      console.log('⚠️ Usuário não autenticado no localStorage, usando dados demo');
      return this.getDemoPortfolio();
    }

    // Tentar obter usuário do Supabase, mas não bloquear se falhar
    const user = await getCurrentUser();
    if (!user) {
      console.log('⚠️ Usuário Supabase não encontrado, mas localStorage válido - carregando dados reais');
    }

    try {
      console.log('🔄 Tentando conectar com Supabase...');
      
      // 💎 NOVA ABORDAGEM: Usar investment_summary diretamente em vez de processar investimentos individuais
      const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      const summaries = await summaryService.getInvestmentSummary(userId);
      const metadata = await assetMetadataService.getAll();
      
      console.log('📊 Dados carregados do investment_summary:', summaries?.length || 0, 'ativos');
      console.log('📋 Metadados disponíveis:', metadata?.length || 0, 'ativos');
      
      // Se não há dados, usar dados demo
      if (!summaries || summaries.length === 0) {
        console.log('⚠️ Nenhum dado encontrado, usando dados demo');
        return this.getDemoPortfolio();
      }

      // Função para criar metadata automática quando não existe
      const createAutoMetadata = (ticker: string): AssetMetadata => {
        const isFII = ticker.endsWith('11');
        const isBrazilianStock = ticker.endsWith('3') || ticker.endsWith('4') || ticker.endsWith('11');
        const isUS = !isBrazilianStock && (ticker.length <= 5 || ['DVN', 'EVEX', 'O', 'VOO', 'VNQ'].includes(ticker));
        const isTesouroDireto = ticker.startsWith('TESOURO_');
        
        // Mapeamento de nomes conhecidos
        const knownNames: Record<string, string> = {
          'BBAS3': 'Banco do Brasil S.A.',
          'BBDC3': 'Banco Bradesco S.A.',
          'BBDC4': 'Banco Bradesco S.A.',
          'BBSE3': 'BB Seguridade Participações S.A.',
          'B3SA3': 'B3 S.A. - Brasil, Bolsa, Balcão',
          'CPFE3': 'CPFL Energia S.A.',
          'EGIE3': 'Engie Brasil Energia S.A.',
          'FLRY3': 'Fleury S.A.',
          'ODPV3': 'Odontoprev S.A.',
          'PSSA3': 'Porto Seguro S.A.',
          'RADL3': 'Raia Drogasil S.A.',
          'VALE3': 'Vale S.A.',
          'WEGE3': 'WEG S.A.',
          'VOO': 'Vanguard S&P 500 ETF',
          'VNQ': 'Vanguard Real Estate ETF',
          'DVN': 'Devon Energy Corporation',
          'EVEX': 'Eve Holding Inc.',
          'O': 'Realty Income Corporation',
          'TESOURO_SELIC_2026': 'Tesouro Selic 2026'
        };
        
        return {
          id: `auto-${ticker}`,
          ticker,
          nome: knownNames[ticker] || ticker,
          tipo: isTesouroDireto ? 'TESOURO_DIRETO' : (isFII ? 'FII' : (isUS ? 'STOCK' : 'ACAO')) as 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO',
          pais: isUS ? 'EUA' : 'BRASIL' as 'BRASIL' | 'EUA' | 'GLOBAL',
          moeda: isUS ? 'USD' : 'BRL' as 'BRL' | 'USD',
          setor: isTesouroDireto ? 'Renda Fixa' : (isFII ? 'Fundos Imobiliários' : (isUS ? 'Technology' : 'Diversos')),
          subsetor: null,
          segmento: null,
          liquidez: 'MEDIA',
          categoria_dy: (isFII || isTesouroDireto) ? 'RENDA_FIXA' : 'RENDA_VARIAVEL',
          benchmark: isUS ? 'S&P500' : 'IBOVESPA',
          isin: null,
          cnpj: null,
          gestora: null,
          descricao: `Ativo ${ticker} - Metadata gerada automaticamente`,
          site_oficial: null,
          cor_tema: isTesouroDireto ? '#059669' : (isFII ? '#3b82f6' : (isUS ? '#10b981' : '#f59e0b')),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      };
      
      const portfolioMap = new Map<string, {
        ticker: string;
        metadata: AssetMetadata;
        investments: any[];
        totalInvested: number;
        currentPosition: number;
        totalDividends: number;
        totalJuros: number;
        totalImpostos: number;
        totalYield: number;
        marketValue: number;
        profit: number;
        profitPercent: number;
      }>();

      // 💎 NOVA LÓGICA: Usar dados da investment_summary (valores corretos!)
      for (const summary of summaries) {
        const ticker = summary.ticker;
        
        // Apenas processar ativos com saldo > 0
        if (Number(summary.saldo_atual) <= 0) continue;
        
        let assetMeta = metadata.find(m => m.ticker === ticker);
        
        // Se não tem metadados, criar automaticamente
        if (!assetMeta) {
          console.log(`🔧 Criando metadata automática para: ${ticker}`);
          assetMeta = createAutoMetadata(ticker);
        }

        // 💰 CÁLCULO CORRETO DO VALOR INVESTIDO LÍQUIDO
        const valorTotalCompra = Number(summary.valor_total_compra) || 0;
        const valorTotalVenda = Number(summary.valor_total_venda) || 0;
        const valorInvestidoLiquido = valorTotalCompra - valorTotalVenda; // Valor líquido investido

        // 📊 CARREGAR INVESTIMENTOS INDIVIDUAIS PARA EXIBIR NA TABELA
        console.log(`🔍 Carregando investments para ${ticker}...`);
        const investments = await investmentService.getByTicker(ticker);
        console.log(`🔍 ${ticker} - investments carregados:`, investments.length);
        console.log(`🔍 ${ticker} - primeiro investment:`, investments[0]);
        
        const investmentRows = investments.map(inv => ({
          data: inv.data,
          tipo: inv.tipo,
          compra: inv.tipo === 'COMPRA' ? inv.quantidade : 0,
          venda: inv.tipo === 'VENDA' ? inv.quantidade : 0,
          quantidade: inv.quantidade,
          valorUnit: inv.valor_unitario,
          valor_unitario: inv.valor_unitario,
          valor_total: inv.valor_total,
          dividendos: inv.dividendos,
          juros: inv.juros,
          impostos: inv.impostos,
          obs: inv.observacoes || '',
          observacoes: inv.observacoes || ''
        }));
        
        console.log(`🔍 ${ticker} - investmentRows criados:`, investmentRows.length);

        const portfolio = {
          ticker,
          metadata: assetMeta,
          investments: investmentRows, // ✅ CARREGAR INVESTIMENTOS INDIVIDUAIS
          totalInvested: valorInvestidoLiquido, // ✅ VALOR CORRETO
          currentPosition: Number(summary.saldo_atual), // ✅ SALDO CORRETO  
          totalDividends: Number(summary.total_dividendos) || 0,
          totalJuros: Number(summary.total_juros) || 0,
          totalImpostos: Number(summary.total_impostos) || 0,
          totalYield: 0, // Será calculado abaixo
          marketValue: 0, // Será calculado abaixo
          profit: 0, // Será calculado abaixo
          profitPercent: 0 // Será calculado abaixo
        };

        portfolioMap.set(ticker, portfolio);
        
        console.log(`💎 ${ticker}: Investido líquido R$ ${valorInvestidoLiquido.toFixed(2)} | Saldo ${summary.saldo_atual} cotas`);
      }

      // 💰 CALCULAR MÉTRICAS FINAIS COM DADOS REAIS DE MERCADO
      const portfolios = Array.from(portfolioMap.values()).map(portfolio => {
        const totalProventos = portfolio.totalDividends + portfolio.totalJuros;
        
        // ✅ CORREÇÃO: Yield baseado no valor investido (não absoluto)
        portfolio.totalYield = portfolio.totalInvested > 0 ? (totalProventos / portfolio.totalInvested) * 100 : 0;
        
        // 📊 VALOR DE MERCADO: Usar preço médio de compra como base (será atualizado com API real)
        const averageBuyPrice = portfolio.currentPosition > 0 ? portfolio.totalInvested / portfolio.currentPosition : 0;
        portfolio.marketValue = portfolio.currentPosition * averageBuyPrice; // Base inicial
        
        // 💸 LUCRO/PREJUÍZO: Valor atual - Valor investido
        portfolio.profit = portfolio.marketValue - portfolio.totalInvested;
        portfolio.profitPercent = portfolio.totalInvested > 0 ? (portfolio.profit / portfolio.totalInvested) * 100 : 0;
        
        return portfolio;
      });

      console.log('✅ Dados carregados do Supabase:', portfolios.length, 'ativos únicos processados');
      
      // Filtrar apenas ativos com posição atual > 0 (ainda possui)
      const activePortfolios = portfolios.filter(p => p.currentPosition > 0);
      console.log('📊 Ativos ativos (posição > 0):', activePortfolios.length);
      
      // 💰 FORÇAR ATUALIZAÇÃO COM DADOS REAIS DE MERCADO
      console.log('🚀 === FORÇANDO ATUALIZAÇÃO COM APIS REAIS ===');
      
      try {
        const { updatePortfoliosWithMarketData } = await import('./portfolioCalculator');
        console.log('✅ Módulo portfolioCalculator importado');
        
        const portfoliosWithMarketData = await updatePortfoliosWithMarketData(activePortfolios);
        console.log('✅ Portfolios atualizados com market data:', portfoliosWithMarketData.length);
        
        return portfoliosWithMarketData.sort((a, b) => a.ticker.localeCompare(b.ticker));
      } catch (error) {
        console.error('❌ Erro na integração market data, usando dados básicos:', error);
        return activePortfolios.sort((a, b) => a.ticker.localeCompare(b.ticker));
      }
    } catch (error) {
      console.error('❌ ERRO NO SUPABASE:', error);
      console.log('🔄 Fallback para dados locais...');
      return this.getDemoPortfolio();
    }
  },

  async getDemoPortfolio() {
    const metadata = await assetMetadataService.getAll();
    
    return metadata.slice(0, 4).map(meta => ({
      ticker: meta.ticker,
      metadata: meta,
      investments: [],
      totalInvested: 10000 + Math.random() * 5000,
      currentPosition: 100 + Math.random() * 50,
      totalDividends: 500 + Math.random() * 300,
      totalJuros: 0,
      totalImpostos: 0,
      totalYield: 8 + Math.random() * 4,
      marketValue: 11000 + Math.random() * 3000,
      profit: 1000 + Math.random() * 1000,
      profitPercent: 8 + Math.random() * 6
    }));
  }
};

// 📊 INTERFACE PARA O RESUMO DE INVESTIMENTOS (baseado na view investment_summary)
export interface InvestmentSummary {
  ticker: string;
  user_id: string;
  currency: string;
  total_compras: number;
  total_vendas: number;
  saldo_atual: number;
  valor_total_compra: number;
  valor_total_venda: number;
  total_dividendos: number;
  total_juros: number;
  total_impostos: number;
  total_proventos: number;
  preco_medio: number;
  total_operacoes: number;
  primeira_operacao: string;
  ultima_operacao: string;
}

// 📈 SERVIÇOS QUE USAM A VIEW INVESTMENT_SUMMARY (DADOS CORRETOS)
export const summaryService = {
  // 📊 BUSCAR RESUMO COMPLETO DOS INVESTIMENTOS USANDO A VIEW
  async getInvestmentSummary(userId: string): Promise<InvestmentSummary[]> {
    try {
      console.log('📊 Buscando resumo de investimentos para user:', userId);
      
      const { data, error } = await supabase
        .from('investment_summary')
        .select('*')
        .eq('user_id', userId)
        .order('ticker');

      if (error) {
        console.error('❌ Erro ao buscar investment_summary:', error);
        throw error;
      }

      console.log('✅ Resumo de investimentos obtido:', data?.length || 0, 'ativos');
      return data || [];
    } catch (error) {
      console.error('💥 Erro crítico ao buscar resumo:', error);
      return [];
    }
  },

  // 📊 BUSCAR TOTAIS GERAIS DA CARTEIRA COM CONVERSÃO USD/BRL
  async getPortfolioTotals(userId: string) {
    try {
      const summaries = await this.getInvestmentSummary(userId);
      const { currencyService } = await import('./currencyService');
      
      const totals = {
        totalInvested: 0,
        totalCurrentValue: 0, // Precisará de dados de mercado
        totalDividends: 0,
        totalJuros: 0,
        totalImpostos: 0,
        totalProventos: 0,
        activeAssets: 0,
        totalAssets: summaries.length,
        totalInvestedUSD: 0,
        totalInvestedBRL: 0,
        exchangeRate: 0
      };

      // Obter cotação USD/BRL
      const exchangeRate = await currencyService.getUSDToBRLRate();
      totals.exchangeRate = exchangeRate.rate;

      for (const summary of summaries) {
        const investedValue = Number(summary.valor_total_compra) - Number(summary.valor_total_venda);
        const isUSAsset = currencyService.isUSAsset(summary.ticker);
        
        if (isUSAsset && summary.currency === 'USD') {
          // Converter valores USD para BRL
          const { brlAmount } = await currencyService.convertUSDToBRL(investedValue);
          totals.totalInvested += brlAmount;
          totals.totalInvestedUSD += investedValue;
          
          console.log(`💱 ${summary.ticker}: $${investedValue.toFixed(2)} → R$ ${brlAmount.toFixed(2)}`);
        } else {
          // Valores já em BRL
          totals.totalInvested += investedValue;
          totals.totalInvestedBRL += investedValue;
        }
        
        totals.totalDividends += Number(summary.total_dividendos);
        totals.totalJuros += Number(summary.total_juros);
        totals.totalImpostos += Number(summary.total_impostos);
        totals.totalProventos += Number(summary.total_proventos);
        
        if (Number(summary.saldo_atual) > 0) {
          totals.activeAssets++;
        }
      }

      console.log('💰 Totais da carteira calculados com conversão:', totals);
      return totals;
    } catch (error) {
      console.error('❌ Erro ao calcular totais da carteira:', error);
      return null;
    }
  },

  // 🔍 BUSCAR DADOS DETALHADOS DE UM ATIVO ESPECÍFICO
  async getAssetDetails(userId: string, ticker: string) {
    try {
      console.log(`🔍 Buscando detalhes do ativo ${ticker} para user ${userId}`);
      
      // Buscar resumo do ativo
      const { data: summary, error: summaryError } = await supabase
        .from('investment_summary')
        .select('*')
        .eq('user_id', userId)
        .eq('ticker', ticker)
        .single();

      if (summaryError) {
        console.error('❌ Erro ao buscar resumo do ativo:', summaryError);
        throw summaryError;
      }

      // Buscar operações detalhadas
      const { data: operations, error: operationsError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .eq('ticker', ticker)
        .order('date', { ascending: true });

      if (operationsError) {
        console.error('❌ Erro ao buscar operações do ativo:', operationsError);
        throw operationsError;
      }

      console.log(`✅ Detalhes do ${ticker} obtidos: ${operations?.length || 0} operações`);
      return {
        summary,
        operations: operations || []
      };
    } catch (error) {
      console.error(`💥 Erro ao buscar detalhes do ${ticker}:`, error);
      return null;
    }
  },

  // 📈 BUSCAR DADOS AGRUPADOS POR MOEDA
  async getPortfolioByCurrency(userId: string) {
    try {
      const summaries = await this.getInvestmentSummary(userId);
      
      const byCurrency = {
        BRL: {
          totalInvested: 0,
          totalProventos: 0,
          assets: [] as InvestmentSummary[]
        },
        USD: {
          totalInvested: 0,
          totalProventos: 0,
          assets: [] as InvestmentSummary[]
        }
      };

      summaries.forEach(summary => {
        const currency = summary.currency as 'BRL' | 'USD';
        const invested = Number(summary.valor_total_compra) - Number(summary.valor_total_venda);
        
        byCurrency[currency].totalInvested += invested;
        byCurrency[currency].totalProventos += Number(summary.total_proventos);
        byCurrency[currency].assets.push(summary);
      });

      console.log('💱 Dados por moeda calculados:', byCurrency);
      return byCurrency;
    } catch (error) {
      console.error('❌ Erro ao agrupar por moeda:', error);
      return null;
    }
  }
};

// Serviço para autenticação
export const authService = {
  async signInWithEmailAndPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('erasmoInvestAuth');
  },

  async getCurrentUser() {
    return getCurrentUser();
  }
};