import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Endpoints corrigidos: Primário (mirror estável) e Fallback (oficial do Tesouro)
const PRIMARY_URL = 'https://api.radaropcoes.com/bonds.json';
const FALLBACK_URL = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';
console.log('Função tesouro-direto-proxy iniciada.');
serve(async (req)=>{
  // Trata requisição OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  try {
    console.log(`Recebida requisição ${req.method}. Tentando API primária: ${PRIMARY_URL}`);
    // Tenta a API primária
    let resp = await fetch(PRIMARY_URL);
    if (!resp.ok) {
      console.warn(`Falha na primária (status ${resp.status}). Tentando fallback: ${FALLBACK_URL}`);
      resp = await fetch(FALLBACK_URL);
    }
    // Se ainda falhar, retorna erro claro
    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error(`Falha em ambas APIs. Status: ${resp.status}. Body: ${errorBody}`);
      return new Response(JSON.stringify({
        error: `Falha ao buscar dados das APIs: ${resp.status} - ${errorBody}`
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Retorna o JSON completo (com a lista de títulos) para o cliente
    const data = await resp.json();
    console.log('Dados obtidos com sucesso. Retornando lista completa de títulos.');
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Erro crítico na função:', error.message);
    return new Response(JSON.stringify({
      error: `Erro interno: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
