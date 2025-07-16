// Função simples para mostrar mensagens (substitui react-hot-toast)
const toast = {
  success: (message: string, options?: any) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
  loading: (message: string, options?: any) => console.log('⏳', message)
};

export interface VoiceCommandResult {
  action: string;
  data: any;
  confidence: number;
  confirmation: string;
  raw_response?: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  confidence: number;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  action: string;
  result: any;
  error?: string;
}

export class VoiceCommandService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private stream: MediaStream | null = null;
  private onRecordingStateChange?: (isRecording: boolean) => void;
  private onTranscriptionUpdate?: (text: string) => void;
  private onCommandResult?: (result: VoiceCommandResult) => void;

  constructor(callbacks?: {
    onRecordingStateChange?: (isRecording: boolean) => void;
    onTranscriptionUpdate?: (text: string) => void;
    onCommandResult?: (result: VoiceCommandResult) => void;
  }) {
    this.onRecordingStateChange = callbacks?.onRecordingStateChange;
    this.onTranscriptionUpdate = callbacks?.onTranscriptionUpdate;
    this.onCommandResult = callbacks?.onCommandResult;
  }

  async initializeRecording(): Promise<void> {
    try {
      // Limpar qualquer stream anterior
      this.cleanup();

      // Solicitar permissão para microfone com configurações otimizadas
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,

        }
      });

      // Verificar formatos suportados em ordem de preferência
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        } else {
          throw new Error('Nenhum formato de áudio suportado encontrado');
        }
      }

      console.log('Usando formato de áudio:', mimeType);

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('Chunk de áudio recebido, tamanho:', event.data.size);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('Gravação parou, processando', this.audioChunks.length, 'chunks');
        if (this.audioChunks.length === 0) {
          console.warn('Nenhum chunk de áudio capturado');
          toast.error('Nenhum áudio foi capturado. Tente novamente.');
          return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        console.log('Blob criado, tamanho:', audioBlob.size);
        this.audioChunks = [];
        
        if (audioBlob.size === 0) {
          console.warn('Blob de áudio vazio');
          toast.error('Áudio vazio capturado. Tente gravar novamente.');
          return;
        }
        
        try {
          await this.processAudio(audioBlob);
        } catch (error) {
          console.error('Erro no processamento de áudio:', error);
          toast.error('Erro ao processar comando de voz');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('Erro no MediaRecorder:', event);
        toast.error('Erro na gravação de áudio');
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder iniciado');
        this.isRecording = true;
        this.onRecordingStateChange?.(true);
      };

      console.log('MediaRecorder inicializado com sucesso');
      
    } catch (error) {
      console.error('Erro ao inicializar gravação:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Permissão de microfone negada. Por favor, permita o acesso ao microfone.');
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        throw new Error('Microfone não encontrado. Verifique se há um microfone conectado.');
      } else {
        throw new Error('Erro ao acessar microfone: ' + (error as Error).message);
      }
    }
  }

  async startRecording(): Promise<void> {
    try {
      // Se já está gravando, não fazer nada
      if (this.isRecording) {
        console.log('Já está gravando, ignorando comando start');
        return;
      }

      // Se não há MediaRecorder ou está em estado inválido, reinicializar
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        await this.initializeRecording();
      }

      // Verificar se o MediaRecorder está pronto
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.audioChunks = [];
        // Usar timeslice menor para capturar áudio mais consistentemente
        this.mediaRecorder.start(250); // Capturar chunks a cada 250ms
        
        console.log('Gravação iniciada...');
        toast.success('🎤 Gravação iniciada - fale seu comando!');
      } else {
        console.warn('MediaRecorder não está pronto para gravar. Estado:', this.mediaRecorder?.state);
        toast.error('Erro: MediaRecorder não está pronto. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Erro ao iniciar gravação: ' + (error as Error).message);
    }
  }

  stopRecording(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.onRecordingStateChange?.(false);
        
        console.log('Gravação finalizada...');
        toast.loading('🔄 Processando comando de voz...', { duration: 2000 });

        // Parar todas as tracks do stream para liberar o microfone
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
      } else {
        console.warn('MediaRecorder não está gravando. Estado:', this.mediaRecorder?.state);
        this.isRecording = false;
        this.onRecordingStateChange?.(false);
      }
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      this.isRecording = false;
      this.onRecordingStateChange?.(false);
    }
  }

  // Nova função para processar comandos de texto
  async processTextCommand(text: string): Promise<VoiceCommandResult> {
    try {
      console.log('Processando comando de texto:', text);
      this.onTranscriptionUpdate?.(text);

      // Processar comando com Mistral
      const commandResult = await this.processCommand(text);
      
      if (!commandResult.success) {
        throw new Error(commandResult.error || 'Falha no processamento do comando');
      }

      console.log('Resultado do comando:', commandResult.result);
      this.onCommandResult?.(commandResult.result);

      // Executar comando se necessário
      if (commandResult.result.action === 'add_investment') {
        await this.executeCommand(commandResult.result);
      }

      // Gerar resposta em áudio (TTS)
      if (commandResult.result.confirmation) {
        await this.generateSpeech(commandResult.result.confirmation);
      }

      return commandResult.result;

    } catch (error) {
      console.error('Erro no processamento de texto:', error);
      const errorResult: VoiceCommandResult = {
        action: 'error',
        data: {},
        confidence: 0,
        confirmation: 'Erro ao processar comando: ' + (error as Error).message
      };
      
      toast.error(errorResult.confirmation);
      return errorResult;
    }
  }

  private async processAudio(audioBlob: Blob): Promise<void> {
    try {
      console.log('Iniciando processamento de áudio, tamanho:', audioBlob.size);

      // 1. Transcrever áudio com Whisper
      const transcription = await this.transcribeAudio(audioBlob);
      
      if (!transcription.success) {
        throw new Error(transcription.error || 'Falha na transcrição');
      }

      console.log('Transcrição recebida:', transcription.transcription);
      this.onTranscriptionUpdate?.(transcription.transcription);

      // 2. Processar comando com Mistral
      const commandResult = await this.processCommand(transcription.transcription);
      
      if (!commandResult.success) {
        throw new Error(commandResult.error || 'Falha no processamento do comando');
      }

      console.log('Resultado do comando:', commandResult.result);
      this.onCommandResult?.(commandResult.result);

      // 3. Executar comando se necessário
      if (commandResult.result.action === 'add_investment') {
        await this.executeCommand(commandResult.result);
      }

      // 4. Gerar resposta em áudio (TTS)
      if (commandResult.result.confirmation) {
        await this.generateSpeech(commandResult.result.confirmation);
      }

      // Mostrar confirmação
      toast.success(commandResult.result.confirmation, { duration: 5000 });

    } catch (error) {
      console.error('Erro no processamento completo:', error);
      toast.error('Erro: ' + (error as Error).message);
    }
  }

  private async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      // Converter blob para base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('Enviando áudio para transcrição...');

      const response = await fetch('https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          audioBase64: base64Audio
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha na transcrição');
      }

      return {
        success: true,
        transcription: result.transcription,
        confidence: result.confidence || 0.9
      };

    } catch (error) {
      console.error('Erro na transcrição:', error);
      return {
        success: false,
        transcription: '',
        confidence: 0,
        error: (error as Error).message
      };
    }
  }

  private async processCommand(text: string): Promise<{ success: boolean; result: VoiceCommandResult; error?: string }> {
    try {
      console.log('Enviando texto para processamento:', text);

      const response = await fetch('https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/process-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          text: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha no processamento');
      }

      return {
        success: true,
        result: result.result
      };

    } catch (error) {
      console.error('Erro no processamento:', error);
      return {
        success: false,
        result: {
          action: 'error',
          data: {},
          confidence: 0,
          confirmation: 'Erro no processamento do comando'
        },
        error: (error as Error).message
      };
    }
  }

  private async executeCommand(commandResult: VoiceCommandResult): Promise<ExecutionResult> {
    try {
      console.log('Executando comando:', commandResult);

      const response = await fetch('https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/execute-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: commandResult.action,
          data: commandResult.data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha na execução');
      }

      console.log('Comando executado com sucesso:', result);
      
      // Recarregar página para mostrar novo investimento
      if (commandResult.action === 'add_investment') {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      return {
        success: true,
        action: result.action,
        result: result.result
      };

    } catch (error) {
      console.error('Erro na execução:', error);
      return {
        success: false,
        action: commandResult.action,
        result: null,
        error: (error as Error).message
      };
    }
  }

  // Nova função para gerar fala (TTS)
  private async generateSpeech(text: string): Promise<void> {
    try {
      console.log('Gerando fala para:', text);

      const response = await fetch('https://gjvtncdjcslnkfctqnfy.supabase.co/functions/v1/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          text: text,
          voice: 'alloy',
          model: 'tts-1'
        })
      });

      if (!response.ok) {
        console.warn('Erro no TTS, continuando sem áudio:', response.status);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.audioBase64) {
        // Converter base64 para blob e reproduzir
        const audioData = atob(result.audioBase64);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
          console.warn('Erro ao reproduzir áudio:', error);
        });

        // Limpar URL após reprodução
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
        });
      }

    } catch (error) {
      console.warn('Erro no TTS (continuando sem áudio):', error);
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  cleanup(): void {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.audioChunks = [];
    this.isRecording = false;
  }
} 