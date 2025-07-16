const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (usar variáveis de ambiente)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Responder a preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    console.log('Executando comando...');

    // Parse do body
    let commandData;
    
    try {
      const body = JSON.parse(event.body);
      commandData = body;
    } catch (parseError) {
      console.error('Erro ao fazer parse do body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato de dados inválido' })
      };
    }

    const { action, data } = commandData;

    if (!action || !data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ação ou dados não fornecidos' })
      };
    }

    console.log('Executando ação:', action, 'com dados:', data);

    let result;

    switch (action) {
      case 'add_investment':
        result = await addInvestment(data);
        break;
        
      case 'query_portfolio':
        result = await queryPortfolio(data);
        break;
        
      case 'query_asset':
        result = await queryAsset(data);
        break;
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Ação não suportada: ' + action })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action: action,
        result: result
      })
    };

  } catch (error) {
    console.error('Erro na execução:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno na execução',
        details: error.message
      })
    };
  }
};

// Função para adicionar investimento
async function addInvestment(data) {
  const { ticker, quantity, price, date, type } = data;
  
  // Preparar dados para inserção
  const investmentData = {
    ticker: ticker.toUpperCase(),
    compra: parseFloat(quantity),
    venda: 0,
    valor_unit: parseFloat(price),
    data: date,
    dividendos: 0,
    juros: 0,
    impostos: 0,
    obs: `COMPRA VIA COMANDO DE VOZ - ${quantity} ${type === 'acao' ? 'AÇÕES' : 'COTAS'}`,
    user_id: 'erasmo_russo', // ID fixo para o usuário principal
    created_at: new Date().toISOString()
  };

  console.log('Inserindo investimento:', investmentData);

  // Inserir no Supabase
  const { data: insertedData, error } = await supabase
    .from('investments')
    .insert([investmentData])
    .select();

  if (error) {
    console.error('Erro ao inserir investimento:', error);
    throw new Error('Falha ao salvar investimento: ' + error.message);
  }

  console.log('Investimento inserido com sucesso:', insertedData);

  return {
    message: `Investimento adicionado com sucesso: ${quantity} ${type === 'acao' ? 'ações' : 'cotas'} de ${ticker} a R$ ${price}`,
    investment_id: insertedData[0]?.id,
    total_value: quantity * price,
    data: insertedData[0]
  };
}

// Função para consultar portfólio
async function queryPortfolio(data) {
  const { query_type } = data;

  console.log('Consultando portfólio, tipo:', query_type);

  // Buscar todos os investimentos
  const { data: investments, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', 'erasmo_russo');

  if (error) {
    console.error('Erro ao consultar investimentos:', error);
    throw new Error('Falha ao consultar portfólio: ' + error.message);
  }

  // Agrupar por ticker e calcular estatísticas
  const portfolio = {};
  let totalInvested = 0;

  investments.forEach(inv => {
    if (!portfolio[inv.ticker]) {
      portfolio[inv.ticker] = {
        ticker: inv.ticker,
        totalShares: 0,
        totalInvested: 0,
        transactions: []
      };
    }

    const shares = (inv.compra || 0) - (inv.venda || 0);
    const value = shares * (inv.valor_unit || 0);

    portfolio[inv.ticker].totalShares += shares;
    portfolio[inv.ticker].totalInvested += value;
    portfolio[inv.ticker].transactions.push(inv);
    
    totalInvested += value;
  });

  const portfolioArray = Object.values(portfolio).filter(p => p.totalShares > 0);

  switch (query_type) {
    case 'total_value':
      return {
        message: `Valor total investido: R$ ${totalInvested.toFixed(2)}`,
        total_invested: totalInvested,
        active_assets: portfolioArray.length
      };

    case 'assets':
      return {
        message: `Você possui ${portfolioArray.length} ativos ativos`,
        assets: portfolioArray.map(p => ({
          ticker: p.ticker,
          shares: p.totalShares,
          invested: p.totalInvested
        }))
      };

    case 'summary':
    default:
      return {
        message: `Portfólio: ${portfolioArray.length} ativos, R$ ${totalInvested.toFixed(2)} investidos`,
        summary: {
          total_invested: totalInvested,
          active_assets: portfolioArray.length,
          assets: portfolioArray.map(p => ({
            ticker: p.ticker,
            shares: p.totalShares,
            invested: p.totalInvested
          }))
        }
      };
  }
}

// Função para consultar ativo específico
async function queryAsset(data) {
  const { ticker } = data;
  const upperTicker = ticker.toUpperCase();

  console.log('Consultando ativo:', upperTicker);

  // Buscar investimentos do ticker específico
  const { data: investments, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', 'erasmo_russo')
    .eq('ticker', upperTicker);

  if (error) {
    console.error('Erro ao consultar ativo:', error);
    throw new Error('Falha ao consultar ativo: ' + error.message);
  }

  if (!investments || investments.length === 0) {
    return {
      message: `Nenhum investimento encontrado para ${upperTicker}`,
      found: false
    };
  }

  // Calcular estatísticas do ativo
  let totalShares = 0;
  let totalInvested = 0;

  investments.forEach(inv => {
    const shares = (inv.compra || 0) - (inv.venda || 0);
    const value = shares * (inv.valor_unit || 0);
    
    totalShares += shares;
    totalInvested += value;
  });

  const avgPrice = totalShares > 0 ? totalInvested / totalShares : 0;

  return {
    message: `${upperTicker}: ${totalShares} ${totalShares === 1 ? 'ação' : 'ações'}, R$ ${totalInvested.toFixed(2)} investidos, preço médio R$ ${avgPrice.toFixed(2)}`,
    asset: {
      ticker: upperTicker,
      total_shares: totalShares,
      total_invested: totalInvested,
      average_price: avgPrice,
      transactions_count: investments.length
    },
    found: true
  };
} 