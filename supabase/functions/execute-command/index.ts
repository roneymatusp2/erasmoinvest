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
    const { action, data, isVoice } = await req.json();

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

    let result;
    let message = '';

    switch (action) {
      case 'add_investment':
        try {
          const { ticker, quantidade, valor_unitario, tipo } = data;
          
          if (!ticker || !quantidade || !valor_unitario) {
            throw new Error('Dados incompletos para adicionar investimento');
          }

          // Inserir no banco
          const { error: insertError } = await supabase
            .from('investments')
            .insert({
              ticker: ticker.toUpperCase(),
              compra: tipo === 'COMPRA' ? quantidade : 0,
              venda: tipo === 'VENDA' ? quantidade : 0,
              valor_unit: valor_unitario,
              data: new Date().toISOString().split('T')[0],
              dividendos: 0,
              juros: 0,
              impostos: 0,
              observacoes: `Adicionado via ${isVoice ? 'comando de voz' : 'comando de texto'}`,
              user_id: 'erasmo_russo'
            });

          if (insertError) {
            throw new Error(`Erro ao inserir investimento: ${insertError.message}`);
          }

          message = `✅ Investimento adicionado com sucesso! ${tipo} de ${quantidade} ${ticker.toUpperCase()} por R$ ${valor_unitario.toFixed(2)} cada.`;
          result = { success: true, ticker, quantidade, valor_unitario, tipo };

        } catch (error) {
          console.error('Erro ao adicionar investimento:', error);
          message = `❌ Erro ao adicionar investimento: ${error.message}`;
          result = { success: false, error: error.message };
        }
        break;

      case 'consult_portfolio':
        try {
          // Buscar todos os investimentos
          const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', 'erasmo_russo');

          if (error) {
            throw new Error(`Erro ao consultar portfólio: ${error.message}`);
          }

          // Calcular resumo
          const summary = investments.reduce((acc, inv) => {
            const valor = (inv.compra - inv.venda) * inv.valor_unit;
            acc.totalInvestido += Math.abs(valor);
            acc.totalDividendos += inv.dividendos || 0;
            acc.totalJuros += inv.juros || 0;
            acc.numAtivos++;
            return acc;
          }, { totalInvestido: 0, totalDividendos: 0, totalJuros: 0, numAtivos: 0 });

          const totalProventos = summary.totalDividendos + summary.totalJuros;
          const rendaMedia = summary.totalInvestido > 0 ? (totalProventos / summary.totalInvestido * 100) : 0;

          message = `💼 Seu portfólio: R$ ${summary.totalInvestido.toFixed(2)} investidos em ${summary.numAtivos} operações. Dividendos: R$ ${summary.totalDividendos.toFixed(2)}, Juros: R$ ${summary.totalJuros.toFixed(2)}. Yield médio: ${rendaMedia.toFixed(2)}%.`;
          result = { success: true, ...summary, rendaMedia };

        } catch (error) {
          console.error('Erro ao consultar portfólio:', error);
          message = `❌ Erro ao consultar portfólio: ${error.message}`;
          result = { success: false, error: error.message };
        }
        break;

      case 'query_asset':
        try {
          const ticker = data?.ticker?.toUpperCase();
          
          if (!ticker) {
            throw new Error('Ticker não especificado');
          }

          // Buscar investimentos do ativo específico
          const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', 'erasmo_russo')
            .eq('ticker', ticker);

          if (error) {
            throw new Error(`Erro ao consultar ativo: ${error.message}`);
          }

          if (!investments || investments.length === 0) {
            message = `📊 Você não possui investimentos em ${ticker}.`;
            result = { success: true, ticker, posicao: 0, valorInvestido: 0 };
          } else {
            const summary = investments.reduce((acc, inv) => {
              const posicao = inv.compra - inv.venda;
              const valor = posicao * inv.valor_unit;
              acc.posicaoTotal += posicao;
              acc.valorInvestido += Math.abs(valor);
              acc.dividendos += inv.dividendos || 0;
              acc.juros += inv.juros || 0;
              return acc;
            }, { posicaoTotal: 0, valorInvestido: 0, dividendos: 0, juros: 0 });

            const precoMedio = summary.posicaoTotal > 0 ? (summary.valorInvestido / summary.posicaoTotal) : 0;
            const totalProventos = summary.dividendos + summary.juros;

            message = `📊 ${ticker}: ${summary.posicaoTotal} ações, R$ ${summary.valorInvestido.toFixed(2)} investidos. Preço médio: R$ ${precoMedio.toFixed(2)}. Proventos: R$ ${totalProventos.toFixed(2)}.`;
            result = { success: true, ticker, ...summary, precoMedio };
          }

        } catch (error) {
          console.error('Erro ao consultar ativo:', error);
          message = `❌ Erro ao consultar ativo: ${error.message}`;
          result = { success: false, error: error.message };
        }
        break;

      default:
        message = `❌ Ação não reconhecida: ${action}`;
        result = { success: false, error: 'Ação não reconhecida' };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message,
        response: message,
        data: result
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
        error: 'Erro interno na execução',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 