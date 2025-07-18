import { supabase } from '../lib/supabase';

export const debugService = {
  // 🔍 TESTAR CONEXÃO BÁSICA COM SUPABASE
  async testConnection() {
    console.log('🔧 === DEBUG: TESTANDO CONEXÃO SUPABASE ===');
    
    try {
      // Teste simples sem filtros
      const { data, error, count } = await supabase
        .from('investments')
        .select('*', { count: 'exact' });
      
      console.log('✅ Conexão Supabase OK');
      console.log('📊 Total registros:', count);
      console.log('📋 Primeiros 3 registros:', data?.slice(0, 3));
      
      if (error) {
        console.error('❌ Erro na query:', error);
        return { success: false, error };
      }
      
      return { success: true, data, count };
    } catch (err) {
      console.error('💥 Erro geral:', err);
      return { success: false, error: err };
    }
  },

  // 🧪 TESTAR RLS ESPECIFICAMENTE
  async testRLS() {
    console.log('🔐 === DEBUG: TESTANDO RLS STATUS ===');
    
    try {
      // Tentar acessar sem user_id (se RLS estiver ativo, falhará)
      const { data: withoutUser, error: errorWithoutUser } = await supabase
        .from('investments')
        .select('id, ticker, user_id')
        .limit(5);
      
      console.log('🔍 Query sem user_id:', {
        success: !errorWithoutUser,
        error: errorWithoutUser,
        count: withoutUser?.length || 0
      });
      
      // Tentar com user_id específico
      const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      const { data: withUser, error: errorWithUser } = await supabase
        .from('investments')
        .select('id, ticker, user_id')
        .eq('user_id', userId)
        .limit(5);
      
      console.log('👤 Query com user_id:', {
        userId,
        success: !errorWithUser,
        error: errorWithUser,
        count: withUser?.length || 0
      });
      
      return {
        rlsDisabled: !errorWithoutUser,
        withoutUserData: withoutUser,
        withUserData: withUser
      };
      
    } catch (err) {
      console.error('💥 Erro teste RLS:', err);
      return { error: err };
    }
  },

  // 📊 TESTAR CÁLCULOS DE PORTFOLIO
  async testPortfolioCalculations() {
    console.log('🧮 === DEBUG: TESTANDO CÁLCULOS PORTFOLIO ===');
    
    try {
      const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';
      
      // Buscar dados do BBAS3 especificamente
      const { data: bbas3Data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .eq('ticker', 'BBAS3')
        .order('date', { ascending: true });
      
      if (error) {
        console.error('❌ Erro buscar BBAS3:', error);
        return { error };
      }
      
      console.log('📈 BBAS3 - Total registros:', bbas3Data?.length);
      
      // Calcular manualmente
      let totalInvested = 0;
      let currentPosition = 0;
      let totalDividends = 0;
      let totalJuros = 0;
      
      bbas3Data?.forEach((investment, index) => {
        console.log(`📋 ${index + 1}. ${investment.date}:`, {
          compra: investment.compra,
          venda: investment.venda,
          valor_unit: investment.valor_unit,
          dividendos: investment.dividendos,
          juros: investment.juros
        });
        
        // Lógica de cálculo
        if (investment.compra > 0) {
          const valorCompra = investment.compra * investment.valor_unit;
          totalInvested += valorCompra;
          currentPosition += investment.compra;
          console.log(`  💰 COMPRA: ${investment.compra} x R$ ${investment.valor_unit} = R$ ${valorCompra.toFixed(2)}`);
        }
        
        if (investment.venda > 0) {
          currentPosition -= investment.venda;
          console.log(`  📤 VENDA: ${investment.venda} cotas (não diminui totalInvested)`);
        }
        
        if (investment.dividendos > 0) {
          totalDividends += investment.dividendos;
          console.log(`  💎 DIVIDENDO: R$ ${investment.dividendos.toFixed(2)}`);
        }
        
        if (investment.juros > 0) {
          totalJuros += investment.juros;
          console.log(`  💰 JUROS: R$ ${investment.juros.toFixed(2)}`);
        }
      });
      
      const calculations = {
        totalInvested: totalInvested,
        currentPosition: currentPosition,
        totalDividends: totalDividends,
        totalJuros: totalJuros,
        totalYield: totalInvested > 0 ? ((totalDividends + totalJuros) / totalInvested) * 100 : 0
      };
      
      console.log('🎯 === RESULTADOS BBAS3 ===');
      console.log('💰 Total Investido:', totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      console.log('📊 Posição Atual:', currentPosition.toLocaleString('pt-BR'), 'cotas');
      console.log('💎 Total Dividendos:', totalDividends.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      console.log('💰 Total Juros:', totalJuros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      console.log('📈 DY Total:', calculations.totalYield.toFixed(2) + '%');
      
      return { success: true, calculations, rawData: bbas3Data };
      
    } catch (err) {
      console.error('💥 Erro teste cálculos:', err);
      return { error: err };
    }
  },

  // 🚀 EXECUTAR TODOS OS TESTES + FIXES
  async runAllTests() {
    console.log('🔧 === EXECUTANDO DIAGNÓSTICO COMPLETO ===');
    
    const results: any = {
      connection: await this.testConnection(),
      rls: await this.testRLS(),
      calculations: await this.testPortfolioCalculations()
    };
    
    console.log('📋 === RESUMO DOS TESTES ===');
    console.log('✅ Conexão:', results.connection.success ? 'OK' : '❌ FALHOU');
    console.log('🔐 RLS Desabilitado:', results.rls.rlsDisabled ? 'OK' : '❌ ATIVO');
    console.log('🧮 Cálculos:', results.calculations.success ? 'OK' : '❌ FALHOU');
    
    // 🔧 SE RLS ESTIVER ATIVO, TENTAR CORRIGIR
    if (!results.rls.rlsDisabled) {
      console.log('🔐 RLS ATIVO! Tentando corrigir...');
      
      try {
        const { rlsFixService } = await import('./rlsFixService');
        const fixResults = await rlsFixService.applyAllFixes();
        results.rlsFix = fixResults;
      } catch (error) {
        console.error('💥 Erro importando rlsFixService:', error);
      }
    }
    
    return results;
  }
}; 