import React from 'react';
import AssetCard from './src/components/AssetCard';
import { Portfolio, AssetMetadata } from './src/types/investment';

// Dados de teste simulando portfolios reais com metadados
const testPortfolios: Portfolio[] = [
  {
    ticker: 'ALZR11',
    metadata: {
      ticker: 'ALZR11',
      nome: 'Alianza Trust Renda Imobiliária',
      tipo: 'FII',
      pais: 'BRASIL',
      moeda: 'BRL',
      setor: 'Fundos Imobiliários',
      subsetor: 'Lajes Corporativas',
      segmento: 'Tijolo',
      liquidez: 'ALTA',
      categoria_dy: 'RENDA_FIXA',
      benchmark: 'IFIX',
      isin: 'BRALZRCTF009',
      cnpj: '28.767.076/0001-46',
      gestora: 'Alianza Trust',
      descricao: 'Fundo de investimento imobiliário focado em lajes corporativas de alto padrão',
      cor_tema: '#1e40af'
    },
    totalInvested: 10000,
    totalDividends: 800,
    totalJuros: 0,
    currentPosition: 100,
    totalYield: 8.5,
    marketValue: 12000,
    profit: 2000,
    profitPercent: 20,
    currentPrice: 120,
    priceChangePercent: 1.5,
    moeda: 'BRL'
  },
  {
    ticker: 'BBAS3',
    metadata: {
      ticker: 'BBAS3',
      nome: 'Banco do Brasil',
      tipo: 'ACAO',
      pais: 'BRASIL',
      moeda: 'BRL',
      setor: 'Financeiro',
      subsetor: 'Bancos',
      segmento: 'Banco Comercial',
      liquidez: 'ALTA',
      categoria_dy: 'RENDA_VARIAVEL',
      benchmark: 'IBOVESPA',
      isin: 'BRBBASACNOR3',
      descricao: 'Maior banco público do Brasil',
      cor_tema: '#fbbf24'
    },
    totalInvested: 8000,
    totalDividends: 600,
    totalJuros: 0,
    currentPosition: 200,
    totalYield: 7.5,
    marketValue: 9500,
    profit: 1500,
    profitPercent: 18.75,
    currentPrice: 47.50,
    priceChangePercent: 2.1,
    moeda: 'BRL'
  },
  {
    ticker: 'VOO',
    metadata: {
      ticker: 'VOO',
      nome: 'Vanguard S&P 500 ETF',
      tipo: 'ETF',
      pais: 'EUA',
      moeda: 'USD',
      setor: 'Diversificado',
      subsetor: 'Large Cap',
      segmento: 'Ações',
      liquidez: 'ALTA',
      categoria_dy: 'RENDA_VARIAVEL',
      benchmark: 'S&P 500',
      isin: 'US9229087690',
      descricao: 'ETF que replica o desempenho do índice S&P 500',
      cor_tema: '#0369a1'
    },
    totalInvested: 15000,
    totalDividends: 300,
    totalJuros: 0,
    currentPosition: 50,
    totalYield: 2.0,
    marketValue: 18000,
    profit: 3000,
    profitPercent: 20,
    currentPrice: 360,
    priceChangePercent: 0.8,
    moeda: 'USD'
  },
  {
    ticker: 'TESOURO SELIC 2026',
    metadata: {
      ticker: 'TESOURO SELIC 2026',
      nome: 'Tesouro Selic 2026',
      tipo: 'TESOURO_DIRETO',
      pais: 'BRASIL',
      moeda: 'BRL',
      setor: 'Renda Fixa',
      subsetor: 'Títulos Públicos',
      segmento: 'Tesouro Direto',
      liquidez: 'ALTA',
      categoria_dy: 'RENDA_FIXA',
      benchmark: 'Selic',
      isin: 'BRSTNCLTN2E6',
      descricao: 'Título público federal indexado à taxa Selic',
      cor_tema: '#047857'
    },
    totalInvested: 5000,
    totalDividends: 0,
    totalJuros: 450,
    currentPosition: 50,
    totalYield: 9.0,
    marketValue: 5500,
    profit: 500,
    profitPercent: 10,
    currentPrice: 110,
    priceChangePercent: 0.1,
    moeda: 'BRL'
  }
];

// Componente de teste para verificar as cores
const TestAssetColors: React.FC = () => {
  return (
    <div style={{ 
      backgroundColor: '#1e293b', 
      minHeight: '100vh', 
      padding: '20px',
      color: 'white'
    }}>
      <h1>🎨 Teste de Cores dos Asset Cards</h1>
      <p>Este componente testa se as cores estão sendo aplicadas corretamente para cada tipo de ativo.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
      }}>
        {testPortfolios.map((portfolio, index) => (
          <div key={portfolio.ticker}>
            <h3 style={{ color: '#60a5fa', marginBottom: '10px' }}>
              {portfolio.metadata?.tipo} - {portfolio.metadata?.nome}
            </h3>
            <AssetCard
              portfolio={portfolio}
              onClick={() => console.log(`Clicked ${portfolio.ticker}`)}
              isActive={false}
              index={index}
            />
            <div style={{ 
              marginTop: '10px', 
              fontSize: '12px', 
              color: '#94a3b8',
              backgroundColor: '#334155',
              padding: '8px',
              borderRadius: '8px'
            }}>
              <strong>Debug Info:</strong><br/>
              Tipo: {portfolio.metadata?.tipo}<br/>
              País: {portfolio.metadata?.pais}<br/>
              Cor esperada: {
                portfolio.metadata?.tipo === 'FII' ? 'Verde' :
                portfolio.metadata?.tipo === 'ACAO' ? 'Roxo' :
                portfolio.metadata?.tipo === 'ETF' && portfolio.metadata?.pais === 'EUA' ? 'Laranja' :
                portfolio.metadata?.tipo === 'TESOURO_DIRETO' ? 'Verde água' : 'Azul'
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestAssetColors;

// Para testar, adicione este componente ao seu App.tsx temporariamente:
// import TestAssetColors from './test_asset_colors';
// E renderize <TestAssetColors /> em vez do componente principal