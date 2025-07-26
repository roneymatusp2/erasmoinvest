/**
 * 🎤 VOICE COMMAND BUTTON - VERSÃO OTIMIZADA
 * Integração perfeita com as novas APIs gratuitas
 * Performance superior + UX incrível
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2, Volume2, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

interface VoiceCommandButtonProps {
  onCommand?: (command: string, result: any) => void
  onTranscript?: (transcript: string) => void
  userId: string
  className?: string
}

interface VoiceState {
  isListening: boolean
  isProcessing: boolean
  isSpeaking: boolean
  error: string | null
  success: string | null
  transcript: string
  confidence: number
}

/**
 * 🎯 VOICE COMMAND BUTTON OTIMIZADO
 * Integra: Voxtral (transcrição) + Qwen3 (processamento) + Google TTS (fala)
 */
export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onCommand,
  onTranscript,
  userId,
  className = ''
}) => {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    error: null,
    success: null,
    transcript: '',
    confidence: 0
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  // Configuração do MediaRecorder otimizada para Voxtral
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, success: null, transcript: '' }))

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Otimizado para Voxtral
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      // Configurar analisador de áudio para feedback visual
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Detectar nível de áudio
      const detectAudioLevel = () => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255)

        animationFrameRef.current = requestAnimationFrame(detectAudioLevel)
      }
      detectAudioLevel()

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        await processRecording()
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setState(prev => ({ ...prev, isListening: true }))

      // Auto-stop após 30 segundos (limite razoável)
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, 30000)

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Erro ao acessar microfone. Verifique as permissões.',
        isListening: false 
      }))
    }
  }, [])

  // Parar gravação
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isListening: false }))
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    setAudioLevel(0)
  }, [])

  // Processar áudio gravado
  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      setState(prev => ({ ...prev, error: 'Nenhum áudio capturado' }))
      return
    }

    setState(prev => ({ ...prev, isProcessing: true }))

    try {
      // Criar blob de áudio
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      })

      // Converter para base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        const base64Data = base64Audio.split(',')[1]

        // 1. Transcrever com Voxtral (Edge Function)
        const transcribeResponse = await supabase.functions.invoke('transcribe-audio', {
          body: {
            audio_data: base64Data,
            user_id: userId,
            format: 'webm',
            language: 'pt',
            context: 'financial',
            enhance_tickers: true
          }
        })

        if (transcribeResponse.error) {
          throw new Error(transcribeResponse.error.message)
        }

        const { transcript, confidence, enhanced_tickers, duration_seconds } = transcribeResponse.data.data

        setState(prev => ({ 
          ...prev, 
          transcript,
          confidence,
          success: `Transcrição concluída (${duration_seconds.toFixed(1)}s)`
        }))

        if (onTranscript) {
          onTranscript(transcript)
        }

        // Mostrar tickers detectados se houver
        if (enhanced_tickers && enhanced_tickers.length > 0) {
          console.log('🎯 Tickers detectados:', enhanced_tickers)
        }

        // 2. Processar comando com Qwen3-30B (Edge Function)
        const processResponse = await supabase.functions.invoke('process-command', {
          body: {
            command: transcript,
            user_id: userId,
            session_id: sessionStorage.getItem('session_id') || 'web-app',
            context: {
              detected_tickers: enhanced_tickers,
              timestamp: new Date().toISOString()
            }
          }
        })

        if (processResponse.error) {
          throw new Error(processResponse.error.message)
        }

        const commandResult = processResponse.data

        // 3. Executar comando se válido
        if (commandResult.success && commandResult.processed_command) {
          const { action, parameters, requires_confirmation, estimated_cost } = commandResult.processed_command

          if (requires_confirmation) {
            // Solicitar confirmação do usuário
            const confirmMessage = `Confirma: ${action} ${JSON.stringify(parameters)}?${
              estimated_cost ? ` Custo estimado: R$ ${estimated_cost.toFixed(2)}` : ''
            }`
            
            if (window.confirm(confirmMessage)) {
              await executeCommand(action, parameters)
            }
          } else {
            await executeCommand(action, parameters)
          }

          if (onCommand) {
            onCommand(transcript, commandResult)
          }
        }

        // 4. Sintetizar resposta por voz (opcional)
        if (commandResult.validation?.reasoning) {
          await speakResponse(commandResult.validation.reasoning)
        }

        setState(prev => ({ 
          ...prev, 
          isProcessing: false,
          success: 'Comando processado com sucesso!'
        }))

      }
    } catch (error) {
      console.error('Erro no processamento:', error)
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error.message || 'Erro ao processar comando'
      }))
    }
  }

  // Executar comando no sistema
  const executeCommand = async (action: string, parameters: any) => {
    try {
      const executeResponse = await supabase.functions.invoke('execute-command', {
        body: {
          action,
          parameters,
          user_id: userId
        }
      })

      if (executeResponse.error) {
        throw new Error(executeResponse.error.message)
      }

      console.log('✅ Comando executado:', executeResponse.data)
    } catch (error) {
      console.error('Erro ao executar comando:', error)
      throw error
    }
  }

  // Sintetizar fala com Google TTS
  const speakResponse = async (text: string) => {
    if (!text || text.length === 0) return

    setState(prev => ({ ...prev, isSpeaking: true }))

    try {
      const ttsResponse = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          user_id: userId,
          voice: {
            language_code: 'pt-BR',
            name: 'pt-BR-Neural2-A',
            gender: 'FEMALE'
          },
          audio_config: {
            encoding: 'MP3',
            speaking_rate: 1.0,
            pitch: 0.0
          },
          enhance_financial: true
        }
      })

      if (ttsResponse.error) {
        throw new Error(ttsResponse.error.message)
      }

      // Tocar áudio
      const audioBase64 = ttsResponse.data.data.audio_content
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }))
      }

      await audio.play()

    } catch (error) {
      console.error('Erro ao sintetizar fala:', error)
      setState(prev => ({ ...prev, isSpeaking: false }))
    }
  }

  // Toggle gravação
  const toggleRecording = () => {
    if (state.isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (state.error || state.success) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null, success: null }))
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [state.error, state.success])

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="relative">
      {/* Botão Principal */}
      <motion.button
        onClick={toggleRecording}
        disabled={state.isProcessing || state.isSpeaking}
        className={`
          relative p-4 rounded-full transition-all duration-300
          ${state.isListening 
            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50' 
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/50'
          }
          ${state.isProcessing || state.isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {/* Animação de áudio */}
        {state.isListening && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: [1, 1.2 + audioLevel * 0.5, 1],
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: `radial-gradient(circle, rgba(239, 68, 68, ${0.3 + audioLevel * 0.3}) 0%, transparent 70%)`
            }}
          />
        )}

        {/* Ícone */}
        <div className="relative z-10 text-white">
          {state.isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : state.isSpeaking ? (
            <Volume2 className="w-6 h-6" />
          ) : state.isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </div>
      </motion.button>

      {/* Indicador de estado */}
      <AnimatePresence>
        {(state.isListening || state.isProcessing || state.isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
                     bg-gray-800 text-white text-sm px-3 py-1 rounded-full whitespace-nowrap"
          >
            {state.isListening && 'Ouvindo...'}
            {state.isProcessing && 'Processando...'}
            {state.isSpeaking && 'Falando...'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcrição em tempo real */}
      <AnimatePresence>
        {state.transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full mt-16 left-1/2 transform -translate-x-1/2 
                     bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-sm w-64"
          >
            <p className="text-sm mb-2">{state.transcript}</p>
            {state.confidence > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Confiança: {(state.confidence * 100).toFixed(0)}%</span>
                <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${state.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensagens de erro/sucesso */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-0 left-full ml-4 flex items-center 
                     bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">{state.error}</span>
          </motion.div>
        )}

        {state.success && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-0 left-full ml-4 flex items-center 
                     bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">{state.success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de nível de áudio */}
      {state.isListening && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
                      w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-red-500"
            animate={{ scaleX: audioLevel }}
            style={{ transformOrigin: 'left' }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * 🎯 HOOK CUSTOMIZADO PARA COMANDOS DE VOZ
 * Facilita a integração em outros componentes
 */
export const useVoiceCommands = (userId: string) => {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar suporte do navegador
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Navegador não suporta captura de áudio')
      return
    }

    // Verificar permissões
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setIsReady(true))
      .catch(() => setError('Permissão de microfone negada'))
  }, [])

  return { isReady, error }
}

export default VoiceCommandButton