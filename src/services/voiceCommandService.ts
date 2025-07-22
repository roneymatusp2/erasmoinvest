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

      // Gerar áudio para comando de texto também (sem autoplay)
      if (executeResult.result.message) {
        await this.generateSpeech(executeResult.result.message, {
          autoPlay: false, // Deixar o usuário controlar manualmente
          rate: 0.9
        });
      }
      
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

      // 4. Gerar resposta em áudio com controle manual
      if (executeResult.result.message) {
        await this.generateSpeech(executeResult.result.message, {
          autoPlay: false, // Não reproduzir automaticamente
          rate: 0.9 // Velocidade um pouco mais lenta para melhor compreensão
        });
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
      const audioBase64 = await this.blobToBase64(blob);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioBase64 },
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      });

      if (error) throw error;
      return { success: true, transcription: data.transcription };
    } catch (error) {
      console.error('Erro na transcrição via Supabase:', error);
      return { success: false, transcription: '', error: (error as Error).message };
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async processCommand(transcription: string): Promise<CommandProcessResult> {
    try {
      console.log('🧠 Analisando comando:', transcription);
      
      // Tentar usar a Edge Function primeiro
      const { data, error } = await supabase.functions.invoke('process-command', {
        body: { text: transcription },
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      });

      if (!error && data?.success) {
        console.log('✅ Comando processado via Edge Function:', data.action);
        return { success: true, result: data.action };
      }
      
      // Fallback para processamento local
      console.log('🔄 Usando processamento local...');
      const text = transcription.toLowerCase().trim();
      
      let action = 'consult_portfolio';
      let commandData: any = {};
      
      // Comandos de consulta de portfólio
      if (text.match(/como (está|esta).*portf[óo]lio|resumo.*portf[óo]lio|situa[çc][ãa]o.*portf[óo]lio|meu.*portf[óo]lio/)) {
        action = 'consult_portfolio';
      }
      // Consulta específica de ativo
      else if (text.match(/quantas? a[çc][õo]es.*tenho|quanto.*tenho.*de|posição.*de|tenho.*de/)) {
        const tickerMatch = text.match(/vale|petr|bbas|itub|mglu|abev|brbi|voo|vnq|dvn/);
        if (tickerMatch) {
          action = 'query_asset';
          commandData = { ticker: this.extractTicker(tickerMatch[0]) };
        }
      }
      // Consulta de dividendos/proventos  
      else if (text.match(/dividendos?|proventos?|renda.*passiva|quanto.*receb/)) {
        action = 'query_income';
      }
      // Adicionar investimento
      else if (text.match(/comprar?|adicionar?|investir?/)) {
        action = 'add_investment';
        commandData = { ticker: 'MANUAL', quantidade: 1, valor_unitario: 100 };
      }
      
      console.log('✅ Comando interpretado localmente:', { action, data: commandData });
      
      return { 
        success: true, 
        result: { action, data: commandData }
      };
    } catch (error) {
      console.error('Erro no processamento de comando:', error);
      return { 
        success: false, 
        result: { action: 'consult_portfolio', data: {} }, 
        error: (error as Error).message 
      };
    }
  }

  private extractTicker(assetName: string): string {
    const name = assetName.toLowerCase();
    
    // Mapeamento inteligente de nomes para tickers
    const tickerMap: Record<string, string> = {
      'vale': 'VALE3',
      'petrobras': 'PETR4', 
      'banco do brasil': 'BBAS3',
      'bbas': 'BBAS3',
      'itau': 'ITUB4',
      'bradesco': 'BBDC4',
      'magazine': 'MGLU3',
      'ambev': 'ABEV3',
      'brbi': 'BRBI11',
      'brbi11': 'BRBI11',
      'voo': 'VOO',
      'vnq': 'VNQ',
      'realty': 'O',
      'devon': 'DVN'
    };

    // Buscar por nome conhecido
    for (const [key, ticker] of Object.entries(tickerMap)) {
      if (name.includes(key)) {
        return ticker;
      }
    }

    // Se já parece um ticker, retornar como está
    if (/^[A-Z]{4}[0-9]?$/.test(assetName.toUpperCase())) {
      return assetName.toUpperCase();
    }

    // Padrão para FIIs
    if (/^[A-Z]{4}11$/.test(assetName.toUpperCase())) {
      return assetName.toUpperCase();
    }

    // Fallback
    return assetName.toUpperCase();
  }

  async executeCommand(result: VoiceCommandResult, isVoice: boolean): Promise<CommandProcessResult> {
    try {
      const { data, error } = await supabase.functions.invoke('execute-command', {
        body: { 
          action: result.action,
          data: result.data,
          isVoice,
          userId: "f10ce9f4-4d14-4b6f-b4ac-c810a9813d4f"
        },
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      });

      if (error) throw error;
      return { success: true, result: data };
    } catch (error) {
      console.error('Erro na execução de comando:', error);
      return { success: false, result: null, error: (error as Error).message };
    }
  }

  private async getPortfolioData() {
    try {
      // Buscar dados reais da aplicação
      const portfolioElements = document.querySelectorAll('button[class*="bg-"]');
      const tickers: string[] = [];
      
      portfolioElements.forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && /^[A-Z]{4}[0-9]?$|^[A-Z]{4}11$|^[A-Z]{1,3}$/.test(text)) {
          tickers.push(text);
        }
      });

      // Simular cálculo com dados da aplicação (será melhorado com acesso ao state)
      const totalAtivos = tickers.length || 35;
      const valorTotal = totalAtivos * 4200; // Estimativa baseada em portfólio real
      const totalDividendos = valorTotal * 0.045; // 4.5% yield médio
      
      const ativosBR = tickers.filter(t => t.includes('3') || t.includes('4') || t === 'BRBI11').length;
      const ativosUS = tickers.filter(t => ['VOO', 'VNQ', 'DVN', 'EVEX', 'O'].includes(t)).length;
      const fiis = tickers.filter(t => t.includes('11') && t !== 'BRBI11').length; // Excluir BRBI11

      return {
        totalAtivos,
        valorTotal,
        totalDividendos,
        ativosBR,
        ativosUS,
        fiis,
        yieldMedio: 4.5,
        tickers
      };
    } catch (error) {
      console.error('Erro ao buscar dados do portfólio:', error);
      return {
        totalAtivos: 35,
        valorTotal: 147000,
        totalDividendos: 6615,
        ativosBR: 25,
        ativosUS: 5,
        fiis: 10,
        yieldMedio: 4.5,
        tickers: ['VALE3', 'PETR4', 'BBAS3']
      };
    }
  }

  private async getAssetData(ticker: string) {
    try {
      // Buscar dados reais do ativo (será melhorado com acesso direto aos dados)
      const found = true; // TODO: verificar se existe no portfólio real
      
      if (!found) {
        return { found: false, ticker };
      }

      // Simular dados realistas baseados no tipo de ativo
      const isUS = ['VOO', 'VNQ', 'O', 'DVN', 'EVEX'].includes(ticker);
      const isFII = ticker.includes('11') && !isUS && ticker !== 'BRBI11';
      
      let posicao, precoMedio, valorInvestido, valorAtual, dividendos, rentabilidade, unidade, tipo;
      
      if (isUS) {
        posicao = Math.floor(Math.random() * 50) + 10;
        precoMedio = 200 + Math.random() * 150;
        valorInvestido = posicao * precoMedio;
        valorAtual = valorInvestido * (0.9 + Math.random() * 0.4); // -10% a +30%
        dividendos = valorInvestido * 0.025;
        unidade = 'shares';
        tipo = '🇺🇸 Ativo americano';
      } else if (isFII) {
        posicao = Math.floor(Math.random() * 400) + 100;
        precoMedio = ticker === 'BRBI11' ? 20 + Math.random() * 15 : 18 + Math.random() * 32;
        valorInvestido = posicao * precoMedio;
        valorAtual = valorInvestido * (0.95 + Math.random() * 0.2); // -5% a +15%
        dividendos = valorInvestido * 0.08;
        unidade = 'cotas';
        tipo = ticker === 'BRBI11' ? '🏢 FII brasileiro (BRBI11)' : '🏢 FII brasileiro';
      } else {
        // Ações brasileiras
        posicao = Math.floor(Math.random() * 300) + 50;
        precoMedio = ticker === 'BRBI11' ? 20 + Math.random() * 15 : 18 + Math.random() * 32;
        valorInvestido = posicao * precoMedio;
        valorAtual = valorInvestido * (0.85 + Math.random() * 0.3);
        dividendos = Math.random() * 2.5;
        unidade = ticker === 'BRBI11' ? 'ações (BRBI11)' : 'ações';
        tipo = ticker === 'BRBI11' ? '🇧🇷 Ação brasileira (BRBI11)' : '🇧🇷 Ação brasileira';
      }
      
      rentabilidade = ((valorAtual - valorInvestido) / valorInvestido) * 100;

      return {
        found: true,
        ticker,
        posicao,
        precoMedio,
        valorInvestido,
        valorAtual,
        dividendos,
        rentabilidade,
        unidade,
        tipo
      };
    } catch (error) {
      console.error('Erro ao buscar dados do ativo:', error);
      return { found: false, ticker, error: error.message };
    }
  }

  private async getAvailableTickers(): Promise<string> {
    const portfolioData = await this.getPortfolioData();
    return portfolioData.tickers.slice(0, 10).join(', ') + '...';
  }

  private async addInvestmentToPortfolio(ticker: string, quantidade: number, valorUnitario: number, tipo: string) {
    try {
      // TODO: Integrar com o sistema real de adição de investimentos
      // Por enquanto, simular sucesso
      const currentData = await this.getAssetData(ticker);
      const novaPosicao = currentData.found ? currentData.posicao + quantidade : quantidade;
      
      return {
        success: true,
        ticker,
        quantidade,
        valorUnitario,
        tipo,
        novaPosicao,
        unidade: (ticker.includes('11') && ticker !== 'BRBI11') ? 'cotas' : ['VOO', 'VNQ', 'O', 'DVN', 'EVEX'].includes(ticker) ? 'shares' : 'ações'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erro ao adicionar investimento'
      };
    }
  }

  async generateSpeech(text: string, options: { autoPlay?: boolean; rate?: number } = {}): Promise<void> {
    try {
      // Callback para início do áudio
      this.callbacks.onAudioStart?.();
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text,
          rate: options.rate || 1.0 // Controle de velocidade
        },
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
      });

      if (error) {
        console.warn('Edge Function TTS indisponível, usando Web Speech API');
        return this.generateSpeechFallback(text, options);
      }
      
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      this.currentAudio = audio;
      
      // Configurar eventos de áudio
      audio.onloadstart = () => {
        console.log('🔊 Carregando áudio...');
      };
      
      audio.oncanplay = () => {
        console.log('🎵 Áudio pronto para reprodução');
      };

      audio.onplay = () => {
        console.log('▶️ Reprodução iniciada');
        this.callbacks.onAudioStart?.();
      };

      audio.onpause = () => {
        console.log('⏸️ Reprodução pausada');
        this.callbacks.onAudioPause?.();
      };
      
      audio.onended = () => {
        console.log('✅ Reprodução finalizada');
        this.currentAudio = null;
        this.callbacks.onAudioEnd?.();
      };

      audio.onerror = () => {
        console.error('❌ Erro na reprodução do áudio');
        this.currentAudio = null;
        this.callbacks.onError?.('Erro na reprodução do áudio');
      };

      // Event listener para progresso (opcional)
      audio.ontimeupdate = () => {
        if (this.callbacks.onAudioProgress) {
          this.callbacks.onAudioProgress(audio.currentTime, audio.duration);
        }
      };
      
      // Reproduzir automaticamente ou aguardar comando manual
      if (options.autoPlay !== false) {
        await audio.play();
        console.log('🎵 Reproduzindo resposta em áudio');
      } else {
        console.log('🎵 Áudio carregado, aguardando comando para reproduzir');
      }
      
    } catch (error) {
      console.error('Erro na geração de fala:', error);
      // Fallback para Web Speech API
      this.generateSpeechFallback(text, options);
    }
  }

  // Fallback para Web Speech API
  private generateSpeechFallback(text: string, options: { autoPlay?: boolean; rate?: number } = {}): void {
    try {
      if (!('speechSynthesis' in window)) {
        console.error('Web Speech API não suportada');
        this.callbacks.onError?.('Síntese de voz não suportada neste navegador');
        return;
      }

      // Parar qualquer fala anterior
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configurações de voz
      utterance.lang = 'pt-BR';
      utterance.rate = options.rate || 0.9; // Um pouco mais lento para melhor compreensão
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Tentar usar uma voz em português
      const voices = speechSynthesis.getVoices();
      const portugueseVoice = voices.find(voice => 
        voice.lang.includes('pt') || voice.lang.includes('PT')
      );
      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      }

      // Eventos da Web Speech API
      utterance.onstart = () => {
        console.log('🎵 Web Speech API: Iniciando fala');
      };

      utterance.onend = () => {
        console.log('✅ Web Speech API: Fala finalizada');
        this.callbacks.onAudioEnd?.();
      };

      utterance.onerror = (event) => {
        console.error('❌ Web Speech API erro:', event.error);
        this.callbacks.onError?.(`Erro na síntese de voz: ${event.error}`);
      };

      // Reproduzir ou aguardar comando
      if (options.autoPlay !== false) {
        speechSynthesis.speak(utterance);
        console.log('🎵 Web Speech API: Reproduzindo resposta');
      }

    } catch (error) {
      console.error('Erro no fallback de fala:', error);
      this.callbacks.onError?.('Erro na síntese de voz');
    }
  }

  // Reproduzir áudio manualmente
  playAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.play()
        .then(() => console.log('▶️ Reprodução iniciada manualmente'))
        .catch(error => {
          console.error('Erro ao reproduzir:', error);
          this.callbacks.onError?.('Erro ao reproduzir áudio');
        });
    } else {
      console.warn('Nenhum áudio carregado para reproduzir');
    }
  }

  // Pausar áudio
  pauseAudio(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      console.log('⏸️ Áudio pausado');
      this.callbacks.onAudioPause?.();
    } else if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.pause();
      console.log('⏸️ Web Speech API pausada');
      this.callbacks.onAudioPause?.();
    }
  }

  // Retomar áudio pausado
  resumeAudio(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play()
        .then(() => {
          console.log('▶️ Áudio retomado');
          this.callbacks.onAudioResume?.();
        })
        .catch(error => {
          console.error('Erro ao retomar áudio:', error);
          this.callbacks.onError?.('Erro ao retomar reprodução');
        });
    } else if ('speechSynthesis' in window && speechSynthesis.paused) {
      speechSynthesis.resume();
      console.log('▶️ Web Speech API retomada');
      this.callbacks.onAudioResume?.();
    }
  }

  // Parar completamente o áudio
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      console.log('⏹️ Áudio parado');
      this.callbacks.onAudioEnd?.();
    }
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      console.log('⏹️ Web Speech API cancelada');
    }
  }

  // Verificar se há áudio reproduzindo
  get isAudioPlaying(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) {
      return true;
    }
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      return true;
    }
    return false;
  }

  // Obter duração do áudio atual
  get audioDuration(): number {
    return this.currentAudio?.duration || 0;
  }

  // Obter tempo atual de reprodução
  get audioCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
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