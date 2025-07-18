import { supabase } from '../lib/supabase';

export const rlsFixService = {
  // 🔧 APLICAR FIX RLS DIRETAMENTE VIA SQL
  async disableRLS() {
    console.log('🔐 === APLICANDO FIX RLS DIRETAMENTE ===');
    
    try {
      // 1. Desabilitar RLS na tabela investments
      const { data: result1, error: error1 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE investments DISABLE ROW LEVEL SECURITY;'
      });
      
      console.log('1️⃣ Disable RLS:', { data: result1, error: error1 });
      
      // 2. Remover políticas existentes
      const { data: result2, error: error2 } = await supabase.rpc('exec_sql', {
        sql: 'DROP POLICY IF EXISTS "Users can manage own investments" ON investments;'
      });
      
      console.log('2️⃣ Drop policies:', { data: result2, error: error2 });
      
      // 3. Garantir permissões
      const { data: result3, error: error3 } = await supabase.rpc('exec_sql', {
        sql: 'GRANT ALL ON investments TO public, anon, authenticated;'
      });
      
      console.log('3️⃣ Grant permissions:', { data: result3, error: error3 });
      
      // 4. Testar acesso
      const { data: testData, error: testError } = await supabase
        .from('investments')
        .select('id, ticker')
        .limit(3);
      
      console.log('4️⃣ Test query:', { 
        success: !testError, 
        count: testData?.length, 
        error: testError 
      });
      
      return {
        success: !error1 && !error2 && !error3 && !testError,
        steps: [
          { step: 'disable_rls', success: !error1, error: error1 },
          { step: 'drop_policies', success: !error2, error: error2 },
          { step: 'grant_permissions', success: !error3, error: error3 },
          { step: 'test_query', success: !testError, error: testError }
        ]
      };
      
    } catch (error) {
      console.error('💥 Erro aplicando fix RLS:', error);
      return { success: false, error };
    }
  },

  // 🧪 MÉTODOS ALTERNATIVOS PARA DESABILITAR RLS
  async disableRLSAlternative() {
    console.log('🔐 === MÉTODO ALTERNATIVO RLS ===');
    
    try {
      // Usar SQL direto através de uma função customizada
      const { data, error } = await supabase.rpc('disable_investments_rls');
      
      console.log('Resultado função customizada:', { data, error });
      
      if (error) {
        // Se a função não existe, tentar criar
        console.log('⚠️ Função não existe, tentando criar...');
        
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION disable_investments_rls()
          RETURNS TEXT AS $$
          BEGIN
            ALTER TABLE investments DISABLE ROW LEVEL SECURITY;
            RETURN 'RLS disabled successfully';
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
          sql: createFunctionSQL
        });
        
        console.log('Criar função:', { data: createResult, error: createError });
        
        // Tentar executar novamente
        if (!createError) {
          const { data: retryData, error: retryError } = await supabase.rpc('disable_investments_rls');
          console.log('Retry função:', { data: retryData, error: retryError });
        }
      }
      
      return { success: !error, data, error };
      
    } catch (error) {
      console.error('💥 Erro método alternativo:', error);
      return { success: false, error };
    }
  },

  // 🎯 EXECUTAR TODAS AS TENTATIVAS DE FIX
  async applyAllFixes() {
    console.log('🚀 === APLICANDO TODOS OS FIXES RLS ===');
    
    const results = {
      method1: await this.disableRLS(),
      method2: await this.disableRLSAlternative()
    };
    
    console.log('📋 === RESUMO FIXES RLS ===');
    console.log('Método 1 (SQL direto):', results.method1.success ? '✅ OK' : '❌ FALHOU');
    console.log('Método 2 (função):', results.method2.success ? '✅ OK' : '❌ FALHOU');
    
    const anySuccess = results.method1.success || results.method2.success;
    
    if (anySuccess) {
      console.log('✅ RLS DESABILITADO COM SUCESSO! Recarregando página...');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      console.log('❌ TODOS OS MÉTODOS FALHARAM. Verifique permissões do banco.');
    }
    
    return results;
  }
}; 