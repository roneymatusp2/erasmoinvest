import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Brain, Sparkles, HelpCircle, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceCommandService, VoiceCommandResult } from '../services/voiceCommandService';
import VoiceCommandHelp from './VoiceCommandHelp';
import { TextCommandInput } from './TextCommandInput';

interface VoiceCommandButtonProps {
  className?: string;
}

export default function VoiceCommandButton({ className = '' }: VoiceCommandButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const voiceServiceRef = useRef<VoiceCommandService | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    // Verificar se o navegador suporta as APIs necessárias
    const checkSupport = () => {
      const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
      const hasMediaRecorder = !!window.MediaRecorder;
      const hasFetch = !!window.fetch;
      
      setIsSupported(hasMediaDevices && hasMediaRecorder && hasFetch);
      
      if (!hasMediaDevices) {
        console.warn('MediaDevices API não suportada');
      }
      if (!hasMediaRecorder) {
        console.warn('MediaRecorder API não suportada');
      }
    };

    checkSupport();

    // Limpar ao desmontar
    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.cleanup();
      }
    };
  }, []);

  const initializeVoiceService = async () => {
    if (isInitializingRef.current) {
      console.log('Já está inicializando, aguardando...');
      return;
    }

    if (!voiceServiceRef.current) {
      isInitializingRef.current = true;
      
      try {
        voiceServiceRef.current = new VoiceCommandService({
          onRecordingStateChange: (recording) => {
            setIsRecording(recording);
            if (!recording) {
              setIsProcessing(true);
            }
          },
          onTranscriptionUpdate: (text) => {
            setTranscription(text);
            setIsProcessing(false);
          },
          onCommandResult: (result: VoiceCommandResult) => {
            console.log('Comando processado:', result);
          }
        });

        await voiceServiceRef.current.initializeRecording();
      } catch (error) {
        console.error('Erro ao inicializar serviço de voz:', error);
        voiceServiceRef.current = null;
        throw error;
      } finally {
        isInitializingRef.current = false;
      }
    }
  };

  const handleMouseDown = async () => {
    if (!isSupported) {
      console.log('Comandos de voz não suportados neste navegador');
      return;
    }

    if (isRecording) {
      console.log('Já está gravando, ignorando...');
      return;
    }

    try {
      await initializeVoiceService();
      if (voiceServiceRef.current) {
        await voiceServiceRef.current.startRecording();
        setTranscription('');
      }
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
    }
  };

  const handleMouseUp = () => {
    if (voiceServiceRef.current && isRecording) {
      voiceServiceRef.current.stopRecording();
    }
  };

  const handleMouseLeave = () => {
    // Parar gravação se o mouse sair do botão
    if (voiceServiceRef.current && isRecording) {
      voiceServiceRef.current.stopRecording();
    }
  };

  const handleTextCommandSuccess = (result: VoiceCommandResult) => {
    console.log('Comando de texto processado:', result);
    // Atualizar interface se necessário
  };

  if (!isSupported) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-400 rounded-xl cursor-not-allowed ${className}`}>
        <MicOff className="w-5 h-5" />
        <span className="text-sm">Não suportado</span>
      </div>
    );
  }

  return (
    <>
      <div className={`relative flex items-center gap-3 ${className}`}>
        {/* Botão Principal de Voz */}
        <motion.button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={`
            relative overflow-hidden
            flex items-center gap-3 px-6 py-3
            rounded-2xl font-medium text-white
            transition-all duration-300 ease-out
            ${isRecording 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-xl shadow-red-500/25' 
              : isProcessing
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-xl shadow-blue-500/25'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
            }
            transform hover:scale-105 active:scale-95
            border border-white/10 backdrop-blur-sm
          `}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessing}
        >
          {/* Fundo animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
          
          {/* Ícone */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="flex items-center"
                >
                  <Mic className="w-5 h-5 animate-pulse" />
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="flex items-center"
                >
                  <Brain className="w-5 h-5 animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  className="flex items-center"
                >
                  <Volume2 className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Texto */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.span
                  key="recording-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm font-bold"
                >
                  Gravando... (solte para parar)
                </motion.span>
              ) : isProcessing ? (
                <motion.span
                  key="processing-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm font-bold"
                >
                  Processando com IA...
                </motion.span>
              ) : (
                <motion.span
                  key="idle-text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm font-bold"
                >
                  Comando de Voz
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Sparkles para efeito visual */}
          {!isRecording && !isProcessing && (
            <Sparkles className="w-4 h-4 text-white/70 relative z-10" />
          )}

          {/* Ondas de áudio animadas durante gravação */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white/50 rounded-full"
                    animate={{
                      height: [4, 12, 4],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.button>

        {/* Botão de Comando de Texto */}
        <motion.button
          onClick={() => setShowTextInput(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 transform shadow-lg shadow-blue-500/25"
          whileTap={{ scale: 0.95 }}
        >
          <Type className="w-4 h-4" />
          <span className="text-sm">Texto</span>
        </motion.button>

        {/* Botão de Ajuda */}
        <motion.button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 transform shadow-lg"
          whileTap={{ scale: 0.95 }}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">Ajuda</span>
        </motion.button>

        {/* Indicador de transcrição */}
        <AnimatePresence>
          {transcription && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute top-full mt-2 left-0 right-0 bg-slate-800/90 border border-slate-600/50 rounded-xl p-3 backdrop-blur-sm"
            >
              <div className="text-xs text-slate-400 mb-1">Transcrição:</div>
              <div className="text-sm text-white">{transcription}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instruções de uso (tooltip) */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white text-xs px-3 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
          Pressione e segure para gravar comando
        </div>
      </div>

      {/* Modal de Ajuda */}
      <VoiceCommandHelp 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />

      {/* Modal de Comando de Texto */}
      <TextCommandInput
        isVisible={showTextInput}
        onClose={() => setShowTextInput(false)}
        onSuccess={handleTextCommandSuccess}
      />
    </>
  );
} 