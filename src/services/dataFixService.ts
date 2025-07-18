import { supabase } from '../lib/supabase';
import { currencyService } from './currencyService';

export interface DataValidationResult {
  ticker: string;
  issues: string[];
  fixes: string[];
  oldData: any;
  newData: any;
}

// 🔧 SERVIÇO DE CORREÇÃO E VALIDAÇÃO DE DADOS
export const dataFixService = {
  // 📊 Validar e corrigir quantidades dos ativos
  async validateAndFixQuantities(userId: string): Promise<DataValidationResult[]> {
    try {
      console.log('🔧 === INICIANDO VALIDAÇÃO DE QUANTIDADES ===');
      
      const results: DataValidationResult[] = [];
      
      // Buscar todos os investimentos do usuário
      const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('ticker, date');
      
      if (error) throw error;
      
      // Agrupar por ticker
      const investmentsByTicker = new Map<string, any[]>();
      
      investments?.forEach(inv => {
        if (!investmentsByTicker.has(inv.ticker)) {
          investmentsByTicker.set(inv.ticker, []);
        }
        investmentsByTicker.get(inv.ticker)!.push(inv);
      });
      
      // Validar cada ticker
      for (const [ticker, tickerInvestments] of investmentsByTicker) {
        const result: DataValidationResult = {
          ticker,
          issues: [],
          fixes: [],
          oldData: {},
          newData: {}
        };
        
        // Calcular posição atual corretamente
        let calculatedPosition = 0;
        let totalCompras = 0;
        let totalVendas = 0;
        let valorTotalCompra = 0;
        let valorTotalVenda = 0;
        
        tickerInvestments.forEach(inv => {
          const compra = Number(inv.compra) || 0;
          const venda = Number(inv.venda) || 0;
          const valorUnit = Number(inv.valor_unit) || 0;
          
          totalCompras += compra;
          totalVendas += venda;
          
          if (compra > 0) {
            calculatedPosition += compra;
            valorTotalCompra += compra * valorUnit;
          }
          
          if (venda > 0) {
            calculatedPosition -= venda;
            valorTotalVenda += venda * valorUnit;
          }
          
          // Verificar valores inconsistentes
          if (compra > 10000 && !ticker.startsWith('TESOURO_')) {
            result.issues.push(`Quantidade de compra suspeita: ${compra} em ${inv.date}`);
          }
          
          if (venda > 10000 && !ticker.startsWith('TESOURO_')) {
            result.issues.push(`Quantidade de venda suspeita: ${venda} em ${inv.date}`);
          }
        });
        
        // Armazenar dados calculados
        result.oldData = {
          totalCompras,
          totalVendas,
          calculatedPosition,
          valorTotalCompra,
          valorTotalVenda
        };
        
        result.newData = {
          saldoAtual: calculatedPosition,
          valorInvestidoLiquido: valorTotalCompra - valorTotalVenda
        };
        
        // Verificar se é o DVN com problema
        if (ticker === 'DVN' && calculatedPosition > 1000) {
          result.issues.push(`⚠️ Posição muito alta: ${calculatedPosition} ações`);
          result.fixes.push('Verificar se há erro de decimal nas quantidades');
          
          // Tentar corrigir dividindo por 1000 se parecer erro de decimal
          if (calculatedPosition > 10000) {
            const corrigida = calculatedPosition / 1000;
            result.newData.saldoAtualCorrigido = corrigida;
            result.fixes.push(`Posição corrigida: ${corrigida.toFixed(3)} ações`);
          }
        }
        
        console.log(`📊 ${ticker}: Posição calculada = ${calculatedPosition}`);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Erro na validação:', error);
      throw error;
    }
  },
  
  // 💱 Validar conversões USD/BRL
  async validateCurrencyConversions(userId: string): Promise<any> {
    try {
      console.log('💱 === VALIDANDO CONVERSÕES USD/BRL ===');
      
      // Buscar resumo por moeda
      const { data: summaries, error } = await supabase
        .from('investment_summary')
        .select('*')
        .eq('user_id', userId)
        .order('ticker');
      
      if (error) throw error;
      
      const exchangeRate = await currencyService.getUSDToBRLRate();
      console.log(`💱 Taxa de câmbio atual: R$ ${exchangeRate.rate.toFixed(4)}`);
      
      const validationResults = {
        exchangeRate: exchangeRate.rate,
        totalBRL: 0,
        totalUSD: 0,
        totalUSDConvertido: 0,
        totalGeral: 0,
        assets: [] as any[]
      };
      
      for (const summary of summaries || []) {
        const isUSAsset = currencyService.isUSAsset(summary.ticker);
        const valorInvestido = Number(summary.valor_total_compra) - Number(summary.valor_total_venda);
        
        if (isUSAsset) {
          // Ativo americano
          const asset = {
            ticker: summary.ticker,
            currency: 'USD',
            valorOriginal: valorInvestido,
            valorConvertidoBRL: 0,
            posicao: Number(summary.saldo_atual),
            precoMedio: Number(summary.preco_medio)
          };
          
          // Se o valor já está em BRL no banco (não deve converter novamente)
          if (summary.currency === 'BRL') {
            asset.valorConvertidoBRL = valorInvestido;
            console.log(`✅ ${summary.ticker}: Valor já em BRL: R$ ${valorInvestido.toFixed(2)}`);
          } else {
            // Converter USD para BRL
            const { brlAmount } = await currencyService.convertUSDToBRL(valorInvestido);
            asset.valorConvertidoBRL = brlAmount;
            console.log(`💱 ${summary.ticker}: $${valorInvestido.toFixed(2)} → R$ ${brlAmount.toFixed(2)}`);
          }
          
          validationResults.totalUSD += valorInvestido;
          validationResults.totalUSDConvertido += asset.valorConvertidoBRL;
          validationResults.assets.push(asset);
        } else {
          // Ativo brasileiro
          validationResults.totalBRL += valorInvestido;
          console.log(`🇧🇷 ${summary.ticker}: R$ ${valorInvestido.toFixed(2)}`);
        }
      }
      
      validationResults.totalGeral = validationResults.totalBRL + validationResults.totalUSDConvertido;
      
      console.log('💰 === RESUMO CONVERSÕES ===');
      console.log(`🇧🇷 Total BRL: R$ ${validationResults.totalBRL.toFixed(2)}`);
      console.log(`🇺🇸 Total USD: $ ${validationResults.totalUSD.toFixed(2)}`);
      console.log(`💱 Total USD→BRL: R$ ${validationResults.totalUSDConvertido.toFixed(2)}`);
      console.log(`💰 TOTAL GERAL: R$ ${validationResults.totalGeral.toFixed(2)}`);
      
      return validationResults;
    } catch (error) {
      console.error('❌ Erro na validação de moedas:', error);
      throw error;
    }
  },
  
  // 📊 Recalcular totais do portfólio
  async recalculatePortfolioTotals(userId: string): Promise<any> {
    try {
      console.log('📊 === RECALCULANDO TOTAIS DO PORTFÓLIO ===');
      
      const { data: summaries, error } = await supabase
        .from('investment_summary')
        .select('*')
        .eq('user_id', userId)
        .gt('saldo_atual', 0)
        .order('ticker');
      
      if (error) throw error;
      
      const totals = {
        numeroAtivos: 0,
        totalInvestidoBRL: 0,
        totalDividendos: 0,
        totalJuros: 0,
        totalImpostos: 0,
        totalProventos: 0,
        ativosPorTipo: new Map<string, number>(),
        detalhesPorAtivo: [] as any[]
      };
      
      const exchangeRate = await currencyService.getUSDToBRLRate();
      
      for (const summary of summaries || []) {
        const ticker = summary.ticker;
        const isUSAsset = currencyService.isUSAsset(ticker);
        const saldoAtual = Number(summary.saldo_atual);
        
        // Pular ativos com saldo zero ou negativo
        if (saldoAtual <= 0) continue;
        
        totals.numeroAtivos++;
        
        // Calcular valor investido líquido
        const valorCompra = Number(summary.valor_total_compra) || 0;
        const valorVenda = Number(summary.valor_total_venda) || 0;
        let valorInvestidoLiquido = valorCompra - valorVenda;
        
        // Se é ativo americano e está em USD, converter para BRL
        if (isUSAsset && summary.currency === 'USD') {
          const { brlAmount } = await currencyService.convertUSDToBRL(valorInvestidoLiquido);
          valorInvestidoLiquido = brlAmount;
          console.log(`💱 ${ticker}: Convertendo $${(valorCompra - valorVenda).toFixed(2)} → R$ ${brlAmount.toFixed(2)}`);
        }
        
        totals.totalInvestidoBRL += valorInvestidoLiquido;
        totals.totalDividendos += Number(summary.total_dividendos) || 0;
        totals.totalJuros += Number(summary.total_juros) || 0;
        totals.totalImpostos += Number(summary.total_impostos) || 0;
        
        // Determinar tipo do ativo
        let tipo = 'ACAO';
        if (ticker.endsWith('11')) tipo = 'FII';
        else if (isUSAsset) tipo = ticker === 'O' ? 'REIT' : 'STOCK';
        else if (ticker.startsWith('TESOURO_')) tipo = 'TESOURO_DIRETO';
        
        // Contar por tipo
        totals.ativosPorTipo.set(tipo, (totals.ativosPorTipo.get(tipo) || 0) + 1);
        
        // Adicionar detalhes
        totals.detalhesPorAtivo.push({
          ticker,
          tipo,
          saldoAtual,
          valorInvestidoLiquido,
          precoMedio: saldoAtual > 0 ? valorInvestidoLiquido / saldoAtual : 0,
          dividendos: Number(summary.total_dividendos) || 0,
          juros: Number(summary.total_juros) || 0,
          yield: valorInvestidoLiquido > 0 ? 
            ((Number(summary.total_dividendos) + Number(summary.total_juros)) / valorInvestidoLiquido * 100) : 0
        });
      }
      
      totals.totalProventos = totals.totalDividendos + totals.totalJuros;
      
      console.log('📊 === TOTAIS RECALCULADOS ===');
      console.log(`📈 Número de ativos: ${totals.numeroAtivos}`);
      console.log(`💰 Total investido: R$ ${totals.totalInvestidoBRL.toFixed(2)}`);
      console.log(`💎 Total dividendos: R$ ${totals.totalDividendos.toFixed(2)}`);
      console.log(`💰 Total juros: R$ ${totals.totalJuros.toFixed(2)}`);
      console.log(`📊 Total proventos: R$ ${totals.totalProventos.toFixed(2)}`);
      console.log(`💸 Total impostos: R$ ${totals.totalImpostos.toFixed(2)}`);
      console.log(`📈 Yield médio: ${totals.totalInvestidoBRL > 0 ? (totals.totalProventos / totals.totalInvestidoBRL * 100).toFixed(2) : 0}%`);
      
      console.log('\n📊 Ativos por tipo:');
      totals.ativosPorTipo.forEach((count, tipo) => {
        console.log(`  ${tipo}: ${count} ativos`);
      });
      
      return totals;
    } catch (error) {
      console.error('❌ Erro no recálculo:', error);
      throw error;
    }
  },
  
  // 🔧 Executar todas as validações
  async runFullValidation(userId: string = '4362da88-d01c-4ffe-a447-75751ea8e182') {
    console.log('🚀 === INICIANDO VALIDAÇÃO COMPLETA DO PORTFÓLIO ===');
    console.log(`👤 User ID: ${userId}`);
    console.log(`🕐 Horário: ${new Date().toLocaleString('pt-BR')}`);
    
    try {
      // 1. Validar quantidades
      console.log('\n📊 ETAPA 1: Validando quantidades...');
      const quantityResults = await this.validateAndFixQuantities(userId);
      
      // Mostrar problemas encontrados
      const problemasQuantidade = quantityResults.filter(r => r.issues.length > 0);
      if (problemasQuantidade.length > 0) {
        console.log('\n⚠️ PROBLEMAS ENCONTRADOS:');
        problemasQuantidade.forEach(p => {
          console.log(`\n${p.ticker}:`);
          p.issues.forEach(issue => console.log(`  - ${issue}`));
          p.fixes.forEach(fix => console.log(`  ✅ ${fix}`));
        });
      }
      
      // 2. Validar conversões
      console.log('\n💱 ETAPA 2: Validando conversões USD/BRL...');
      const currencyResults = await this.validateCurrencyConversions(userId);
      
      // 3. Recalcular totais
      console.log('\n📊 ETAPA 3: Recalculando totais...');
      const totals = await this.recalculatePortfolioTotals(userId);
      
      // Retornar resumo completo
      return {
        timestamp: new Date().toISOString(),
        userId,
        quantityValidation: quantityResults,
        currencyValidation: currencyResults,
        portfolioTotals: totals,
        summary: {
          problemasEncontrados: problemasQuantidade.length,
          totalInvestido: totals.totalInvestidoBRL,
          numeroAtivos: totals.numeroAtivos,
          taxaCambio: currencyResults.exchangeRate
        }
      };
    } catch (error) {
      console.error('❌ Erro na validação completa:', error);
      throw error;
    }
  }
};

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).dataFixService = dataFixService;
  console.log('💡 dataFixService disponível no console. Use: dataFixService.runFullValidation()');
} 