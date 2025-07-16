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
      
      const investments = await investmentService.getAll();
      const metadata = await assetMetadataService.getAll();
      
      console.log('📊 Dados carregados do Supabase:', investments?.length || 0, 'investimentos');
      console.log('📋 Metadados disponíveis:', metadata?.length || 0, 'ativos');
      
      // Se não há investimentos, usar dados demo
      if (!investments || investments.length === 0) {
        console.log('⚠️ Nenhum investimento encontrado, usando dados demo');
        return this.getDemoPortfolio();
      }

      // Função para criar metadata automática quando não existe
      const createAutoMetadata = (ticker: string): AssetMetadata => {
        const isFII = ticker.endsWith('11');
        const isBrazilianStock = ticker.endsWith('3') || ticker.endsWith('4') || ticker.endsWith('11');
        const isUS = !isBrazilianStock && (ticker.length <= 5 || ['DVN', 'EVEX', 'O', 'VOO', 'VNQ'].includes(ticker));
        
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
          'O': 'Realty Income Corporation'
        };
        
        return {
          id: `auto-${ticker}`,
          ticker,
          nome: knownNames[ticker] || ticker,
          tipo: isFII ? 'FII' : (isUS ? 'STOCK' : 'ACAO') as 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK',
          pais: isUS ? 'EUA' : 'BRASIL' as 'BRASIL' | 'EUA' | 'GLOBAL',
          moeda: isUS ? 'USD' : 'BRL' as 'BRL' | 'USD',
          setor: isFII ? 'Fundos Imobiliários' : (isUS ? 'Technology' : 'Diversos'),
          subsetor: null,
          segmento: null,
          liquidez: 'MEDIA',
          categoria_dy: isFII ? 'RENDA_FIXA' : 'RENDA_VARIAVEL',
          benchmark: isUS ? 'S&P500' : 'IBOVESPA',
          isin: null,
          cnpj: null,
          gestora: null,
          descricao: `Ativo ${ticker} - Metadata gerada automaticamente`,
          site_oficial: null,
          cor_tema: isFII ? '#3b82f6' : (isUS ? '#10b981' : '#f59e0b'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      };
      
      const portfolioMap = new Map<string, {
        ticker: string;
        metadata: AssetMetadata;
        investments: AdaptedInvestment[];
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

      // Agrupar investimentos por ticker - INCLUINDO TODOS OS TICKERS
      for (const investment of investments) {
        const ticker = investment.ticker;
        let assetMeta = metadata.find(m => m.ticker === ticker);
        
        // Se não tem metadados, criar automaticamente
        if (!assetMeta) {
          console.log(`🔧 Criando metadata automática para: ${ticker}`);
          assetMeta = createAutoMetadata(ticker);
        }

        if (!portfolioMap.has(ticker)) {
          portfolioMap.set(ticker, {
            ticker,
            metadata: assetMeta,
            investments: [],
            totalInvested: 0,
            currentPosition: 0,
            totalDividends: 0,
            totalJuros: 0,
            totalImpostos: 0,
            totalYield: 0,
            marketValue: 0,
            profit: 0,
            profitPercent: 0
          });
        }

        const portfolio = portfolioMap.get(ticker)!;
        portfolio.investments.push(investment);

        // 🔧 CÁLCULOS CORRIGIDOS - Separar valor investido de posição atual
        switch (investment.tipo) {
          case 'COMPRA':
            portfolio.totalInvested += investment.valor_total; // Soma o valor gasto
            portfolio.currentPosition += investment.quantidade; // Soma as cotas
            break;
          case 'VENDA':
            // CORREÇÃO: Para vendas, não diminuir totalInvested pois é valor recebido
            // totalInvested deve representar quanto foi gasto (não recebido)
            portfolio.currentPosition -= investment.quantidade; // Remove as cotas vendidas
            break;
          case 'DIVIDENDO':
            portfolio.totalDividends += investment.dividendos;
            break;
          case 'JUROS':
            portfolio.totalJuros += investment.juros;
            break;
          case 'DESDOBRAMENTO':
            portfolio.currentPosition += investment.quantidade; // Adiciona cotas do desdobramento
            break;
        }
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