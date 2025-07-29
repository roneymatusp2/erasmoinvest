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
    // Usar API com chave do EXCHANGERATE_API_KEY
    const key = Deno.env.get('EXCHANGERATE_API_KEY');
    if (!key) throw new Error('EXCHANGERATE_API_KEY não configurada');
    
    const r = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    if (!r.ok) throw new Error(`exchangerate-api ${r.status}`);
    const j = await r.json();
    const rate = j.rates?.BRL;
    if (!rate) throw new Error('campo BRL rate ausente');
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
