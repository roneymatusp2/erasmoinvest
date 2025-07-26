/**
 * 🎤 ERASMO INVEST - VOICE COMMAND SERVICE - COGNITIVE CORE INTEGRATION FIXED
 *
 * Sistema completo de comandos de voz e texto com IA integrada
 * CORRIGIDO: Mapeamento correto da resposta do Cognitive Core
 */

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

class VoiceCommandService {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    private callbacks: VoiceCommandCallbacks = {};
    private currentAudio: HTMLAudioElement | null = null;
    private silenceDetectionTimer: NodeJS.Timeout | null = null;
    private silenceDetectionContext: AudioContext | null = null;
    private silenceDetectionAnalyser: AnalyserNode | null = null;
    private recordingLock: boolean = false;
    private silenceDetectionActive: boolean = false;

    private state: RecordingState = {
        isRecording: false,
        isProcessing: false,
        transcription: '',
        result: null,
        error: null
    };

    private silenceConfig: SilenceDetectionConfig = {
        silenceThreshold: 30,
        silenceDuration: 2000,
        sampleRate: 44100
    };

    private maxRecordingDuration = 30000;
    private recordingTimeout: NodeJS.Timeout | null = null;
    private retryAttempts = 2;

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
            toast.error('Erro ao acessar o microfone. Verifique as permissões.');
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

        return 'audio/webm';
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
            toast.warning('Detecção de silêncio indisponível; gravação manual ativada.');
        }
    }

    private startSilenceMonitoring(): void {
        if (!this.silenceDetectionAnalyser) return;

        this.silenceDetectionActive = true;
        const dataArray = new Uint8Array(this.silenceDetectionAnalyser.frequencyBinCount);
        let silenceStartTime: number | null = null;

        const checkSilence = () => {
            if (!this.state.isRecording || !this.silenceDetectionAnalyser || !this.silenceDetectionActive) {
                return;
            }

            this.silenceDetectionAnalyser.getByteFrequencyData(dataArray);

            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;

            if (average < this.silenceConfig.silenceThreshold) {
                if (silenceStartTime === null) silenceStartTime = Date.now();
                else if (Date.now() - silenceStartTime > this.silenceConfig.silenceDuration) {
                    console.log('🔇 Silêncio detectado - parando gravação automaticamente');
                    this.stopRecording();
                    return;
                }
            } else {
                silenceStartTime = null;
            }

            if (this.silenceDetectionActive) {
                requestAnimationFrame(checkSilence);
            }
        };

        requestAnimationFrame(checkSilence);
    }

    stopSilenceDetection(): void {
        this.silenceDetectionActive = false;

        if (this.silenceDetectionTimer) {
            clearTimeout(this.silenceDetectionTimer);
            this.silenceDetectionTimer = null;
        }

        if (this.silenceDetectionContext) {
            this.silenceDetectionContext.close().catch(console.error);
            this.silenceDetectionContext = null;
        }

        this.silenceDetectionAnalyser = null;
    }

    async startRecording(callbacks: VoiceCommandCallbacks = {}): Promise<void> {
        if (this.recordingLock) return;
        this.recordingLock = true;

        try {
            this.callbacks = callbacks;
            this.state.isRecording = true;
            this.state.error = null;
            this.audioChunks = [];

            if (!this.stream) {
                const initialized = await this.initializeRecording();
                if (!initialized) {
                    this.recordingLock = false;
                    return;
                }
            }

            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                await this.processAudio(audioBlob);
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('❌ Erro no MediaRecorder:', event);
                this.callbacks.onError?.('Erro na gravação de áudio');
                this.stopRecording();
            };

            await this.setupSilenceDetection(this.stream!);

            this.mediaRecorder.start(100);

            this.recordingTimeout = setTimeout(() => {
                console.log('🛑 Tempo máximo atingido - parando gravação');
                this.stopRecording();
            }, this.maxRecordingDuration);

            console.log('🎤 Gravação iniciada');
            this.callbacks.onRecordingStart?.();
            toast.info('🎤 Gravação iniciada - fale agora');

        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            this.state.isRecording = false;
            this.callbacks.onError?.('Erro ao iniciar gravação');
            toast.error('Erro ao iniciar gravação');
        } finally {
            this.recordingLock = false;
        }
    }

    async stopRecording(): Promise<void> {
        if (!this.state.isRecording || !this.mediaRecorder) return;

        try {
            this.state.isRecording = false;
            this.stopSilenceDetection();

            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
                this.recordingTimeout = null;
            }

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

    // ===== COGNITIVE CORE INTEGRATION - CORRIGIDO =====

    /**
     * 🧠 COGNITIVE CORE INTEGRATION - FIXED
     * Executa o fluxo de IA completo através do Cognitive Core.
     * CORRIGIDO: Mapeamento correto da resposta
     */
    private async executeCognitiveCore(input: { text?: string; audioBlob?: Blob }): Promise<VoiceCommandResult | null> {
        try {
            this.state.isProcessing = true;
            const userId = '4362da88-d01c-4ffe-a447-75751ea8e182'; // ID do Erasmo

            let requestBody: { commandText?: string; audioBase64?: string; userId: string };

            if (input.text) {
                console.log('🧠 Enviando texto para o Cognitive Core:', input.text);
                this.state.transcription = input.text;
                this.callbacks.onTranscriptionUpdate?.(input.text);
                requestBody = { commandText: input.text, userId };
            } else if (input.audioBlob) {
                console.log('🧠 Enviando áudio para o Cognitive Core...');
                const audioBase64 = await this.blobToBase64(input.audioBlob);
                requestBody = { audioBase64, userId };
            } else {
                throw new Error('Entrada inválida para o Cognitive Core.');
            }

            console.log('📤 Enviando requisição para cognitive-core:', requestBody);

            const { data, error } = await supabase.functions.invoke('cognitive-core', {
                body: requestBody,
            });

            console.log('📥 Resposta do cognitive-core:', data);
            console.log('❌ Erro do cognitive-core:', error);

            if (error) {
                throw new Error(error.message || 'Erro ao invocar o Cognitive Core.');
            }

            // 🔧 CORREÇÃO CRÍTICA: Mapeamento correto da resposta
            if (!data || !data.success) {
                throw new Error('Resposta inválida do Cognitive Core.');
            }

            // ✅ CORRETO: Extrair a resposta do campo correto
            const cognitiveResponse = data.data; // Dados principais

            if (!cognitiveResponse) {
                throw new Error('Dados ausentes na resposta do Cognitive Core.');
            }

            // Extrair transcrição se disponível (para comandos de áudio)
            if (cognitiveResponse.transcription) {
                this.state.transcription = cognitiveResponse.transcription;
                this.callbacks.onTranscriptionUpdate?.(cognitiveResponse.transcription);
                console.log('📝 Transcrição do Core:', cognitiveResponse.transcription);
            }

            // ✅ RESPOSTA PRINCIPAL: Criar resultado estruturado
            const finalResult: VoiceCommandResult = {
                action: 'cognitive_response',
                data: {
                    response: cognitiveResponse.response,
                    confidence: cognitiveResponse.confidence,
                    sources: cognitiveResponse.sources,
                    suggestions: cognitiveResponse.suggestions,
                    used_thinking: cognitiveResponse.used_thinking,
                    task_type: cognitiveResponse.task_type,
                    context_available: cognitiveResponse.context_available
                },
                success: true,
                timestamp: new Date().toISOString()
            };

            this.state.result = finalResult;
            console.log('✅ Resultado final estruturado:', finalResult);

            // 🔧 CRÍTICO: Callback para UI deve receber apenas a resposta de texto
            // Não o objeto completo, senão aparece JSON na tela
            const textResponse = cognitiveResponse.response;
            console.log('📤 Enviando para UI apenas o texto:', textResponse.substring(0, 100) + '...');

            // SOLUÇÃO DEFINITIVA: Callbacks específicos para diferentes tipos de resposta

            // 1. Para transcrição/texto simples
            if (this.callbacks.onTranscriptionUpdate) {
                this.callbacks.onTranscriptionUpdate(textResponse);
            }

            // 2. Para resultado de comando (se a UI espera objeto)
            if (this.callbacks.onCommandResult) {
                // Criar objeto super simples para evitar JSON complexo
                const simpleResult = {
                    text: textResponse,
                    confidence: cognitiveResponse.confidence || 1.0,
                    success: true
                };
                this.callbacks.onCommandResult(simpleResult as any);
            }

            console.log('✅ Callbacks executados com texto limpo');

            // 🔇 ÁUDIO NÃO AUTOMÁTICO: Apenas salvar para reprodução posterior
            if (cognitiveResponse.response && typeof cognitiveResponse.response === 'string') {
                // Salvar a resposta para reprodução posterior, mas NÃO tocar automaticamente
                console.log('💾 Resposta salva para reprodução posterior');
                // O áudio será tocado apenas quando o usuário clicar no botão de áudio
            }

            // Toast de sucesso
            toast.success(`✅ Resposta gerada com ${(cognitiveResponse.confidence * 100).toFixed(0)}% de confiança`);

            return finalResult;

        } catch (error) {
            console.error('❌ Erro no Cognitive Core:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

            this.state.error = errorMessage;
            this.callbacks.onError?.(errorMessage);
            toast.error(`❌ Erro: ${errorMessage}`);

            return null;
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * 💬 PROCESSAMENTO DE COMANDO DE TEXTO - SOMENTE TEXTO
     * Método específico para retornar apenas o texto da resposta
     * Usado quando a UI não deve receber objetos JSON
     */
    async processTextCommandSimple(text: string): Promise<string | null> {
        console.log('💬 Processando comando de texto (modo simples):', text);

        try {
            const result = await this.executeCognitiveCore({ text });

            if (result && result.success && result.data && typeof result.data === 'object') {
                // Extrair apenas o texto da resposta
                const responseText = (result.data as any).response;
                if (typeof responseText === 'string') {
                    console.log('✅ Retornando apenas texto da resposta:', responseText.substring(0, 100) + '...');
                    return responseText;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Erro no processamento de texto:', error);
            return null;
        }
    }

    /**
     * 💬 PROCESSAMENTO DE COMANDO DE TEXTO
     * Interface pública para comandos de texto
     * RETORNA APENAS O TEXTO DA RESPOSTA, NÃO O OBJETO COMPLETO
     */
    async processTextCommand(text: string): Promise<string | null> {
        // Usar o método simples por padrão para evitar JSON na UI
        return this.processTextCommandSimple(text);
    }

    /**
     * 🎤 PROCESSAMENTO DE ÁUDIO
     * Interface pública para comandos de áudio
     */
    async processAudio(blob: Blob): Promise<void> {
        console.log('🎤 Processando comando de áudio');
        await this.executeCognitiveCore({ audioBlob: blob });
    }

    /**
     * 🎯 MÉTODO DIRETO PARA UI
     * Processa comando e retorna APENAS o texto da resposta FORMATADO
     * Ideal para evitar JSON na interface
     */
    async getTextResponse(command: string): Promise<string> {
        try {
            console.log('🎯 Processando comando para resposta direta:', command);

            const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';

            const { data, error } = await supabase.functions.invoke('cognitive-core', {
                body: { commandText: command, userId },
            });

            if (error) {
                throw new Error(error.message || 'Erro ao processar comando');
            }

            if (data && data.success && data.data && data.data.response) {
                const rawResponse = data.data.response;

                // 🔧 FORMATAÇÃO MELHORADA: Converter markdown para texto limpo
                const formattedResponse = this.formatResponseForUI(rawResponse);

                // 💾 SALVAR ESTADO para reprodução de áudio posterior
                this.state.result = {
                    action: 'cognitive_response',
                    data: {
                        response: rawResponse, // Salvar resposta original para áudio
                        formatted: formattedResponse // Versão formatada para UI
                    },
                    success: true,
                    timestamp: new Date().toISOString()
                };

                console.log('✅ Resposta formatada obtida:', formattedResponse.substring(0, 100) + '...');
                console.log('💾 Estado salvo para reprodução de áudio');

                // 🔇 ÁUDIO NÃO AUTOMÁTICO: Apenas preparar, não tocar
                // O áudio será tocado apenas quando o usuário clicar no botão

                return formattedResponse;
            }

            throw new Error('Resposta inválida do servidor');

        } catch (error) {
            console.error('❌ Erro ao obter resposta:', error);
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(`Erro: ${errorMsg}`);
            return 'Não foi possível obter uma resposta. Tente novamente.';
        }
    }

    /**
     * 🎨 FORMATAÇÃO DE RESPOSTA PARA UI
     * Converte markdown e caracteres de escape para texto limpo
     */
    private formatResponseForUI(rawText: string): string {
        return rawText
            // Converter caracteres de escape
            .replace(/\\n\\n/g, '\n\n')  // Duplas quebras de linha
            .replace(/\\n/g, '\n')       // Quebras de linha simples
            .replace(/\\t/g, '  ')       // Tabs para espaços

            // Converter markdown para texto simples (mantendo estrutura visual)
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
            .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
            .replace(/`(.*?)`/g, '$1')        // Remove `code`

            // Manter headers mas limpar markdown
            .replace(/### /g, '')  // Remove ### mas mantém o texto
            .replace(/## /g, '')   // Remove ## mas mantém o texto
            .replace(/# /g, '')    // Remove # mas mantém o texto

            // Limpar outros elementos markdown
            .replace(/---+/g, '───────────────────') // Converter separadores
            .replace(/^\- /gm, '• ')  // Converter listas - para •

            // Limpar espaços extras
            .replace(/\n{3,}/g, '\n\n')  // Máximo 2 quebras seguidas
            .trim();
    }

    /**
     * 🎵 REPRODUZIR ÁUDIO DA ÚLTIMA RESPOSTA
     * Método público para tocar áudio quando o usuário solicitar
     */
    async playLastResponseAudio(): Promise<void> {
        try {
            // Buscar a última resposta do state
            if (!this.state.result || !this.state.result.data) {
                toast.warning('Nenhuma resposta disponível para reproduzir');
                return;
            }

            let textToSpeak = '';

            // Extrair texto da última resposta (preferir original para áudio)
            const resultData = this.state.result.data as any;

            if (typeof resultData === 'string') {
                textToSpeak = resultData;
            } else if (resultData.response) {
                textToSpeak = resultData.response; // Resposta original (não formatada)
            } else if (resultData.formatted) {
                textToSpeak = resultData.formatted; // Versão formatada como fallback
            }

            if (!textToSpeak) {
                toast.warning('Texto não disponível para reprodução');
                return;
            }

            // Limpar texto para áudio (remover formatação)
            const cleanTextForAudio = this.cleanTextForAudio(textToSpeak);

            console.log('🎵 Reproduzindo áudio da resposta...');
            console.log('🧹 Texto limpo para áudio:', cleanTextForAudio.substring(0, 100) + '...');
            toast.info('🎵 Reproduzindo áudio...');

            await this.generateSpeech(cleanTextForAudio, { autoPlay: true });

        } catch (error) {
            console.error('❌ Erro ao reproduzir áudio:', error);
            toast.error('Erro ao reproduzir áudio');
        }
    }

    /**
     * 🎵 REPRODUZIR ÁUDIO DE TEXTO ESPECÍFICO
     * Método público para tocar áudio de qualquer texto
     */
    async playTextAudio(text: string): Promise<void> {
        try {
            const cleanText = this.cleanTextForAudio(text);
            console.log('🎵 Reproduzindo áudio personalizado...');
            toast.info('🎵 Reproduzindo áudio...');
            await this.generateSpeech(cleanText, { autoPlay: true });
        } catch (error) {
            console.error('❌ Erro ao reproduzir áudio:', error);
            toast.error('Erro ao reproduzir áudio');
        }
    }

    /**
     * 🧹 LIMPEZA DE TEXTO PARA ÁUDIO
     * Remove formatação markdown e elementos visuais
     */
    private cleanTextForAudio(text: string): string {
        return text
            // Remover caracteres de escape
            .replace(/\\n/g, ' ')
            .replace(/\\t/g, ' ')

            // Remover markdown
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/###\s*/g, '')
            .replace(/##\s*/g, '')
            .replace(/#\s*/g, '')
            .replace(/---+/g, '')

            // Remover emojis e símbolos visuais
            .replace(/[📊📈📉💰🔍✅⚠️📤💎🎯🔄🎵🎤🧠👉📅]/g, '')
            .replace(/[•▪▫■□▲▼◆◇]/g, '')

            // Converter listas para pausas naturais
            .replace(/^\- /gm, '. ')
            .replace(/\n\n+/g, '. ')
            .replace(/\n/g, '. ')

            // Limpeza final
            .replace(/\s{2,}/g, ' ')
            .replace(/\.{2,}/g, '.')
            .replace(/\.\s*\./g, '.')
            .trim();
    }

    /**
     * 📊 EXPLICAÇÃO DE GRÁFICOS COM IA
     * Funcionalidade específica para análise de gráficos
     * CORRIGIDO: Usa formato correto do cognitive-core
     */
    async getChartExplanation(chartTitle: string, chartData: any): Promise<{ text: string; audioUrl: string } | null> {
        this.state.isProcessing = true;
        try {
            toast.info('🤖 Analisando o gráfico com IA...');

            // 🔧 CORREÇÃO: Converter dados do gráfico em texto descritivo
            const chartDescription = this.formatChartDataForAI(chartTitle, chartData);

            // 🔧 CORREÇÃO: Usar formato correto do cognitive-core
            const commandText = `Analise e explique este gráfico de investimentos em detalhes:

TÍTULO: ${chartTitle}

DADOS DO GRÁFICO:
${chartDescription}

Por favor, forneça uma análise completa incluindo:
1. O que os dados mostram sobre minha situação financeira
2. Tendências e padrões importantes
3. Insights e recomendações práticas
4. Pontos de atenção ou oportunidades

Seja específico e use os números fornecidos para dar contexto real ao Erasmo.`;

            console.log('🧠 Enviando análise de gráfico para o Cognitive Core:', commandText.substring(0, 200) + '...');

            // Usar o método getTextResponse que já funciona
            const explanationText = await this.getTextResponse(commandText);

            if (!explanationText || explanationText === 'Não foi possível obter uma resposta. Tente novamente.') {
                throw new Error('Resposta inválida do serviço de explicação.');
            }

            console.log('✅ Explicação recebida do Core:', explanationText.substring(0, 100) + '...');

            // 🎵 NÃO tocar áudio automaticamente - apenas retornar o texto
            // O áudio será tocado apenas se o usuário solicitar

            return {
                text: explanationText,
                audioUrl: '' // Áudio disponível via playTextAudio() se solicitado
            };

        } catch (error) {
            console.error('❌ Erro ao obter explicação do gráfico:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            this.state.error = errorMessage;
            this.callbacks.onError?.(errorMessage);
            toast.error(`Erro na análise: ${errorMessage}`);
            return null;
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * 📊 FORMATADOR DE DADOS DE GRÁFICO PARA IA
     * Converte dados complexos de gráficos em texto descritivo
     */
    private formatChartDataForAI(chartTitle: string, chartData: any): string {
        try {
            let description = '';

            // Detectar tipo de dados e formatar adequadamente
            if (Array.isArray(chartData)) {
                if (chartData.length === 0) {
                    return 'Nenhum dado disponível no gráfico.';
                }

                // Dados de timeline/performance
                if (chartData[0]?.month || chartData[0]?.monthLabel) {
                    description += 'EVOLUÇÃO TEMPORAL:\n';
                    chartData.forEach((item, index) => {
                        const month = item.monthLabel || item.month;
                        const value = item.value || item.invested || 0;
                        const profit = item.profit || 0;
                        const income = item.income || 0;

                        description += `${month}: Valor R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        if (profit !== 0) description += `, Lucro R$ ${profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        if (income !== 0) description += `, Proventos R$ ${income.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        description += '\n';
                    });
                }

                // Dados de alocação/distribuição
                else if (chartData[0]?.name && chartData[0]?.value) {
                    description += 'DISTRIBUIÇÃO DE ATIVOS:\n';
                    const total = chartData.reduce((sum, item) => sum + (item.value || 0), 0);
                    chartData.forEach(item => {
                        const percentage = total > 0 ? (item.value / total * 100).toFixed(1) : '0.0';
                        description += `${item.name}: R$ ${item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentage}%)\n`;
                    });
                }

                // Dados de performance de ativos
                else if (chartData[0]?.ticker) {
                    description += 'PERFORMANCE DOS ATIVOS:\n';
                    chartData.forEach(item => {
                        description += `${item.ticker}`;
                        if (item.name) description += ` (${item.name})`;
                        if (item.profitPercent !== undefined) description += `: ${item.profitPercent >= 0 ? '+' : ''}${item.profitPercent.toFixed(2)}%`;
                        if (item.dividendYield) description += `, DY: ${item.dividendYield.toFixed(2)}%`;
                        if (item.totalIncome) description += `, Proventos: R$ ${item.totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        description += '\n';
                    });
                }

                // Dados de setor/categoria
                else if (chartData[0]?.sector) {
                    description += 'DISTRIBUIÇÃO SETORIAL:\n';
                    chartData.forEach(item => {
                        description += `${item.sector}: R$ ${item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${item.percentage.toFixed(1)}%)\n`;
                    });
                }

                // Fallback genérico
                else {
                    description += 'DADOS DO GRÁFICO:\n';
                    chartData.slice(0, 10).forEach((item, index) => {
                        description += `Item ${index + 1}: ${JSON.stringify(item)}\n`;
                    });
                    if (chartData.length > 10) {
                        description += `... e mais ${chartData.length - 10} itens\n`;
                    }
                }

                // Estatísticas resumidas
                if (chartData.length > 1) {
                    description += `\nRESUMO: ${chartData.length} itens no total`;

                    // Tentar calcular estatísticas se houver valores numéricos
                    const values = chartData.map(item => item.value || item.profit || item.return || 0).filter(v => typeof v === 'number');
                    if (values.length > 0) {
                        const total = values.reduce((sum, v) => sum + v, 0);
                        const avg = total / values.length;
                        const max = Math.max(...values);
                        const min = Math.min(...values);
                        description += `\nTotal: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        description += `\nMédia: R$ ${avg.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        description += `\nMáximo: R$ ${max.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                        description += `\nMínimo: R$ ${min.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                    }
                }
            }

            // Dados de TreeMap
            else if (chartData?.children && Array.isArray(chartData.children)) {
                description += 'MAPA DE CALOR DOS ATIVOS:\n';
                chartData.children.forEach(item => {
                    description += `${item.name}: Tamanho R$ ${item.size.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
                    if (item.performance !== undefined) description += `, Performance: ${item.performance >= 0 ? '+' : ''}${item.performance.toFixed(2)}%`;
                    if (item.dividendYield) description += `, DY: ${item.dividendYield.toFixed(2)}%`;
                    if (item.sector) description += `, Setor: ${item.sector}`;
                    description += '\n';
                });
            }

            // Dados de objeto único
            else if (typeof chartData === 'object' && chartData !== null) {
                description += 'DADOS DO GRÁFICO:\n';
                Object.entries(chartData).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        description += `${key}: ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
                    } else {
                        description += `${key}: ${value}\n`;
                    }
                });
            }

            // Fallback para outros tipos
            else {
                description = `Dados: ${JSON.stringify(chartData, null, 2)}`;
            }

            return description || 'Dados do gráfico não puderam ser processados.';

        } catch (error) {
            console.error('❌ Erro ao formatar dados do gráfico:', error);
            return `Erro ao processar dados do gráfico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        }
    }

    // ===== UTILITÁRIOS =====

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

    // ===== FALLBACK PARA COMPATIBILIDADE =====

    async processCommand(transcription: string): Promise<CommandProcessResult> {
        try {
            console.log('🧠 Analisando comando (fallback):', transcription);

            // Tentar usar o Cognitive Core primeiro
            const cognitiveResult = await this.processTextCommand(transcription);

            if (cognitiveResult && cognitiveResult.success) {
                return {
                    success: true,
                    result: cognitiveResult
                };
            }

            // Fallback para processamento local expandido
            console.log('🔄 Usando processamento local (fallback)...');
            const text = transcription.toLowerCase().trim();

            let action = 'consult_portfolio';
            let commandData: any = {};

            // Padrões expandidos para melhor reconhecimento
            if (text.match(/como (está|esta).*portf[óo]lio|resumo.*portf[óo]lio|situa[çc][ãa]o.*portf[óo]lio|meu.*portf[óo]lio/)) {
                action = 'consult_portfolio';
            }
            else if (text.match(/quantas? a[çc][õo]es.*tenho|quanto.*tenho.*de|posição.*de|tenho.*de|situa[çc][ãa]o.*do|como.*está|quanto.*investido|valor.*de/)) {
                const tickerMatch = text.match(/vale|petr|bbas|itub|mglu|abev|brbi|voo|vnq|dvn|tesouro|selic|tesouro\s+selic|tesouro\s+direto/);
                if (tickerMatch) {
                    action = 'query_asset';
                    commandData = { ticker: this.extractTicker(tickerMatch[0]) };
                }
            }
            else if (text.match(/dividendos?|proventos?|renda.*passiva|quanto.*receb/)) {
                action = 'query_income';
            }
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

        const tickerMap: Record<string, string> = {
            'vale': 'VALE3',
            'petrobras': 'PETR4',
            'petr': 'PETR4',
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
            'devon': 'DVN',
            'tesouro': 'TESOURO SELIC 2026',
            'selic': 'TESOURO SELIC 2026',
            'tesouro selic': 'TESOURO SELIC 2026',
            'tesouro direto': 'TESOURO SELIC 2026'
        };

        for (const [key, ticker] of Object.entries(tickerMap)) {
            if (name === key || name.includes(key)) {
                return ticker;
            }
        }

        if (name.includes('tesouro') || name.includes('selic')) {
            return 'TESOURO SELIC 2026';
        }

        if (/^[A-Z]{4}[0-9]?$/.test(assetName.toUpperCase())) {
            return assetName.toUpperCase();
        }

        if (/^[A-Z]{4}11$/.test(assetName.toUpperCase())) {
            return assetName.toUpperCase();
        }

        if (assetName.includes(' ')) {
            return assetName.toUpperCase();
        }

        return assetName.toUpperCase();
    }

    async executeCommand(result: VoiceCommandResult, isVoice: boolean): Promise<CommandProcessResult> {
        try {
            const userId = '4362da88-d01c-4ffe-a447-75751ea8e182';

            console.log('🔍 Enviando para execute-command:', {
                action: result.action,
                data: result.data,
                userId: userId
            });

            const { data, error } = await supabase.functions.invoke('execute-command', {
                body: {
                    action: result.action,
                    data: result.data,
                    isVoice,
                    userId: userId
                },
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                }
            });

            if (error) {
                console.error('❌ Erro da Edge Function execute-command:', error);
                throw error;
            }

            console.log('✅ Resposta da Edge Function execute-command:', data);
            return { success: true, result: data };
        } catch (error) {
            console.error('Erro na execução de comando:', error);
            return { success: false, result: null, error: (error as Error).message };
        }
    }

    // ===== SÍNTESE DE VOZ =====

    async generateSpeech(text: string, options: { autoPlay?: boolean; rate?: number } = {}): Promise<void> {
        try {
            this.callbacks.onAudioStart?.();

            const { data, error } = await supabase.functions.invoke('text-to-speech', {
                body: {
                    text,
                    rate: options.rate || 1.0
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

            audio.onloadstart = () => console.log('🔊 Carregando áudio...');
            audio.oncanplay = () => console.log('🎵 Áudio pronto para reprodução');
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
            audio.ontimeupdate = () => {
                if (this.callbacks.onAudioProgress) {
                    this.callbacks.onAudioProgress(audio.currentTime, audio.duration);
                }
            };

            if (options.autoPlay !== false) {
                await audio.play();
                console.log('🎵 Reproduzindo resposta em áudio');
            } else {
                console.log('🎵 Áudio carregado, aguardando comando para reproduzir');
            }

        } catch (error) {
            console.error('Erro na geração de fala:', error);
            this.generateSpeechFallback(text, options);
        }
    }

    private generateSpeechFallback(text: string, options: { autoPlay?: boolean; rate?: number } = {}): void {
        try {
            if (!('speechSynthesis' in window)) {
                console.error('Web Speech API não suportada');
                this.callbacks.onError?.('Síntese de voz não suportada neste navegador');
                return;
            }

            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = options.rate || 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            const voices = speechSynthesis.getVoices();
            const portugueseVoice = voices.find(voice =>
                voice.lang.includes('pt') || voice.lang.includes('PT')
            );
            if (portugueseVoice) {
                utterance.voice = portugueseVoice;
            }

            utterance.onstart = () => console.log('🎵 Web Speech API: Iniciando fala');
            utterance.onend = () => {
                console.log('✅ Web Speech API: Fala finalizada');
                this.callbacks.onAudioEnd?.();
            };
            utterance.onerror = (event) => {
                console.error('❌ Web Speech API erro:', event.error);
                this.callbacks.onError?.(`Erro na síntese de voz: ${event.error}`);
            };

            if (options.autoPlay !== false) {
                speechSynthesis.speak(utterance);
                console.log('🎵 Web Speech API: Reproduzindo resposta');
            }

        } catch (error) {
            console.error('Erro no fallback de fala:', error);
            this.callbacks.onError?.('Erro na síntese de voz');
        }
    }

    // ===== CONTROLES DE ÁUDIO =====

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

    get isAudioPlaying(): boolean {
        if (this.currentAudio && !this.currentAudio.paused) {
            return true;
        }
        if ('speechSynthesis' in window && speechSynthesis.speaking) {
            return true;
        }
        return false;
    }

    get audioDuration(): number {
        return this.currentAudio?.duration || 0;
    }

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

    get hasAudioAvailable(): boolean {
        return !!(this.state.result && this.state.result.data);
    }

    get lastResponseText(): string | null {
        if (!this.state.result || !this.state.result.data) return null;

        const resultData = this.state.result.data as any;

        // Preferir versão formatada para UI
        if (resultData.formatted) {
            return resultData.formatted;
        } else if (typeof resultData === 'string') {
            return this.formatResponseForUI(resultData);
        } else if (resultData.response) {
            return this.formatResponseForUI(resultData.response);
        }

        return null;
    }

    // ===== CLEANUP ROBUSTO =====

    cleanup(): void {
        this.stopRecording();
        this.stopAudio();
        this.stopSilenceDetection();

        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingLock = false;

        console.log('🧹 VoiceCommandService limpo completamente');
    }
}

/**
 * ======================== DOCUMENTATION & USAGE EXAMPLES ========================
 *
 * MÉTODO RECOMENDADO PARA TEXTO FORMATADO (SEM JSON):
 *
 * const response = await voiceService.getTextResponse("quantas ações da vale eu tenho?");
 * // response = "Você possui 250 ações da VALE3..." (string formatada, sem \n\n ou **)
 * setDisplayText(response); // Mostra texto limpo na UI
 *
 * EXPLICAÇÃO DE GRÁFICOS COM IA (NOVA FUNCIONALIDADE):
 *
 * const handleExplainChart = async (chartTitle: string, chartData: any) => {
 *   const result = await voiceService.getChartExplanation(chartTitle, chartData);
 *   if (result) {
 *     setExplanationText(result.text); // Texto formatado da explicação
 *     // Áudio NÃO toca automaticamente - só quando usuário solicitar
 *   }
 * };
 *
 * Exemplo com dados reais:
 * const portfolioData = [
 *   { name: "Ações", value: 250000, percentage: 60 },
 *   { name: "FIIs", value: 100000, percentage: 25 },
 *   { name: "Tesouro", value: 60000, percentage: 15 }
 * ];
 *
 * await handleExplainChart("Alocação do Portfólio", portfolioData);
 *
 * REPRODUZIR ÁUDIO QUANDO O USUÁRIO QUISER:
 *
 * // Botão para tocar áudio da última resposta
 * <button onClick={() => voiceService.playLastResponseAudio()}>
 *   🔊 Ouvir Resposta
 * </button>
 *
 * // Ou tocar áudio de texto específico (para explicações)
 * <button onClick={() => voiceService.playTextAudio(explanationText)}>
 *   🎵 Ouvir Explicação
 * </button>
 *
 * // Verificar se áudio está disponível
 * {voiceService.hasAudioAvailable && (
 *   <button onClick={() => voiceService.playLastResponseAudio()}>
 *     {voiceService.isAudioPlaying ? '🔊 Tocando...' : '🎵 Ouvir'}
 *   </button>
 * )}
 *
 * MÉTODO TRADICIONAL (pode retornar objeto):
 *
 * const result = await voiceService.processTextCommand("quantas ações da vale eu tenho?");
 * // result = string | null (formatado)
 *
 * PARA COMANDOS DE VOZ:
 *
 * await voiceService.startRecording({
 *   onCommandResult: (result) => {
 *     // result agora é um objeto simples com apenas { text, confidence, success }
 *     setDisplayText(result.text); // Texto já formatado
 *   }
 * });
 *
 * CONTROLES DE ÁUDIO:
 *
 * // Verificar se está tocando
 * if (voiceService.isAudioPlaying) {
 *   voiceService.pauseAudio();
 * } else {
 *   voiceService.playLastResponseAudio();
 * }
 *
 * // Parar áudio
 * voiceService.stopAudio();
 *
 * FORMATAÇÃO AUTOMÁTICA:
 * - Remove caracteres de escape (\n, \t)
 * - Remove markdown (**, *, ```)
 * - Converte listas para bullets (•)
 * - Mantém estrutura visual sem código
 * - Texto pronto para exibição na UI
 *
 * EXEMPLO COMPLETO DE COMPONENTE UI COM GRÁFICOS:
 *
 * const [response, setResponse] = useState('');
 * const [explanation, setExplanation] = useState('');
 * const [isLoading, setIsLoading] = useState(false);
 *
 * const handleAskQuestion = async (question: string) => {
 *   setIsLoading(true);
 *   try {
 *     const answer = await voiceService.getTextResponse(question);
 *     setResponse(answer);
 *   } finally {
 *     setIsLoading(false);
 *   }
 * };
 *
 * const handleExplainChart = async (title: string, data: any) => {
 *   setIsLoading(true);
 *   try {
 *     const result = await voiceService.getChartExplanation(title, data);
 *     if (result) {
 *       setExplanation(result.text);
 *     }
 *   } finally {
 *     setIsLoading(false);
 *   }
 * };
 *
 * return (
 *   <div>
 *     // Resposta de texto
 *     <pre style={{whiteSpace: 'pre-wrap'}}>{response}</pre>
 *
 *     // Explicação de gráfico
 *     {explanation && (
 *       <div className="explanation-modal">
 *         <h3>Explicação IA</h3>
 *         <pre style={{whiteSpace: 'pre-wrap'}}>{explanation}</pre>
 *         <button onClick={() => voiceService.playTextAudio(explanation)}>
 *           🎵 Ouvir Explicação
 *         </button>
 *       </div>
 *     )}
 *
 *     // Controles de áudio
 *     {voiceService.hasAudioAvailable && (
 *       <div className="audio-controls">
 *         <button
 *           onClick={() => voiceService.playLastResponseAudio()}
 *           disabled={voiceService.isAudioPlaying}
 *         >
 *           {voiceService.isAudioPlaying ? '🔊 Reproduzindo...' : '🎵 Ouvir Resposta'}
 *         </button>
 *
 *         {voiceService.isAudioPlaying && (
 *           <button onClick={() => voiceService.stopAudio()}>
 *             ⏹️ Parar
 *           </button>
 *         )}
 *       </div>
 *     )}
 *
 *     // Botões de explicação nos gráficos
 *     <button
 *       onClick={() => handleExplainChart("Meu Portfólio", portfolioData)}
 *       disabled={isLoading}
 *     >
 *       ✨ Explicar com IA
 *     </button>
 *   </div>
 * );
 *
 * TIPOS DE DADOS SUPORTADOS PARA EXPLICAÇÃO:
 *
 * 1. Timeline/Performance (evolução temporal):
 * const timelineData = [
 *   { month: "2025-01", value: 100000, profit: 5000, income: 1200 },
 *   { month: "2025-02", value: 105000, profit: 10000, income: 1500 }
 * ];
 *
 * 2. Alocação/Distribuição (pizza/rosca):
 * const allocationData = [
 *   { name: "Ações", value: 250000, percentage: 60 },
 *   { name: "FIIs", value: 100000, percentage: 25 }
 * ];
 *
 * 3. Performance de Ativos:
 * const performanceData = [
 *   { ticker: "VALE3", profitPercent: 15.2, dividendYield: 8.5 },
 *   { ticker: "ITUB4", profitPercent: -5.1, dividendYield: 12.3 }
 * ];
 *
 * 4. TreeMap/Mapa de Calor:
 * const treeMapData = {
 *   name: "Portfolio",
 *   children: [
 *     { name: "VALE3", size: 50000, performance: 15.2, sector: "Mineração" },
 *     { name: "ITUB4", size: 30000, performance: -5.1, sector: "Bancos" }
 *   ]
 * };
 *
 * A IA automaticamente detecta o tipo de dados e gera explicações contextualizadas! 🚀
 */

// Singleton instance
export const voiceService = new VoiceCommandService();
export default voiceService;