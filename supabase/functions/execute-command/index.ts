import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data, isVoice, userId } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Ação não especificada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Executando comando:', action, data);

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Usar o userId fornecido no body ou tentar extrair do token
    let user_id = userId;

    if (!user_id) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            user_id = user.id;
          }
        } catch (e) {
          console.error('Token authentication failed:', e.message);
        }
      }

      // Fallback para user padrão se nenhum ID for fornecido
      if (!user_id) {
        user_id = '4362da88-d01c-4ffe-a447-75751ea8e182'; // User ID do Erasmo (dados originais)
      }
    }

    let result;
    let message = '';

    // Para comandos de consulta, usar o cognitive-core
    const consultCommands = ['consult_portfolio', 'query_asset', 'query_income', 'generate_report', 'market_analysis'];

    if (consultCommands.includes(action)) {
      // Criar pergunta adequada baseada na ação
      let question = '';

      switch (action) {
        case 'consult_portfolio':
          question = "Faça uma análise completa do meu portfólio incluindo: valor total investido, valor atual de mercado, rentabilidade percentual, principais posições (com quantidade e preço médio), total de dividendos e juros recebidos, yield on cost médio. Formate a resposta de forma clara e profissional.";
          break;

        case 'query_asset':
          if (data?.ticker) {
            question = `Analise detalhadamente minha posição em ${data.ticker} incluindo: quantidade de ações/cotas, preço médio de compra, valor total investido, cotação atual, rentabilidade, dividendos recebidos, yield on cost. Se houver notícias recentes relevantes, inclua na análise.`;
          } else {
            question = "Por favor, especifique qual ativo você deseja consultar.";
          }
          break;

        case 'query_income':
          question = "Analise todos os proventos (dividendos e juros) que recebi, mostrando: total geral recebido, breakdown por ativo, yield on cost médio da carteira, maiores pagadores de proventos. Inclua análise de tendência se possível.";
          break;

        case 'generate_report':
          question = "Gere um relatório completo do meu portfólio incluindo: resumo executivo, análise de diversificação por setor e tipo de ativo, performance vs benchmarks (Ibovespa, CDI), análise de risco, principais contribuidores de rentabilidade, recomendações estratégicas baseadas no cenário atual.";
          break;

        case 'market_analysis':
          if (data?.ticker) {
            question = `Faça uma análise de mercado completa para ${data.ticker} incluindo: cotação atual, variação do dia e YTD, volume de negociação, análise técnica básica, notícias recentes relevantes, sentimento do mercado. Compare com minha posição se houver.`;
          } else {
            question = "Faça uma análise geral do mercado brasileiro incluindo: principais índices (Ibovespa, IFIX), setores em destaque, principais altas e baixas, notícias relevantes do dia, sentimento geral do mercado.";
          }
          break;
      }

      try {
        // Chamar o cognitive-core
        const { data: cognitiveResponse, error: cognitiveError } = await supabase.functions.invoke('cognitive-core', {
          body: { question }
        });

        if (cognitiveError) {
          throw new Error(`Erro ao processar análise: ${cognitiveError.message}`);
        }

        message = cognitiveResponse.response || "Análise processada com sucesso.";
        result = {
          success: true,
          analysis: cognitiveResponse.response,
          action: action,
          data: data
        };

      } catch (error) {
        console.error('Erro ao chamar cognitive-core:', error);
        message = `❌ Erro ao processar análise: ${error.message}`;
        result = { success: false, error: error.message };
      }

    } else {
      // Para comandos de ação (add_investment, sell_investment, etc), manter lógica original
      switch (action) {
        case 'add_investment':
          try {
            const { ticker, quantidade, valor_unitario, tipo = 'COMPRA' } = data;

            if (!ticker || !quantidade || !valor_unitario) {
              throw new Error('Dados incompletos para adicionar investimento');
            }

            // Calcular valor total
            const valor_total = quantidade * valor_unitario;

            // Inserir no banco
            const { data: inserted, error: insertError } = await supabase
              .from('investments')
              .insert({
                ticker: ticker.toUpperCase(),
                compra: tipo === 'COMPRA' ? quantidade : 0,
                venda: tipo === 'VENDA' ? quantidade : 0,
                valor_unit: valor_unitario,
                valor_total: valor_total,
                date: new Date().toISOString().split('T')[0],
                dividendos: 0,
                juros: 0,
                impostos: 0,
                observacoes: `Adicionado via ${isVoice ? 'comando de voz' : 'comando de texto'}`,
                user_id: user_id
              })
              .select();

            if (insertError) {
              throw new Error(`Erro ao inserir investimento: ${insertError.message}`);
            }

            message = `✅ ${tipo} registrada com sucesso! ${quantidade} ${ticker.toUpperCase()} por R$ ${valor_unitario.toFixed(2)} cada. Total: R$ ${valor_total.toFixed(2)}`;
            result = { success: true, ticker, quantidade, valor_unitario, tipo, valor_total };

          } catch (error) {
            console.error('Erro ao adicionar investimento:', error);
            message = `❌ Erro ao adicionar investimento: ${error.message}`;
            result = { success: false, error: error.message };
          }
          break;

        case 'sell_investment':
          try {
            const { ticker, quantidade, valor_unitario } = data;

            if (!ticker || !quantidade || !valor_unitario) {
              throw new Error('Dados incompletos para registrar venda');
            }

            const valor_total = quantidade * valor_unitario;

            // Inserir venda no banco
            const { error: insertError } = await supabase
              .from('investments')
              .insert({
                ticker: ticker.toUpperCase(),
                compra: 0,
                venda: quantidade,
                valor_unit: valor_unitario,
                valor_total: valor_total,
                date: new Date().toISOString().split('T')[0],
                dividendos: 0,
                juros: 0,
                impostos: 0,
                observacoes: `Venda via ${isVoice ? 'comando de voz' : 'comando de texto'}`,
                user_id: user_id
              });

            if (insertError) {
              throw new Error(`Erro ao registrar venda: ${insertError.message}`);
            }

            message = `📉 Venda registrada! ${quantidade} ${ticker.toUpperCase()} por R$ ${valor_unitario.toFixed(2)} cada. Total: R$ ${valor_total.toFixed(2)}`;
            result = { success: true, ticker, quantidade, valor_unitario, tipo: 'VENDA', valor_total };

          } catch (error) {
            console.error('Erro ao registrar venda:', error);
            message = `❌ Erro ao registrar venda: ${error.message}`;
            result = { success: false, error: error.message };
          }
          break;

        case 'add_dividend':
        case 'add_interest':
          try {
            const { ticker, valor } = data;
            const tipo = action === 'add_dividend' ? 'dividendos' : 'juros';

            if (!ticker || !valor) {
              throw new Error(`Dados incompletos para adicionar ${tipo}`);
            }

            // Inserir provento
            const insertData: any = {
              ticker: ticker.toUpperCase(),
              compra: 0,
              venda: 0,
              valor_unit: 0,
              valor_total: 0,
              date: new Date().toISOString().split('T')[0],
              dividendos: 0,
              juros: 0,
              impostos: 0,
              observacoes: `${tipo} via ${isVoice ? 'comando de voz' : 'comando de texto'}`,
              user_id: user_id
            };

            // Definir o campo correto
            insertData[tipo] = valor;

            const { error: insertError } = await supabase
              .from('investments')
              .insert(insertData);

            if (insertError) {
              throw new Error(`Erro ao registrar ${tipo}: ${insertError.message}`);
            }

            message = `💰 ${tipo === 'dividendos' ? 'Dividendo' : 'Juros/JCP'} registrado! R$ ${valor.toFixed(2)} de ${ticker.toUpperCase()}`;
            result = { success: true, ticker, valor, tipo: tipo.toUpperCase() };

          } catch (error) {
            console.error(`Erro ao adicionar ${action}:`, error);
            message = `❌ Erro ao registrar provento: ${error.message}`;
            result = { success: false, error: error.message };
          }
          break;

        default:
          message = `❓ Comando não reconhecido: ${action}`;
          result = { success: false, error: 'Comando não reconhecido' };
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        message,
        result,
        isVoice
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao executar comando:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno no processamento',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});