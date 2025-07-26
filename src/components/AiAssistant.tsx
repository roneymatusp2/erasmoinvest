import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Mic, CornerDownLeft, MessageSquare, Brain, Sparkles, User, Bot } from 'lucide-react';
import { voiceService } from '../services/voiceCommandService';
import { VoiceCommandResult, VoiceCommandCallbacks } from '../services/types';

type Message = {
  id: number;
  type: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
};

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const getUniqueId = () => Date.now() + Math.random();

  const addMessage = (type: 'user' | 'ai', text: string) => {
    setMessages(prev => [...prev.filter(m => !m.isTyping), { id: getUniqueId(), type, text }]);
  };

  const addTypingIndicator = () => {
    setMessages(prev => [...prev, { id: getUniqueId(), type: 'ai', text: '', isTyping: true }]);
  };

      const handleTextSubmit = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    addMessage('user', text);
    setInputValue('');
    setIsProcessing(true);
    addTypingIndicator();

    try {
      const result = await voiceService.processTextCommand(text);
      if (result && typeof result === 'string') {
        // Result é uma string formatada e limpa
        addMessage('ai', result);
      } else if (result && typeof result === 'object') {
        // Fallback: se por algum motivo retornar objeto
        const responseText = (result as any).answer || (result as any).response || (result as any).message || (result as any).confirmation || JSON.stringify(result);
        addMessage('ai', responseText);
      } else {
        addMessage('ai', 'Não foi possível obter uma resposta. Tente novamente.');
      }
    } catch (error: any) {
      addMessage('ai', `Erro ao processar comando: ${error.message || 'Ocorreu um erro.'}`);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {isOpen ? (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.5 }}
            className="w-96 h-[600px] bg-slate-900/80 backdrop-blur-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-emerald-400" />
                <h3 className="font-bold text-white">Erasmo AI</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                  {msg.type === 'ai' && <Bot className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                  <div className={`px-4 py-2 rounded-2xl max-w-xs ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                    {msg.isTyping ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
                      </div>
                    ) : msg.text}
                  </div>
                  {msg.type === 'user' && <User className="w-6 h-6 text-blue-400 flex-shrink-0" />}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700">
              <form onSubmit={(e) => { e.preventDefault(); handleTextSubmit(inputValue); }} className="flex items-center gap-2">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isRecording ? 'Ouvindo...' : 'Digite seu comando...'}
                  className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-lg px-4 py-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isProcessing || isRecording}
                />
                <button type="submit" className="p-2 bg-emerald-500 rounded-lg text-white hover:bg-emerald-600 disabled:bg-slate-600" disabled={isProcessing}>
                  <CornerDownLeft size={20} />
                </button>
                <button type="button" className={`p-2 rounded-lg text-white ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`} disabled={isProcessing}>
                  <Mic size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.3 } }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => setIsOpen(true)} 
            className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 hover:scale-110 transition-transform duration-300"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
