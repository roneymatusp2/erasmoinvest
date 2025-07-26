import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Usaremos a mesma chave da Mistral para texto e áudio, conforme a nova arquitetura
const MISTRAL_API_KEY = Deno.env.get('ErasmoInvest_API_MISTRAL_text');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!MISTRAL_API_KEY) {
      throw new Error('A variável de ambiente ErasmoInvest_API_MISTRAL_text não está configurada.');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('Nenhum arquivo de áudio foi encontrado no corpo da requisição com a chave `audio`.');
    }

    console.log(`🎤 Recebido arquivo: ${audioFile.name}, ${audioFile.size} bytes. Transcrevendo com Voxtral...`);

    const mistralFormData = new FormData();
    mistralFormData.append('file', audioFile, audioFile.name);
    mistralFormData.append('model', 'voxtral-mini-latest');
    // O prompt ajuda a guiar o modelo para o contexto correto
    mistralFormData.append('prompt', 'O áudio contém um comando para um assistente financeiro sobre ações e investimentos no Brasil, mencionando tickers como PETR4, VALE3, HGLG11, MXRF11.');
    mistralFormData.append('language', 'pt');
    mistralFormData.append('response_format', 'json');

    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: mistralFormData,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Erro da API da Mistral (Voxtral):', errorBody);
      throw new Error(`Falha na transcrição: ${errorBody.error.message}`);
    }

    const { text: transcription } = await response.json();

    // Normaliza tickers (ex: HGLG 11 -> HGLG11)
    const normalizedTranscription = transcription.replace(/([A-Z]{4}) (\d{1,2})/g, '$1$2');

    console.log('✅ Transcrição Voxtral concluída:', normalizedTranscription);

    return new Response(JSON.stringify({
      success: true,
      transcription: normalizedTranscription,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro fatal na função transcribe-audio:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ocorreu um erro interno no servidor de transcrição.',
      details: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
