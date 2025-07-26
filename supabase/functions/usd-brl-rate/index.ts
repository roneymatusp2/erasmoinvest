// functions/usd-brl-rate/index.ts
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  // CORS pre‑flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    /* 🔑 opcional: se quiser usar exchangerate-api.com com chave
       const key = Deno.env.get('EXCHANGE_RATE_API_KEY');
       if (key) { ... } */ // serviço gratuito, sem chave (ECB) --------------------------
    const r = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=BRL');
    if (!r.ok) throw new Error(`exchangerate.host ${r.status}`);
    const j = await r.json();
    const rate = j.rates?.BRL;
    if (!rate) throw new Error('campo rate ausente');
    return new Response(JSON.stringify({
      success: true,
      rate,
      inverse: 1 / rate,
      lastUpdated: j.date
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Edge usd‑brl‑rate:', err);
    // fallback controlado
    const fallback = 5.5;
    return new Response(JSON.stringify({
      success: false,
      rate: fallback,
      inverse: 1 / fallback,
      error: err.message,
      lastUpdated: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
