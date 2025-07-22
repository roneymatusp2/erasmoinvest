// Exemplo de integração das Edge Functions melhoradas no Frontend
// Este arquivo mostra como usar as novas funcionalidades

import { supabase } from './supabaseClient';

// Configuração base das URLs das edge functions
const EDGE_FUNCTIONS_URL = 'https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1';

// Headers padrão para as requisições
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${supabase.auth.getSession()?.access_token || ''}`,
});

// 1. Processar comando de voz/texto
export async function processCommand(text: string) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/process-command`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    
    if (data.success && data.result) {
      // Executar o comando processado
      return await executeCommand(data.result);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao processar comando:', error);
    throw error;
  }
}

// 2. Executar comando processado
export async function executeCommand(commandResult: any) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/execute-command`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        action: commandResult.action,
        data: commandResult.data,
        isVoice: true, // ou false se for texto digitado
      }),
    });

    const data = await response.json();
    
    // Se houver mensagem de resposta, sintetizar fala
    if (data.message && data.success) {
      await synthesizeSpeech(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao executar comando:', error);
    throw error;
  }
}

// 3. Sintetizar fala
export async function synthesizeSpeech(text: string, voice?: string) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/text-to-speech`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        text,
        voice: voice || 'pt-BR-FranciscaNeural',
        provider: 'openai', // ou 'mistral' quando disponível
      }),
    });

    const data = await response.json();
    
    if (data.success && data.audio) {
      // Tocar o áudio
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      await audio.play();
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao sintetizar fala:', error);
    throw error;
  }
}

// 4. Transcrever áudio
export async function transcribeAudio(audioBase64: string) {
  try {
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/transcribe-audio`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        audioBase64,
        provider: 'openai', // ou 'mistral' quando disponível
      }),
    });

    const data = await response.json();
    
    if (data.success && data.transcription) {
      // Processar o comando transcrito
      return await processCommand(data.transcription);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    throw error;
  }
}

// 5. Exemplos de uso direto das actions

// Adicionar investimento
export async function addInvestment(ticker: string, quantidade: number, valorUnitario: number) {
  return await executeCommand({
    action: 'add_investment',
    data: {
      ticker,
      quantidade,
      valor_unitario: valorUnitario,
      tipo: 'COMPRA',
    },
  });
}

// Registrar venda
export async function sellInvestment(ticker: string, quantidade: number, valorUnitario: number) {
  return await executeCommand({
    action: 'sell_investment',
    data: {
      ticker,
      quantidade,
      valor_unitario: valorUnitario,
    },
  });
}

// Registrar dividendo
export async function addDividend(ticker: string, valor: number) {
  return await executeCommand({
    action: 'add_dividend',
    data: {
      ticker,
      valor,
    },
  });
}

// Consultar portfólio
export async function consultPortfolio() {
  return await executeCommand({
    action: 'consult_portfolio',
    data: {},
  });
}

// Consultar ativo específico
export async function queryAsset(ticker: string) {
  return await executeCommand({
    action: 'query_asset',
    data: { ticker },
  });
}

// Consultar proventos
export async function queryIncome() {
  return await executeCommand({
    action: 'query_income',
    data: {},
  });
}

// Gerar relatório completo
export async function generateReport() {
  return await executeCommand({
    action: 'generate_report',
    data: {},
  });
}

// 6. Hook React para comandos de voz
import { useState, useCallback, useRef } from 'react';

export function useVoiceCommands() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            setIsProcessing(true);
            try {
              const result = await transcribeAudio(base64Audio);
              setResult(result);
            } catch (err) {
              setError(err.message);
            } finally {
              setIsProcessing(false);
            }
          }
        };
        
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
    } catch (err) {
      setError('Erro ao acessar microfone');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  const processTextCommand = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await processCommand(text);
      setResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    result,
    error,
    startRecording,
    stopRecording,
    processTextCommand,
  };
}

// 7. Componente exemplo
import React from 'react';

export function VoiceCommandButton() {
  const {
    isRecording,
    isProcessing,
    result,
    error,
    startRecording,
    stopRecording,
    processTextCommand,
  } = useVoiceCommands();

  return (
    <div>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`px-4 py-2 rounded ${
          isRecording ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isRecording ? 'Parar Gravação' : 'Iniciar Comando de Voz'}
      </button>
      
      <input
        type="text"
        placeholder="Ou digite seu comando aqui..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            processTextCommand(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        className="ml-2 px-3 py-2 border rounded"
      />
      
      {isProcessing && <p>Processando...</p>}
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {result && result.message && (
        <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
          {result.message}
        </div>
      )}
    </div>
  );
}

// 8. Exemplos de comandos
const exemplosComandos = [
  "Comprei 100 ações de HGLG11 a 160 reais",
  "Vendi 50 ações de PETR4 por 35 reais cada",
  "Recebi 150 reais de dividendo de XPLG11",
  "TAEE11 pagou 80 reais de juros",
  "Como está meu portfólio?",
  "Quantas ações de VALE3 eu tenho?",
  "Quanto recebi de dividendos este mês?",
  "Gere um relatório completo dos meus investimentos",
];

export { exemplosComandos }; 