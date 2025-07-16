import { supabase } from '../lib/supabase';
import { assetMetadataService, investmentService } from './supabaseService';
import { assetMetadata } from '../data/assetMetadata';
import { portfolioData } from '../data/portfolioData';

export const seedDatabase = async () => {
  try {
    console.log('Iniciando seed do banco de dados...');
    
    // Verificar se já existem dados
    const existingMetadata = await assetMetadataService.getAll();
    if (existingMetadata.length > 0) {
      console.log('Dados já existem no banco, pulando seed...');
      return;
    }

    // Inserir metadados dos ativos
    console.log('Inserindo metadados dos ativos...');
    for (const [ticker, metadata] of Object.entries(assetMetadata)) {
      await assetMetadataService.create({
        ticker: metadata.ticker,
        nome: metadata.nome,
        tipo: metadata.tipo as any,
        pais: metadata.pais as any,
        moeda: metadata.moeda as any,
        setor: metadata.setor,
        subsetor: metadata.subsetor,
        segmento: metadata.segmento,
        liquidez: metadata.liquidez,
        categoria_dy: metadata.categoria_dy,
        benchmark: metadata.benchmark,
        isin: metadata.isin,
        cnpj: metadata.cnpj,
        gestora: metadata.gestora,
        descricao: metadata.descricao,
        site_oficial: metadata.site_oficial,
        cor_tema: metadata.cor_tema
      });
    }

    // Inserir dados de investimentos
    console.log('Inserindo dados de investimentos...');
    for (const [ticker, investments] of Object.entries(portfolioData)) {
      for (const investment of investments) {
        // Determinar tipo baseado nos valores
        let tipo: 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS' | 'DESDOBRAMENTO' = 'COMPRA';
        let quantidade = 0;
        let valor_unitario = 0;
        let dividendos = 0;
        let juros = 0;

        if (investment.compra > 0) {
          tipo = 'COMPRA';
          quantidade = investment.compra;
          valor_unitario = investment.valorUnit;
        } else if (investment.venda > 0) {
          tipo = 'VENDA';
          quantidade = investment.venda;
          valor_unitario = investment.valorUnit;
        } else if (investment.dividendos > 0) {
          tipo = 'DIVIDENDO';
          dividendos = investment.dividendos;
          juros = investment.juros;
        } else if (investment.juros > 0) {
          tipo = 'JUROS';
          juros = investment.juros;
        } else if (investment.obs.toLowerCase().includes('desdobramento')) {
          tipo = 'DESDOBRAMENTO';
          quantidade = investment.compra;
        }

        await investmentService.create({
          ticker,
          data: investment.data,
          tipo,
          quantidade,
          valor_unitario,
          dividendos,
          juros,
          impostos: investment.impostos || 0,
          observacoes: investment.obs
        });
      }
    }

    console.log('Seed do banco de dados concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o seed:', error);
    // Não lançar erro para não bloquear a aplicação
  }
};