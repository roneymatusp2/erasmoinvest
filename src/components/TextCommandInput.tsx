import React, { useState } from 'react';
import { Send, X, Clock, Lightbulb } from 'lucide-react';
import { VoiceCommandService } from '../services/voiceCommandService';

interface TextCommandInputProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
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
      const voiceService = new VoiceCommandService();
      const result = await voiceService.processTextCommand(command);
      
      if (result.action === 'error') {
        setError(result.confirmation);
      } else {
        onSuccess?.(result);
        setCommand('');
        onClose();
      }
    } catch (error) {
      setError('Erro ao processar comando: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setCommand(example);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Comando de Texto</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Digite seu comando:
            </label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ex: Adicione 10 ações da Petrobras por 35 reais cada"
              className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isProcessing}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!command.trim() || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Comando
              </>
            )}
          </button>
        </form>

        {/* Examples */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <h4 className="text-sm font-medium text-slate-300">Exemplos:</h4>
          </div>
          
          <div className="space-y-2">
            {EXAMPLE_COMMANDS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left text-sm text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg p-2 transition-colors"
                disabled={isProcessing}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 