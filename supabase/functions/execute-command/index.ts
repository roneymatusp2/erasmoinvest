import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Executor de Ações de Banco de Dados
 * 
 * Esta função é um executor de dados puro. Ela recebe uma ação estruturada,
 * a executa diretamente no banco de dados através de RPCs ou inserções diretas,
 * e retorna os dados brutos em formato JSON, sem nenhuma formatação de string.
 * 
 * Responsabilidades:
 * - Conectar-se ao Supabase com privilégios de administrador.
 * - Validar a estrutura do comando recebido.
 * - Mapear a `action` para a chamada de banco de dados correspondente.
 * - Passar os `params` para a função de banco de dados.
 * - Retornar o resultado da operação (dados ou erro) em JSON puro.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Utiliza a SERVICE_ROLE_KEY para ter acesso total ao banco,
    // necessário para executar RPCs e modificar dados em nome do usuário.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // O corpo da requisição agora é padronizado pela nova arquitetura.
    let action = '' as string
    let params: any = {}
    try {
      const body = await req.json();
      action = body?.action ?? ''
      params = body?.params ?? {}
    } catch (_) {
      // aceitar também querystring como fallback
      const url = new URL(req.url)
      action = url.searchParams.get('action') ?? ''
      try { params = JSON.parse(url.searchParams.get('params') ?? '{}') } catch { params = {} }
    }

    if (!action) {
      throw new Error('Ação (action) é obrigatória.');
    }

    // Usar user_id correto do sistema
    const fixedUserId = '4362da88-d01c-4ffe-a447-75751ea8e182';

    let data;
    let error;

    console.log(`[execute-command] Action: ${action} for User: ${fixedUserId}`);

    switch (action) {
      // Ação para adicionar um novo registro de investimento.
      // Respeita a estrutura imutável da tabela 'investments'.
      case 'add_investment':
        // Idempotência básica: checar duplicidade por user/ticker/data/compra/valor_unit
        if (params && params.ticker && params.date && params.quantity && params.price) {
          const { data: dup } = await supabaseAdmin
            .from('investments')
            .select('id')
            .eq('user_id', fixedUserId)
            .eq('ticker', params.ticker)
            .eq('date', params.date)
            .eq('compra', params.quantity)
            .eq('valor_unit', params.price)
            .limit(1);
          if (dup && dup.length > 0) {
            return new Response(JSON.stringify({ success: true, data: { idempotent: true, existing_id: dup[0].id } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        ({ data, error } = await supabaseAdmin
          .from('investments')
          .insert({
            user_id: fixedUserId,
            ticker: params.ticker,
            date: params.date,
            compra: params.quantity,
            valor_unit: params.price,
            // Campos calculados e outros metadados são preenchidos por triggers no DB
            // ou podem ser adicionados aqui se necessário.
            observacoes: params.observation || 'Adicionado via IA',
            currency: 'BRL',
          })
          .select()
          .single()); // Retorna um único objeto em vez de um array
        break;

      // Ação para registrar uma venda de ativo.
      case 'sell_investment':
        if (params && params.ticker && params.date && params.quantity && params.price) {
          const { data: dup } = await supabaseAdmin
            .from('investments')
            .select('id')
            .eq('user_id', fixedUserId)
            .eq('ticker', params.ticker)
            .eq('date', params.date)
            .eq('venda', params.quantity)
            .eq('valor_unit', params.price)
            .limit(1);
          if (dup && dup.length > 0) {
            return new Response(JSON.stringify({ success: true, data: { idempotent: true, existing_id: dup[0].id } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        ({ data, error } = await supabaseAdmin
          .from('investments')
          .insert({
            user_id: fixedUserId,
            ticker: params.ticker,
            date: params.date,
            venda: params.quantity,
            valor_unit: params.price,
            observacoes: params.observation || 'Venda registrada via IA',
            currency: params.currency || 'BRL',
          })
          .select()
          .single());
        break;

      // Ação para registrar recebimento de proventos (dividendos/JCP)
      case 'add_dividend':
        if (params && params.ticker && params.date && params.amount) {
          const { data: dup } = await supabaseAdmin
            .from('investments')
            .select('id')
            .eq('user_id', fixedUserId)
            .eq('ticker', params.ticker)
            .eq('date', params.date)
            .eq('dividendos', params.amount)
            .limit(1);
          if (dup && dup.length > 0) {
            return new Response(JSON.stringify({ success: true, data: { idempotent: true, existing_id: dup[0].id } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        ({ data, error } = await supabaseAdmin
          .from('investments')
          .insert({
            user_id: fixedUserId,
            ticker: params.ticker,
            date: params.date,
            dividendos: params.amount,
            observacoes: params.observation || 'Provento (dividendos/JCP) via IA',
            currency: 'BRL',
          })
          .select()
          .single());
        break;

      // Ação para obter o resumo completo e agregado do portfólio.
      case 'get_portfolio_summary':
        ({ data, error } = await supabaseAdmin.rpc('get_portfolio_summary', { 
          p_user_id: fixedUserId 
        }));
        break;
        
      // Ação para obter a visão geral do portfólio com P&L.
      case 'get_portfolio_overview':
        ({ data, error } = await supabaseAdmin.rpc('get_portfolio_overview', {
          p_user_id: fixedUserId
        }));
        break;

      // Ação para obter o balanço de um ticker específico.
      // Ação para obter o balanço de um ticker específico, agora com busca case-insensitive.
      case 'get_ticker_balance':
        if (!params.ticker) throw new Error("O parâmetro 'ticker' é obrigatório para 'get_ticker_balance'.");
        ({ data, error } = await supabaseAdmin
          .from('investments')
          .select('*')
          .eq('user_id', fixedUserId)
          .ilike('ticker', `%${params.ticker}%`)); // Usar ilike para busca flexível
        break;

      // Ação para obter o histórico de transações de um ticker.
      case 'get_ticker_transactions':
        if (!params.ticker) throw new Error("O parâmetro 'ticker' é obrigatório para 'get_ticker_transactions'.");
        ({ data, error } = await supabaseAdmin.rpc('get_ticker_transactions', {
          p_user_id: fixedUserId,
          p_ticker: params.ticker,
        }));
        break;

      default:
        // Se a ação não for reconhecida, retorna um erro estruturado.
        throw new Error(`Ação '${action}' não é reconhecida pelo executor de comando.`);
    }

    if (error) {
      // Propaga o erro do banco de dados para uma depuração mais fácil.
      console.error(`[execute-command] DB Error for action ${action}:`, error);
      throw new Error(`Erro do banco de dados: ${error.message}`);
    }

    // Retorna uma resposta JSON pura e estruturada.
    return new Response(
      JSON.stringify({ success: true, data }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal na função execute-command:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ocorreu um erro interno ao executar o comando no banco de dados.',
        details: error.message,
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
