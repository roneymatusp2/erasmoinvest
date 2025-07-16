const OpenAI = require('openai');

// Inicializar OpenAI com chave da variável de ambiente
const openai = new OpenAI({
  apiKey: process.env.ErasmoInvest_API_OPENAI_AUDIO,
});

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    console.log('Iniciando geração de áudio TTS...');

    // Parse do body para obter o texto
    let requestData;
    
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Erro ao fazer parse do body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato de dados inválido' })
      };
    }

    const { text, voice = 'alloy', model = 'tts-1' } = requestData;

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Texto não encontrado no request' })
      };
    }

    console.log('Gerando áudio para texto:', text.substring(0, 100) + '...');

    // Gerar áudio com OpenAI TTS
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      response_format: 'mp3'
    });

    // Converter resposta para buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    // Converter para base64
    const audioBase64 = audioBuffer.toString('base64');

    console.log('Áudio gerado com sucesso, tamanho:', audioBuffer.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        audioBase64: audioBase64,
        size: audioBuffer.length
      })
    };

  } catch (error) {
    console.error('Erro na geração de áudio:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Erro interno na geração de áudio'
      })
    };
  }
}; 