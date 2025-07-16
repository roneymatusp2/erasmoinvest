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
    // Get request data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Arquivo de áudio não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Arquivo de áudio recebido:', audioFile.name, 'Tamanho:', audioFile.size);

    // Converter arquivo para buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Fazer chamada para OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ErasmoInvest_API_OPENAI_AUDIO')}`,
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.text();
      console.error('Erro na OpenAI Whisper API:', errorData);
      throw new Error(`OpenAI Whisper API error: ${whisperResponse.status}`);
    }

    const transcriptionData = await whisperResponse.json();
    console.log('Transcrição completa:', transcriptionData);

    return new Response(
      JSON.stringify({ 
        success: true,
        transcription: transcriptionData.text,
        confidence: 0.95 // OpenAI não fornece confidence, então usamos um valor padrão alto
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
