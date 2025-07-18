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
    // Parse JSON body for base64 audio
    const { audioBase64 } = await req.json();
    
    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Áudio não encontrado no request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Áudio base64 recebido, tamanho:', audioBase64.length);

    // Convert base64 to buffer for OpenAI
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.2');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_OPENAI')}`,
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.text();
      console.error('Erro na OpenAI Whisper API:', errorData);
      throw new Error(`OpenAI Whisper API error: ${whisperResponse.status}`);
    }

    const transcriptionData = await whisperResponse.json();
    console.log('Transcrição completa:', transcriptionData.text);

    return new Response(
      JSON.stringify({ 
        success: true,
        transcription: transcriptionData.text,
        confidence: 0.95
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno na transcrição',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
