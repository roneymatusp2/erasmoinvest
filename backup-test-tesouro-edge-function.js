// Teste da Edge Function do Tesouro Direto
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjvtncdjcslnkfctqnfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdnRuY2RqY3NsbmtmY3RxbmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NzM0MDEsImV4cCI6MjA1OTU0OTQwMX0.AzALxUUvYLJJtDkvxt7efJ7bGxeKmzOs-fT5bQOndiU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTesourodireto() {
  console.log('🏛️ Testando Edge Function tesouro-direto-proxy...');
  
  try {
    const { data, error } = await supabase.functions.invoke('tesouro-direto-proxy');
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      return;
    }
    
    console.log('✅ Edge Function executada com sucesso!');
    console.log('📊 Estrutura da resposta:', Object.keys(data));
    
    if (data.response?.TrsrBdTradgList) {
      const titulos = data.response.TrsrBdTradgList;
      console.log(`📋 ${titulos.length} títulos encontrados`);
      
      // Procurar por SELIC 2026
      const selic2026 = titulos.find(t => 
        t.TrsrBd?.nm?.includes('SELIC') && t.TrsrBd?.nm?.includes('2026')
      );
      
      if (selic2026) {
        console.log('🎯 Encontrado SELIC 2026:');
        console.log('   Nome:', selic2026.TrsrBd.nm);
        console.log('   Valor Unitário:', selic2026.TrsrBd.untrRedVal);
        console.log('   Investimento Mínimo:', selic2026.TrsrBd.minInvstmtAmt);
        console.log('   Vencimento:', selic2026.TrsrBd.mtrtyDt);
      } else {
        console.log('⚠️ SELIC 2026 não encontrado');
        console.log('📋 Primeiros 5 títulos disponíveis:');
        titulos.slice(0, 5).forEach(t => {
          console.log(`   - ${t.TrsrBd?.nm} (${t.TrsrBd?.untrRedVal})`);
        });
      }
    } else {
      console.log('❌ Estrutura inesperada da resposta');
      console.log('📋 Dados recebidos:', JSON.stringify(data, null, 2));
    }
    
  } catch (err) {
    console.error('❌ Erro ao testar Edge Function:', err);
  }
}

async function testUSDBRL() {
  console.log('💱 Testando Edge Function usd-brl-rate...');
  
  try {
    const { data, error } = await supabase.functions.invoke('usd-brl-rate');
    
    if (error) {
      console.error('❌ Erro na Edge Function USD-BRL:', error);
      return;
    }
    
    console.log('✅ Edge Function USD-BRL executada com sucesso!');
    console.log('💲 Taxa de câmbio:', data.rate);
    console.log('📅 Última atualização:', data.lastUpdated);
    
  } catch (err) {
    console.error('❌ Erro ao testar Edge Function USD-BRL:', err);
  }
}

// Executar testes
console.log('🚀 Iniciando testes das Edge Functions...');
await testTesourodireto();
await testUSDBRL();
console.log('✅ Testes concluídos!');
