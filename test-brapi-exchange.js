// Teste da API de Câmbio - BRAPI
// Execute este arquivo no console do navegador para testar

const BRAPI_API_KEY = 'iM7qSWmznjW7iNPwMEoAK4';

async function testBRAPIExchange() {
  console.log('🔄 Testando API de Câmbio BRAPI...');
  
  const url = `https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${BRAPI_API_KEY}`;
  console.log('📡 URL:', url);
  
  try {
    const response = await fetch(url);
    console.log('📊 Status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📋 Resposta completa:', data);
    
    const exchangeRate = data.currency?.[0]?.bidPrice;
    console.log('💲 Taxa de câmbio USD-BRL:', exchangeRate);
    
    if (exchangeRate) {
      const rate = parseFloat(exchangeRate);
      console.log('✅ Taxa convertida:', rate);
      console.log('🧮 Teste: $100 USD = R$', (100 * rate).toFixed(2));
      return rate;
    } else {
      console.warn('⚠️ Estrutura da resposta inesperada');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar câmbio:', error);
    return null;
  }
}

// Executar teste
testBRAPIExchange().then(rate => {
  if (rate) {
    console.log(`🎉 Teste concluído com sucesso! Taxa: ${rate}`);
  } else {
    console.log('💥 Teste falhou!');
  }
});

/* 
COMO USAR:
1. Abra o DevTools (F12) no navegador
2. Cole este código no Console
3. Pressione Enter
4. Verifique se a API retorna a taxa de câmbio corretamente

RESULTADO ESPERADO:
✅ Taxa de câmbio USD-BRL: "5.xxxx"
✅ Taxa convertida: 5.xxxx
🧮 Teste: $100 USD = R$ xxx.xx
🎉 Teste concluído com sucesso!
*/
