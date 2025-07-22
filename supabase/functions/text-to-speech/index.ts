import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { text, voice = 'pt-BR-FranciscaNeural', provider = 'openai' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Texto não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gerando fala para:', text, 'com voz:', voice, 'provider:', provider);

    let audioBase64 = '';
    
    // Por enquanto mantemos OpenAI como principal já que Mistral não tem TTS nativo
    // Mas estruturamos o código para facilitar adição de outros providers
    if (provider === 'openai' || provider === 'default') {
      try {
        // Mapear vozes brasileiras para vozes OpenAI
        const openaiVoice = voice.includes('pt-BR') ? 'nova' : voice;
        
        // Chamar OpenAI TTS API
        const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_OPENAI_AUDIO')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: openaiVoice,
            response_format: 'mp3'
          })
        });

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error('Erro na OpenAI TTS:', errorText);
          throw new Error(`OpenAI TTS error: ${ttsResponse.status}`);
        }

        // Converter resposta para base64
        const audioArrayBuffer = await ttsResponse.arrayBuffer();
        audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
        
        console.log('Áudio gerado com sucesso via OpenAI, tamanho:', audioArrayBuffer.byteLength);
        
      } catch (openaiError) {
        console.error('Erro com OpenAI TTS:', openaiError);
        
        // Tentar fallback se disponível
        throw openaiError;
      }
    } else if (provider === 'mistral') {
      // Mistral AI não tem TTS nativo ainda
      // Mas mantemos a estrutura para futuras implementações
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mistral AI não suporta TTS ainda. Use provider: "openai"'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Provider "${provider}" não suportado. Use "openai" ou "default"`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        audio: audioBase64,
        format: 'mp3',
        provider: provider === 'default' ? 'openai' : provider
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao gerar fala:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno na síntese de fala',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 