// Teste da API do Tesouro Direto
// Execute este arquivo no console do navegador para testar

async function testTesouroDiretoAPI() {
  console.log('🏛️ Testando API do Tesouro Direto...');
  
  const url = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/v2/tesouros.json';
  console.log('📡 URL:', url);
  
  try {
    const response = await fetch(url);
    console.log('📊 Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📋 Estrutura da resposta:', Object.keys(data));
    
    if (data.response && data.response.TrsrBdTradgList) {
      const titulos = data.response.TrsrBdTradgList;
      console.log(`📈 Total de títulos encontrados: ${titulos.length}`);
      
      // Mostrar os primeiros 5 títulos como exemplo
      console.log('🔍 Primeiros 5 títulos disponíveis:');
      titulos.slice(0, 5).forEach((titulo, index) => {
        const nome = titulo.TrsrBd?.nm;
        const valor = titulo.TrsrBd?.untrRedVal || titulo.TrsrBd?.minInvstmtAmt;
        console.log(`${index + 1}. ${nome} - R$ ${valor}`);
      });
      
      // Testar busca específica
      console.log('\\n🔎 Testando busca por palavras-chave:');
      
      const testKeys = ['SELIC', 'IPCA', 'PREFIXADO'];
      testKeys.forEach(key => {
        const found = titulos.filter(t => 
          t.TrsrBd?.nm?.toUpperCase().includes(key)
        );
        console.log(`- Títulos com "${key}": ${found.length} encontrados`);
        if (found.length > 0) {
          console.log(`  Exemplo: ${found[0].TrsrBd?.nm} - R$ ${found[0].TrsrBd?.untrRedVal}`);
        }
      });
      
      return true;
    } else {
      console.warn('⚠️ Estrutura da resposta inesperada');
      console.log('📋 Resposta completa:', data);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do Tesouro:', error);
    return false;
  }
}

// Função para testar busca específica de um título
async function testSpecificTitle(searchTerm) {
  console.log(`\\n🎯 Testando busca específica: "${searchTerm}"`);
  
  try {
    const response = await fetch('https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/v2/tesouros.json');
    const data = await response.json();
    
    const titulo = data.response?.TrsrBdTradgList?.find((t) => 
      t.TrsrBd?.nm?.includes(searchTerm) ||
      t.TrsrBd?.nm === searchTerm ||
      searchTerm.includes(t.TrsrBd?.nm)
    );
    
    if (titulo) {
      console.log('✅ Título encontrado:');
      console.log(`   Nome: ${titulo.TrsrBd?.nm}`);
      console.log(`   Valor: R$ ${titulo.TrsrBd?.untrRedVal || titulo.TrsrBd?.minInvstmtAmt}`);
      console.log(`   Vencimento: ${titulo.TrsrBd?.mtrtyDt || 'N/A'}`);
      return titulo;
    } else {
      console.log('❌ Título não encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na busca específica:', error);
    return null;
  }
}

// Executar testes
testTesouroDiretoAPI().then(success => {
  if (success) {
    console.log('\\n🎉 Teste da API do Tesouro Direto concluído com sucesso!');
    
    // Testes adicionais com termos específicos
    console.log('\\n🔬 Executando testes específicos...');
    testSpecificTitle('SELIC');
    testSpecificTitle('IPCA');
    testSpecificTitle('PREFIXADO');
  } else {
    console.log('💥 Teste da API do Tesouro Direto falhou!');
  }
});

/* 
COMO USAR:
1. Abra o DevTools (F12) no navegador
2. Cole este código no Console
3. Pressione Enter
4. Verifique se a API retorna os títulos corretamente

RESULTADO ESPERADO:
✅ Total de títulos encontrados: XX
🔍 Primeiros 5 títulos disponíveis:
1. Tesouro Selic 2029 - R$ XXX.XX
2. Tesouro IPCA+ 2029 - R$ XXX.XX
...
🎉 Teste da API do Tesouro Direto concluído com sucesso!
*/
