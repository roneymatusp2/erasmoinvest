import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

    try {
    if (!GOOGLE_CLOUD_API_KEY) {
      throw new Error('A variável de ambiente GOOGLE_CLOUD_API_KEY não está configurada.');
    }

    const { text, voice = 'pt-BR-Neural2-C' } = await req.json();

    if (!text) {
      throw new Error('O parâmetro `text` é obrigatório no corpo da requisição.');
    }

    console.log(`🔊 Gerando áudio para o texto: "${text.substring(0, 70)}..." com a voz '${voice}'.`);

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: text },
        voice: { languageCode: 'pt-BR', name: voice },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Erro retornado pela API Google Cloud TTS:', errorBody);
      throw new Error(`Falha na geração de áudio: ${errorBody.error.details}`);
    }

    const { audioContent } = await response.json();

    console.log('✅ Áudio gerado com sucesso via Google TTS.');

    return new Response(JSON.stringify({ success: true, audio: audioContent }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro fatal na função text-to-speech:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ocorreu um erro interno no servidor de geração de áudio.',
      details: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
