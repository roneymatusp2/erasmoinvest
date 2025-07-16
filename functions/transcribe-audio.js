const OpenAI = require('openai');

// Inicializar OpenAI com chave da variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.ErasmoInvest_API_OPENAI,
});

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Responder a preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    console.log('Iniciando transcrição de áudio...');
    console.log('DEBUG: Body recebido na função:', event.body);

    // Parse do body para obter o áudio em base64
    let audioBase64;
    
    try {
      const body = JSON.parse(event.body);
      audioBase64 = body.audioBase64;
    } catch (parseError) {
      console.error('Erro ao fazer parse do body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato de dados inválido' })
      };
    }

    if (!audioBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Áudio não encontrado no request' })
      };
    }

    // Converter base64 para buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log('Buffer de áudio criado, tamanho:', audioBuffer.length);

    // Criar objeto File para o Whisper
    const audioFile = new File([audioBuffer], 'audio.webm', {
      type: 'audio/webm'
    });

    console.log('Enviando para Whisper API...');

    // Transcrever com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'json',
      temperature: 0.2
    });

    console.log('Transcrição concluída:', transcription.text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transcription: transcription.text,
        confidence: transcription.confidence || 0.9
      })
    };

  } catch (error) {
    console.error('Erro na transcrição:', error);
    
    // Tratamento específico para diferentes tipos de erro
    if (error.code === 'invalid_request_error') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Formato de áudio inválido',
          details: error.message
        })
      };
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Limite de taxa excedido',
          details: 'Tente novamente em alguns segundos'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno na transcrição',
        details: error.message
      })
    };
  }
}; 