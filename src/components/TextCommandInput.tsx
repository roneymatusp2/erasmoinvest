import React, { useState } from 'react';
import { Send, X, Clock, Lightbulb } from 'lucide-react';
import { voiceService } from '../services/voiceCommandService';
import { VoiceCommandResult } from '../services/types';

interface TextCommandInputProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (result: VoiceCommandResult) => void;
}

const EXAMPLE_COMMANDS = [
  "Adicione 10 ações da Petrobras por 35 reais",
  "Como está meu portfólio?", 
  "Quantas ações da Vale eu tenho?",
  "Qual o valor total investido?",
  "Comprei 5 ações do Banco do Brasil por 25,50"
];

export const TextCommandInput: React.FC<TextCommandInputProps> = ({
  isVisible,
  onClose,
  onSuccess
}) => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await voiceService.processTextCommand(command);
      
      if (result) {
        // Notifica o sucesso com o resultado do processamento
        onSuccess?.(result);
        
        // Limpa o comando e fecha o modal
        setCommand('');
        onClose();
      } else {
        setError('Erro ao processar comando');
      }
    } catch (error) {
      console.error('Erro no comando de texto:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setCommand(example);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Comando de Texto</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Digite seu comando aqui... (ex: Adicione 10 ações da Vale por 25 reais)"
              className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isProcessing}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
              <div className="text-red-300 text-sm">
                {error}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={!command.trim() || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium transition-all duration-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Comando</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-slate-300">Exemplos de comandos:</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {EXAMPLE_COMMANDS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 rounded-lg text-sm text-slate-300 hover:text-white transition-all duration-200"
                disabled={isProcessing}
              >
                "{example}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 