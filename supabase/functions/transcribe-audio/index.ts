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
    const { audioBase64, provider = 'openai' } = await req.json();
    
    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Áudio não encontrado no request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Áudio base64 recebido, tamanho:', audioBase64.length, 'provider:', provider);

    // Convert base64 to buffer
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    let transcription = '';
    let confidence = 0.95;
    
    if (provider === 'openai' || provider === 'default') {
      // Create FormData for OpenAI Whisper API
      const formData = new FormData();
      const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      formData.append('response_format', 'json');
      formData.append('temperature', '0.2');
      formData.append('prompt', 'Transcreva em português brasileiro. O áudio pode conter comandos sobre investimentos, ações, FIIs, dividendos.');

      // Call OpenAI Whisper API
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
      transcription = transcriptionData.text;
      
    } else if (provider === 'mistral') {
      // Mistral não tem API de transcrição ainda
      // Mas podemos usar a API de chat para processar transcrições se já tivermos o texto
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Mistral AI não suporta transcrição de áudio ainda. Use provider: "openai"'
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
    
    console.log('Transcrição completa:', transcription);
    
    // Pós-processar transcrição para melhorar qualidade
    transcription = postProcessTranscription(transcription);

    return new Response(
      JSON.stringify({ 
        success: true,
        transcription: transcription,
        confidence: confidence,
        provider: provider === 'default' ? 'openai' : provider
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

// Função para pós-processar transcrição
function postProcessTranscription(text: string): string {
  // Remover espaços extras
  text = text.trim().replace(/\s+/g, ' ');
  
  // Corrigir tickers comuns que podem ser mal transcritos
  const tickerCorrections = {
    'hglg 11': 'HGLG11',
    'xplg 11': 'XPLG11',
    'mxrf 11': 'MXRF11',
    'knri 11': 'KNRI11',
    'hgre 11': 'HGRE11',
    'bcff 11': 'BCFF11',
    'pvbi 11': 'PVBI11',
    'vilg 11': 'VILG11',
    'btlg 11': 'BTLG11',
    'hgbs 11': 'HGBS11',
    'petr 4': 'PETR4',
    'vale 3': 'VALE3',
    'itub 4': 'ITUB4',
    'bbdc 4': 'BBDC4',
    'wege 3': 'WEGE3',
    'itsa 4': 'ITSA4',
    'bbas 3': 'BBAS3',
    'taee 11': 'TAEE11',
    'bova 11': 'BOVA11',
    'smal 11': 'SMAL11',
    'divo 11': 'DIVO11',
    'hash 11': 'HASH11',
  };
  
  // Aplicar correções
  Object.entries(tickerCorrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(wrong, 'gi');
    text = text.replace(regex, correct);
  });
  
  // Corrigir palavras comuns em comandos de investimento
  const wordCorrections = {
    'compre': 'comprei',
    'vende': 'vendi',
    'adiciona': 'adicione',
    'registra': 'registre',
    'real': 'reais',
    'ação': 'ações',
    'dividendo': 'dividendos',
  };
  
  Object.entries(wordCorrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    text = text.replace(regex, correct);
  });
  
  // Garantir que números decimais usem ponto
  text = text.replace(/(\d+),(\d+)/g, '$1.$2');
  
  return text;
} 