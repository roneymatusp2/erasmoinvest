// /supabase/functions/commons/tools.ts
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js';
import { generateEmbedding } from './embedding_service.ts';

export async function getPortfolioData(supabaseClient: SupabaseClient, userId: string = '4362da88-d01c-4ffe-a447-75751ea8e182') {
  console.log(`Ferramenta: Buscando dados do portfólio para user_id: ${userId}...`);
  // Filtrar por user_id específico
  const { data, error } = await supabaseClient
    .from('investments')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error("Erro em getPortfolioData:", error);
    return [];
  }
  return data || [];
}

export async function getMarketData(tickers: string[]) {
  console.log(`Ferramenta: Buscando dados de mercado para ${tickers.join(', ')}...`);
  const apiKey = Deno.env.get('VITE_BRAPI_API_KEY');
  const response = await fetch(`https://brapi.dev/api/quote/${tickers.join(',')}?token=${apiKey}`);
  const data = await response.json();
  return data.results;
}

export async function queryKnowledgeGraph(supabaseClient: SupabaseClient, userQuestion: string) {
  console.log("Ferramenta: Buscando no Grafo de Conhecimento...");
  const questionEmbedding = await generateEmbedding(userQuestion);

  // Executa uma busca por similaridade vetorial nos nós
  const { data, error } = await supabaseClient.rpc('match_nodes', {
    query_embedding: questionEmbedding,
    match_threshold: 0.75,
    match_count: 5
  });

  if (error) {
    console.error("Erro em queryKnowledgeGraph:", error);
    return { error: error.message };
  }
  return data;
}
