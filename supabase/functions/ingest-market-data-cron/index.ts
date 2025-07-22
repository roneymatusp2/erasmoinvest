// /supabase/functions/ingest-market-data-cron/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { generateEmbedding } from '../commons/embedding_service.ts';

const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (_req) => {
  console.log("Iniciando coleta de dados de mercado...");
  
  try {
    // 1. Buscar todos os tickers únicos do portfólio
    const { data: portfolioData, error: portfolioError } = await supabaseClient
      .from('investments')
      .select('ticker')
      .eq('asset_type', 'acao');
    
    if (portfolioError) {
      console.error("Erro ao buscar tickers do portfólio:", portfolioError);
      return new Response(JSON.stringify({ error: portfolioError.message }), { status: 500 });
    }

    // Extrai tickers únicos
    const uniqueTickers = [...new Set(portfolioData.map(item => item.ticker))];
    
    if (uniqueTickers.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum ticker encontrado no portfólio." }), { status: 200 });
    }

    console.log(`Buscando dados de mercado para: ${uniqueTickers.join(', ')}`);

    // 2. Buscar dados de mercado via BRAPI
    const apiKey = Deno.env.get('VITE_BRAPI_API_KEY');
    const marketResponse = await fetch(`https://brapi.dev/api/quote/${uniqueTickers.join(',')}?token=${apiKey}`);
    const marketData = await marketResponse.json();

    // 3. Processar e armazenar cada ticker
    for (const quote of marketData.results) {
      try {
        // Criar texto descritivo para o embedding
        const nodeText = `${quote.symbol} - ${quote.longName}. Preço atual: R$ ${quote.regularMarketPrice}. Variação: ${quote.regularMarketChangePercent}%`;
        const embedding = await generateEmbedding(nodeText);

        // Atualizar ou criar nó do ticker com dados de mercado
        await supabaseClient.from('nodes').upsert({
          id: `ticker:${quote.symbol}`,
          type: 'ticker',
          label: quote.symbol,
          properties: {
            longName: quote.longName,
            currency: quote.currency,
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: quote.regularMarketChange,
            regularMarketChangePercent: quote.regularMarketChangePercent,
            regularMarketTime: quote.regularMarketTime,
            regularMarketDayHigh: quote.regularMarketDayHigh,
            regularMarketDayLow: quote.regularMarketDayLow,
            regularMarketVolume: quote.regularMarketVolume,
            marketCap: quote.marketCap,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            priceEarnings: quote.priceEarnings,
            earningsPerShare: quote.earningsPerShare,
            logourl: quote.logourl,
            updatedAt: new Date().toISOString()
          },
          embedding: embedding,
          updated_at: new Date().toISOString()
        });

        console.log(`Dados de mercado atualizados para ${quote.symbol}`);
      } catch (error) {
        console.error(`Erro ao processar dados de ${quote.symbol}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Dados de mercado atualizados para ${marketData.results.length} tickers.` 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Erro geral na coleta de dados de mercado:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});