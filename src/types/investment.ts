export interface Investment {
  id?: string;
  user_id?: string;
  ticker: string;
  date: string;
  compra: number;
  venda: number;
  valor_unit: number;
  dividendos: number;
  juros: number;
  impostos?: number;
  observacoes: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvestmentRow {
  data: string;
  tipo: 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS' | 'DESDOBRAMENTO';
  compra: number;
  venda: number;
  quantidade: number;
  valorUnit: number;
  valor_unitario: number;
  valor_total: number;
  dividendos: number;
  juros: number;
  impostos?: number;
  obs: string;
  observacoes: string;
}

export interface AssetMetadata {
  ticker: string;
  nome: string;
  tipo: 'FII' | 'ACAO' | 'ETF' | 'REIT' | 'STOCK' | 'TESOURO_DIRETO';
  pais: 'BRASIL' | 'EUA' | 'GLOBAL';
  moeda: 'BRL' | 'USD';
  setor: string;
  subsetor: string;
  segmento: string;
  liquidez: 'ALTA' | 'MEDIA' | 'BAIXA';
  categoria_dy: 'RENDA_FIXA' | 'RENDA_VARIAVEL' | 'HIBRIDO';
  benchmark: string;
  isin: string;
  cnpj?: string;
  gestora?: string;
  descricao: string;
  site_oficial?: string;
  logo_url?: string;
  cor_tema: string;
  fundo_imobiliario?: {
    tipo_fii: 'TIJOLO' | 'PAPEL' | 'HIBRIDO' | 'FUNDOS';
    segmento_fii: string;
    patrimonio_liquido: number;
    num_cotistas: number;
    dividend_yield_12m: number;
    p_vp: number;
  };
  acao?: {
    free_float: number;
    valor_mercado: number;
    dividend_yield_12m: number;
    p_l: number;
    p_vp: number;
    roe: number;
    roic: number;
    margem_liquida: number;
  };
  etf?: {
    expense_ratio: number;
    aum: number;
    tracking_error: number;
    inception_date: string;
  };
  tesouro_direto?: {
    tipo_titulo: 'SELIC' | 'IPCA' | 'PREFIXADO';
    vencimento: string;
    rentabilidade: string;
    valor_minimo: number;
    indexador?: string;
  };
}

export interface Portfolio {
  ticker: string;
  metadata?: AssetMetadata;
  totalInvested: number;
  totalDividends: number;
  totalJuros: number;
  totalImpostos?: number;
  currentPosition: number;
  totalYield: number;
  marketValue?: number;
  profit?: number;
  profitPercent?: number;
  averagePrice?: number;
  currentPrice?: number;
  priceChangePercent?: number;
  moeda?: 'BRL' | 'USD';
  lastDividend?: number;
  monthlyIncome?: number;
  investments?: InvestmentRow[];
  performance?: {
    dy_12m: number;
    dy_historico: number;
    cagr: number;
    volatilidade: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
}

export interface PortfolioAnalysis {
  resumo_geral: {
    total_investido: number;
    valor_mercado: number;
    lucro_prejuizo: number;
    rentabilidade_total: number;
    dy_medio: number;
    renda_mensal: number;
    num_ativos: number;
  };
  por_tipo: Record<string, {
    tipo: string;
    valor_investido: number;
    percentual: number;
    dy_medio: number;
    renda_mensal: number;
    ativos: string[];
  }>;
  por_pais: Record<string, {
    pais: string;
    valor_investido: number;
    percentual: number;
    dy_medio: number;
    moeda: string;
    ativos: string[];
  }>;
  por_setor: Record<string, {
    setor: string;
    valor_investido: number;
    percentual: number;
    dy_medio: number;
    ativos: string[];
  }>;
  top_performers: {
    maior_dy: Portfolio[];
    maior_rentabilidade: Portfolio[];
    maior_renda_mensal: Portfolio[];
    maior_crescimento: Portfolio[];
  };
  risk_analysis: {
    concentracao_risco: number;
    diversificacao_score: number;
    volatilidade_portfolio: number;
    correlacao_media: number;
    var_95: number;
  };
}

export interface MarketData {
  symbol?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  pe?: number;
  dividendYield?: number;
  lastUpdate?: string;
  currentPrice?: number;
  priceChangePercent?: number;
  currency?: string;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}