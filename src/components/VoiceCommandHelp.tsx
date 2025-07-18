import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MessageSquare, TrendingUp, Sparkles } from 'lucide-react';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceCommandHelp({ isOpen, onClose }: VoiceCommandHelpProps) {
  const commands = [
    {
      category: 'Adicionar Investimentos',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      examples: [
        'Adicione 10 ações da Petrobras por 35 reais cada',
        'Comprei 5 ações do Banco do Brasil a 25 e 50 centavos ontem',
        'Inclua 20 cotas do ALZR11 com preço de 110 reais na data de hoje',
        'Adicione 100 ações da Vale por 65 reais em 15 de janeiro'
      ]
    },
    {
      category: 'Consultar Portfólio',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      examples: [
        'Como está meu portfólio?',
        'Qual o valor total investido?',
        'Mostra minhas ações',
        'Quantos ativos eu tenho?'
      ]
    },
    {
      category: 'Consultar Ativos',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      examples: [
        'Como está a Petrobras?',
        'Preço médio do BBAS3',
        'Quantas ações da Vale eu tenho?',
        'Como está meu ALZR11?'
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Comandos de Voz</h2>
                    <p className="text-slate-400">Controle seus investimentos com sua voz</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instruções gerais */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Como usar:</h3>
                <ol className="text-slate-300 space-y-1 text-sm">
                  <li>1. <strong>Pressione e segure</strong> o botão de comando de voz</li>
                  <li>2. <strong>Fale claramente</strong> seu comando em português</li>
                  <li>3. <strong>Solte o botão</strong> quando terminar</li>
                  <li>4. <strong>Aguarde</strong> o processamento com IA</li>
                </ol>
              </div>

              {/* Categorias de comandos */}
              <div className="space-y-6">
                {commands.map((category, index) => {
                  const Icon = category.icon;
                  
                  return (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`bg-gradient-to-r ${category.color} p-2 rounded-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                      </div>
                      
                      <div className="grid gap-2">
                        {category.examples.map((example, exampleIndex) => (
                          <motion.div
                            key={exampleIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: (index * 0.1) + (exampleIndex * 0.05) }}
                            className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-3 text-slate-300 text-sm"
                          >
                            <span className="text-slate-500">"</span>
                            {example}
                            <span className="text-slate-500">"</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Dicas importantes */}
              <div className="mt-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2">💡 Dicas importantes:</h3>
                <ul className="text-slate-300 space-y-1 text-sm">
                  <li>• <strong>Fale claramente</strong> e em ritmo normal</li>
                  <li>• <strong>Mencione valores</strong> como "25 e 50 centavos" para R$ 25,50</li>
                  <li>• <strong>Use datas</strong> como "hoje", "ontem" ou "15 de janeiro"</li>
                  <li>• <strong>Nomes populares</strong> como "Petrobras" são reconhecidos automaticamente</li>
                  <li>• <strong>Ambiente silencioso</strong> melhora a precisão da transcrição</li>
                </ul>
              </div>

              {/* Powered by */}
              <div className="mt-6 text-center text-slate-500 text-xs">
                <p>Powered by OpenAI Whisper + Mistral AI</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 