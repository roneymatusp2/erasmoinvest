// Mapeamento de nomes amigáveis para tickers oficiais
export interface TickerMapping {
  friendlyName: string;
  officialTicker: string;
  sector: string;
  market: string;
}

export const tickerMappings: Record<string, TickerMapping> = {
  // Bancos
  'Banco do Brasil': {
    friendlyName: 'Banco do Brasil',
    officialTicker: 'BBAS3',
    sector: 'Financeiro',
    market: 'B3'
  },
  'Bradesco': {
    friendlyName: 'Bradesco',
    officialTicker: 'BBDC4',
    sector: 'Financeiro',
    market: 'B3'
  },
  'Itaú': {
    friendlyName: 'Itaú',
    officialTicker: 'ITUB4',
    sector: 'Financeiro',
    market: 'B3'
  },
  'Santander': {
    friendlyName: 'Santander',
    officialTicker: 'SANB11',
    sector: 'Financeiro',
    market: 'B3'
  },
  
  // Varejo e Consumo
  'DROGARAIA': {
    friendlyName: 'DROGARAIA',
    officialTicker: 'RAIA3',
    sector: 'Varejo',
    market: 'B3'
  },
  'Magazine Luiza': {
    friendlyName: 'Magazine Luiza',
    officialTicker: 'MGLU3',
    sector: 'Varejo',
    market: 'B3'
  },
  'Via Varejo': {
    friendlyName: 'Via Varejo',
    officialTicker: 'VIIA3',
    sector: 'Varejo',
    market: 'B3'
  },
  'Americanas': {
    friendlyName: 'Americanas',
    officialTicker: 'AMER3',
    sector: 'Varejo',
    market: 'B3'
  },
  
  // Saúde
  'ODONTOPREV': {
    friendlyName: 'ODONTOPREV',
    officialTicker: 'ODPV3',
    sector: 'Saúde',
    market: 'B3'
  },
  'Hapvida': {
    friendlyName: 'Hapvida',
    officialTicker: 'HAPV3',
    sector: 'Saúde',
    market: 'B3'
  },
  'NotreDame': {
    friendlyName: 'NotreDame',
    officialTicker: 'GNDI3',
    sector: 'Saúde',
    market: 'B3'
  },
  
  // Energia e Petróleo
  'Petrobras': {
    friendlyName: 'Petrobras',
    officialTicker: 'PETR4',
    sector: 'Energia',
    market: 'B3'
  },
  'Petrobras PN': {
    friendlyName: 'Petrobras PN',
    officialTicker: 'PETR3',
    sector: 'Energia',
    market: 'B3'
  },
  'Vale': {
    friendlyName: 'Vale',
    officialTicker: 'VALE3',
    sector: 'Mineração',
    market: 'B3'
  },
  
  // Tecnologia
  'Totvs': {
    friendlyName: 'Totvs',
    officialTicker: 'TOTS3',
    sector: 'Tecnologia',
    market: 'B3'
  },
  'Locaweb': {
    friendlyName: 'Locaweb',
    officialTicker: 'LWSA3',
    sector: 'Tecnologia',
    market: 'B3'
  },
  'PagSeguro': {
    friendlyName: 'PagSeguro',
    officialTicker: 'PAGS34',
    sector: 'Tecnologia',
    market: 'B3'
  },
  
  // Utilities
  'Copel': {
    friendlyName: 'Copel',
    officialTicker: 'CPLE6',
    sector: 'Energia Elétrica',
    market: 'B3'
  },
  'Cemig': {
    friendlyName: 'Cemig',
    officialTicker: 'CMIG4',
    sector: 'Energia Elétrica',
    market: 'B3'
  },
  'Eletrobras': {
    friendlyName: 'Eletrobras',
    officialTicker: 'ELET6',
    sector: 'Energia Elétrica',
    market: 'B3'
  },
  
  // FIIs Populares  
  'FII Alzira Agro': {
    friendlyName: 'FII Alzira Agro',
    officialTicker: 'ALZR11',
    sector: 'FII Agronegócio',
    market: 'B3'
  },
  'FII BC Copacabana': {
    friendlyName: 'FII BC Copacabana',
    officialTicker: 'BCIA11',
    sector: 'FII Imobiliário',
    market: 'B3'
  },
  'FII XP Log': {
    friendlyName: 'FII XP Log',
    officialTicker: 'XPLG11',
    sector: 'FII Logístico',
    market: 'B3'
  },
  'FII Kinea': {
    friendlyName: 'FII Kinea',
    officialTicker: 'KNCR11',
    sector: 'FII Imobiliário',
    market: 'B3'
  },
  
  // Ações Americanas Populares
  'Apple': {
    friendlyName: 'Apple',
    officialTicker: 'AAPL',
    sector: 'Tecnologia',
    market: 'NASDAQ'
  },
  'Microsoft': {
    friendlyName: 'Microsoft',
    officialTicker: 'MSFT',
    sector: 'Tecnologia',
    market: 'NASDAQ'
  },
  'Amazon': {
    friendlyName: 'Amazon',
    officialTicker: 'AMZN',
    sector: 'Tecnologia',
    market: 'NASDAQ'
  },
  'Google': {
    friendlyName: 'Google',
    officialTicker: 'GOOGL',
    sector: 'Tecnologia',
    market: 'NASDAQ'
  },
  'Tesla': {
    friendlyName: 'Tesla',
    officialTicker: 'TSLA',
    sector: 'Automotivo',
    market: 'NASDAQ'
  }
};

// Funções utilitárias
export const findTickerByName = (name: string): TickerMapping | null => {
  const mapping = tickerMappings[name];
  return mapping || null;
};

export const getOfficialTicker = (nameOrTicker: string): string => {
  // Se já é um ticker oficial conhecido, retorna ele mesmo
  const existingMapping = Object.values(tickerMappings).find(
    mapping => mapping.officialTicker === nameOrTicker.toUpperCase()
  );
  
  if (existingMapping) {
    return existingMapping.officialTicker;
  }
  
  // Se é um nome amigável, retorna o ticker oficial
  const mapping = findTickerByName(nameOrTicker);
  return mapping ? mapping.officialTicker : nameOrTicker.toUpperCase();
};

export const getFriendlyName = (ticker: string): string => {
  const mapping = Object.values(tickerMappings).find(
    mapping => mapping.officialTicker === ticker.toUpperCase()
  );
  
  return mapping ? mapping.friendlyName : ticker;
};

export const getAllMappings = (): TickerMapping[] => {
  return Object.values(tickerMappings);
};

export const searchMappings = (query: string): TickerMapping[] => {
  const lowercaseQuery = query.toLowerCase();
  
  return Object.values(tickerMappings).filter(mapping => 
    mapping.friendlyName.toLowerCase().includes(lowercaseQuery) ||
    mapping.officialTicker.toLowerCase().includes(lowercaseQuery) ||
    mapping.sector.toLowerCase().includes(lowercaseQuery)
  );
}; 