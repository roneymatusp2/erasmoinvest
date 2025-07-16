import { toast } from 'sonner';
import { 
  VoiceCommandCallbacks, 
  VoiceCommandResult, 
  TranscriptionResult, 
  CommandProcessResult,
  RecordingState,
  SilenceDetectionConfig
} from './types';
import { supabase } from '../lib/supabase';

/**
 * 🎤 ERASMO INVEST - VOICE COMMAND SERVICE
 * 
 * Sistema completo de comandos de voz e texto com IA integrada
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * - Gravação de voz com detecção automática de silêncio
 * - Processamento de comandos de texto
 * - Integração com Edge Functions Supabase
 * - Callbacks estruturados para UI
 * - Gerenciamento de estado robusto
 * 
 * 🔄 STATUS ATUAL: MOCKS TEMPORÁRIOS ATIVOS
 * - processCommand(): Parser inteligente PT-BR
 * - executeCommand(): Simulação de dados do portfólio  
 * - generateSpeech(): Simulação de reprodução de áudio
 * 
 * 🚀 PRÓXIMO PASSO: Deploy das Edge Functions no Supabase
 */
class VoiceCommandService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private callbacks: VoiceCommandCallbacks = {};
  private currentAudio: HTMLAudioElement | null = null;
  private silenceDetectionTimer: NodeJS.Timeout | null = null;
  private silenceDetectionContext: AudioContext | null = null;
  private silenceDetectionAnalyser: AnalyserNode | null = null;
  
  private state: RecordingState = {
    isRecording: false,
    isProcessing: false,
    transcription: '',
    result: null,
    error: null
  };

  private silenceConfig: SilenceDetectionConfig = {
    silenceThreshold: 30, // Volume threshold
    silenceDuration: 2000, // 2 segundos de silêncio
    sampleRate: 44100
  };

  // ===== MÉTODOS PÚBLICOS =====

  async initializeRecording(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta gravação de áudio');
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.silenceConfig.sampleRate
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      return true;
    } catch (error) {
      console.error('Erro ao inicializar gravação:', error);
      this.callbacks.onError?.('Erro ao acessar o microfone. Verifique as permissões.');
      return false;
    }
  }

  getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // Fallback
  }

  async setupSilenceDetection(stream: MediaStream): Promise<void> {
    try {
      this.silenceDetectionContext = new AudioContext();
      const source = this.silenceDetectionContext.createMediaStreamSource(stream);
      this.silenceDetectionAnalyser = this.silenceDetectionContext.createAnalyser();
      
      this.silenceDetectionAnalyser.fftSize = 256;
      this.silenceDetectionAnalyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.silenceDetectionAnalyser);
      
      this.startSilenceMonitoring();
    } catch (error) {
      console.error('Erro ao configurar detecção de silêncio:', error);
    }
  }

  private startSilenceMonitoring(): void {
    if (!this.silenceDetectionAnalyser) return;

    const dataArray = new Uint8Array(this.silenceDetectionAnalyser.frequencyBinCount);
    let silenceStartTime: number | null = null;

    const checkSilence = () => {
      if (!this.state.isRecording || !this.silenceDetectionAnalyser) return;

      this.silenceDetectionAnalyser.getByteFrequencyData(dataArray);
      
      // Calcular volume médio
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / dataArray.length;

      if (average < this.silenceConfig.silenceThreshold) {
        // Silêncio detectado
        if (silenceStartTime === null) {
          silenceStartTime = Date.now();
        } else if (Date.now() - silenceStartTime > this.silenceConfig.silenceDuration) {
          // Silêncio prolongado - parar gravação
          console.log('🔇 Silêncio detectado - parando gravação automaticamente');
          this.stopRecording();
          return;
        }
      } else {
        // Som detectado - resetar timer de silêncio
        silenceStartTime = null;
      }

      // Continuar monitoramento
      this.silenceDetectionTimer = setTimeout(checkSilence, 100);
    };

    checkSilence();
  }

  stopSilenceDetection(): void {
    if (this.silenceDetectionTimer) {
      clearTimeout(this.silenceDetectionTimer);
      this.silenceDetectionTimer = null;
    }

    if (this.silenceDetectionContext) {
      this.silenceDetectionContext.close();
      this.silenceDetectionContext = null;
    }

    this.silenceDetectionAnalyser = null;
  }

  async startRecording(callbacks: VoiceCommandCallbacks = {}): Promise<void> {
    try {
      this.callbacks = callbacks;
      this.state.isRecording = true;
      this.state.error = null;
      this.audioChunks = [];

      // Inicializar stream se necessário
      if (!this.stream) {
        const initialized = await this.initializeRecording();
        if (!initialized) return;
      }

      // Configurar MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
        await this.processAudio(audioBlob);
      };

      // Configurar detecção de silêncio
      await this.setupSilenceDetection(this.stream!);

      // Iniciar gravação
      this.mediaRecorder.start(100); // Coleta dados a cada 100ms
      
      console.log('🎤 Gravação iniciada');
      this.callbacks.onRecordingStart?.();
      toast.info('🎤 Gravação iniciada - fale agora');

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      this.state.isRecording = false;
      this.callbacks.onError?.('Erro ao iniciar gravação');
      toast.error('Erro ao iniciar gravação');
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.state.isRecording || !this.mediaRecorder) return;

    try {
      this.state.isRecording = false;
      this.stopSilenceDetection();
      
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      console.log('🛑 Gravação parada');
      this.callbacks.onRecordingStop?.();
      toast.info('🛑 Processando comando...');

    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      this.callbacks.onError?.('Erro ao parar gravação');
    }
  }

  async toggleRecording(callbacks: VoiceCommandCallbacks = {}): Promise<void> {
    if (this.state.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording(callbacks);
    }
  }

  async processTextCommand(text: string): Promise<VoiceCommandResult | null> {
    try {
      this.state.isProcessing = true;
      this.state.transcription = text;
      
      console.log('📝 Processando comando de texto:', text);
      this.callbacks.onTranscriptionUpdate?.(text);

      // Processar comando
      const processResult = await this.processCommand(text);
      if (!processResult.success) {
        throw new Error(processResult.error || 'Erro ao processar comando');
      }

      // Executar comando
      const executeResult = await this.executeCommand(processResult.result, false);
      if (!executeResult.success) {
        throw new Error(executeResult.error || 'Erro ao executar comando');
      }

      this.state.result = executeResult.result;
      this.state.isProcessing = false;

      console.log('✅ Comando processado:', executeResult.result);
      this.callbacks.onCommandResult?.(executeResult.result);
      
      return executeResult.result;

    } catch (error) {
      console.error('Erro no processamento de texto:', error);
      this.state.isProcessing = false;
      this.state.error = error instanceof Error ? error.message : 'Erro desconhecido';
      this.callbacks.onError?.(this.state.error);
      toast.error(`Erro: ${this.state.error}`);
      return null;
    }
  }

  async processAudio(blob: Blob): Promise<void> {
    try {
      this.state.isProcessing = true;
      console.log('🔄 Processando áudio...');

      // 1. Transcrever áudio
      const transcriptionResult = await this.transcribeAudio(blob);
      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || 'Erro na transcrição');
      }

      const transcription = transcriptionResult.transcription;
      this.state.transcription = transcription;
      
      console.log('📝 Transcrição:', transcription);
      this.callbacks.onTranscriptionUpdate?.(transcription);

      // 2. Processar comando
      const processResult = await this.processCommand(transcription);
      if (!processResult.success) {
        throw new Error(processResult.error || 'Erro ao processar comando');
      }

      // 3. Executar comando
      const executeResult = await this.executeCommand(processResult.result, true);
      if (!executeResult.success) {
        throw new Error(executeResult.error || 'Erro ao executar comando');
      }

      this.state.result = executeResult.result;
      this.state.isProcessing = false;

      console.log('✅ Comando executado:', executeResult.result);
      this.callbacks.onCommandResult?.(executeResult.result);

      // 4. Gerar resposta em áudio
      if (executeResult.result.message) {
        await this.generateSpeech(executeResult.result.message);
      }

    } catch (error) {
      console.error('Erro no processamento de áudio:', error);
      this.state.isProcessing = false;
      this.state.error = error instanceof Error ? error.message : 'Erro desconhecido';
      this.callbacks.onError?.(this.state.error);
      toast.error(`Erro: ${this.state.error}`);
    }
  }

  async transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
    try {
      console.log('🎵 Enviando áudio para transcrição...');

      // Criar FormData com o arquivo de áudio
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || 'Erro na transcrição do áudio');
      }

      return {
        success: true,
        transcription: data.transcription
      };

    } catch (error) {
      console.error('Erro na transcrição:', error);
      return {
        success: false,
        transcription: '',
        error: error instanceof Error ? error.message : 'Erro na transcrição'
      };
    }
  }

  async processCommand(transcription: string): Promise<CommandProcessResult> {
    try {
      console.log('🧠 Processando comando com IA...');

      // Mock temporário para comandos de texto enquanto as Edge Functions não estão deployadas
      const command = transcription.toLowerCase();
      let result: VoiceCommandResult;

      if (command.includes('portfólio') || command.includes('portfolio') || command.includes('investido')) {
        result = {
          action: 'consult_portfolio',
          confidence: 0.9,
          confirmation: 'Consultando seu portfólio...'
        };
      } else if (command.includes('vale') || command.includes('petrobras') || command.includes('banco do brasil')) {
        const ticker = command.includes('vale') ? 'VALE3' : 
                     command.includes('petrobras') ? 'PETR4' : 'BBAS3';
        result = {
          action: 'query_asset',
          data: { ticker },
          confidence: 0.9,
          confirmation: `Consultando informações de ${ticker}...`
        };
      } else if (command.includes('adicione') || command.includes('comprei') || command.includes('ações')) {
        // Extrair dados básicos do comando
        const quantidadeMatch = command.match(/(\d+)\s*(?:ações|cotas)/);
        const valorMatch = command.match(/(?:por|a)\s*(?:r\$\s*)?(\d+(?:,\d+)?)/);
        const tickerMatch = command.match(/(vale|petrobras|banco do brasil|bbas|petr|vale3)/);
        
        const quantidade = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 10;
        const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 25.0;
        const ticker = tickerMatch ? (tickerMatch[1].includes('vale') ? 'VALE3' : 
                                    tickerMatch[1].includes('petr') ? 'PETR4' : 'BBAS3') : 'VALE3';

        result = {
          action: 'add_investment',
          data: {
            ticker,
            quantidade,
            valor_unitario: valor,
            tipo: 'COMPRA'
          },
          confidence: 0.8,
          confirmation: `Adicionando ${quantidade} ações de ${ticker} por R$ ${valor} cada...`
        };
      } else {
        result = {
          action: 'error',
          confidence: 0,
          confirmation: 'Não consegui entender o comando. Tente novamente.'
        };
      }

      return {
        success: true,
        result
      };

    } catch (error) {
      console.error('Erro no processamento:', error);
      return {
        success: false,
        result: { action: 'error', message: 'Erro ao processar comando' },
        error: error instanceof Error ? error.message : 'Erro no processamento'
      };
    }
  }

  async executeCommand(result: VoiceCommandResult, isVoice: boolean): Promise<CommandProcessResult> {
    try {
      console.log('⚡ Executando comando:', result.action);

      // Mock temporário para execução de comandos
      let message = '';
      let executionResult: unknown = {};

      switch (result.action) {
        case 'consult_portfolio':
          message = '💼 Seu portfólio: R$ 15.430,50 investidos em 12 operações. Dividendos: R$ 234,80, Juros: R$ 45,20. Yield médio: 1,81%.';
          executionResult = { 
            success: true, 
            totalInvestido: 15430.50, 
            totalDividendos: 234.80, 
            totalJuros: 45.20, 
            numAtivos: 12, 
            rendaMedia: 1.81 
          };
          break;

        case 'query_asset':
          const ticker = (result.data as any)?.ticker || 'VALE3';
          message = `📊 ${ticker}: 100 ações, R$ 2.500,00 investidos. Preço médio: R$ 25,00. Proventos: R$ 45,00.`;
          executionResult = { 
            success: true, 
            ticker, 
            posicaoTotal: 100, 
            valorInvestido: 2500, 
            precoMedio: 25.00, 
            dividendos: 45.00 
          };
          break;

        case 'add_investment':
          const { ticker: addTicker, quantidade, valor_unitario, tipo } = (result.data as any) || {};
          message = `✅ Investimento adicionado com sucesso! ${tipo} de ${quantidade} ${addTicker} por R$ ${valor_unitario?.toFixed(2)} cada.`;
          executionResult = { 
            success: true, 
            ticker: addTicker, 
            quantidade, 
            valor_unitario, 
            tipo 
          };
          break;

        case 'error':
        default:
          message = '❌ Comando não reconhecido ou erro na execução.';
          executionResult = { success: false, error: 'Comando inválido' };
          break;
      }

      return {
        success: true,
        result: {
          action: result.action,
          message: message,
          response: message,
          data: executionResult
        }
      };

    } catch (error) {
      console.error('Erro na execução:', error);
      return {
        success: false,
        result: { action: 'error', message: 'Erro ao executar comando' },
        error: error instanceof Error ? error.message : 'Erro na execução'
      };
    }
  }

  async generateSpeech(text: string): Promise<void> {
    try {
      console.log('🔊 Gerando resposta em áudio...');
      this.callbacks.onAudioStart?.();

      // Mock temporário - simular áudio sendo reproduzido
      console.log('🎵 Mock: Reproduzindo mensagem:', text);
      
      // Simular duração do áudio baseada no tamanho do texto
      const duration = Math.max(2000, text.length * 50); // Mínimo 2s, 50ms por caractere
      
      setTimeout(() => {
        this.callbacks.onAudioEnd?.();
        console.log('🔊 Mock: Áudio finalizado');
      }, duration);

    } catch (error) {
      console.error('Erro na síntese de fala:', error);
      this.callbacks.onAudioEnd?.();
      // Não mostrar erro para o usuário, pois o comando já foi executado
    }
  }

  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.callbacks.onAudioEnd?.();
    }
  }

  // ===== GETTERS PARA ESTADO =====

  get isRecording(): boolean {
    return this.state.isRecording;
  }

  get isProcessing(): boolean {
    return this.state.isProcessing;
  }

  get currentTranscription(): string {
    return this.state.transcription;
  }

  get lastResult(): VoiceCommandResult | null {
    return this.state.result;
  }

  get lastError(): string | null {
    return this.state.error;
  }

  // ===== CLEANUP =====

  cleanup(): void {
    this.stopRecording();
    this.stopAudio();
    this.stopSilenceDetection();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

// Singleton instance
export const voiceService = new VoiceCommandService();
export default voiceService;