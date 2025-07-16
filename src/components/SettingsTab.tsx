import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Shield, 
  Database, 
  Bell, 
  Moon, 
  Sun, 
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

interface SettingsTabProps {
  onLogout: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ onLogout }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const clearCache = () => {
    localStorage.removeItem('portfolioCache');
    localStorage.removeItem('marketCache');
    alert('Cache limpo com sucesso!');
  };

  const exportData = () => {
    // Simular export de dados
    alert('Funcionalidade de export em desenvolvimento');
  };

  const importData = () => {
    // Simular import de dados
    alert('Funcionalidade de import em desenvolvimento');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* 🎯 HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
          Configurações
        </h1>
        <p className="text-slate-400 text-lg">
          Personalize sua experiência no Erasmo Invest
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 👤 PERFIL DO USUÁRIO */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Perfil do Usuário
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                E
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Erasmo Russo</h4>
                <p className="text-slate-400">erasmorusso@uol.com.br</p>
                <p className="text-sm text-slate-500">Usuário desde: Janeiro 2024</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">15+</div>
                <div className="text-sm text-slate-400">Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">2+</div>
                <div className="text-sm text-slate-400">Anos Investindo</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 🔧 PREFERÊNCIAS */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-400" />
            Preferências
          </h3>
          
          <div className="space-y-6">
            {/* Notificações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="font-medium text-white">Notificações</div>
                  <div className="text-sm text-slate-400">Alertas de preços e dividendos</div>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Modo Escuro */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                <div>
                  <div className="font-medium text-white">Modo Escuro</div>
                  <div className="text-sm text-slate-400">Tema da interface</div>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Mostrar Valores */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showValues ? <Eye className="w-5 h-5 text-green-400" /> : <EyeOff className="w-5 h-5 text-red-400" />}
                <div>
                  <div className="font-medium text-white">Mostrar Valores</div>
                  <div className="text-sm text-slate-400">Exibir valores monetários</div>
                </div>
              </div>
              <button
                onClick={() => setShowValues(!showValues)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showValues ? 'bg-green-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showValues ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto Refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">Atualização Automática</div>
                  <div className="text-sm text-slate-400">Refresh automático dos preços</div>
                </div>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 🛡️ SEGURANÇA */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Segurança
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="font-medium text-green-400">Sessão Segura</span>
              </div>
              <p className="text-sm text-slate-300">
                Sua sessão está protegida e os dados são criptografados.
              </p>
            </div>
            
            <div className="space-y-3">
              <button className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-3 px-4 rounded-lg transition-colors text-left">
                <div className="font-medium">Alterar Senha</div>
                <div className="text-sm text-slate-400">Atualizar sua senha de acesso</div>
              </button>
              
              <button className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-3 px-4 rounded-lg transition-colors text-left">
                <div className="font-medium">Histórico de Acessos</div>
                <div className="text-sm text-slate-400">Ver logins recentes</div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 🗄️ DADOS */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            Gerenciar Dados
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={exportData}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-3 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Dados
            </button>
            
            <button
              onClick={importData}
              className="w-full bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-3 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Dados
            </button>
            
            <button
              onClick={clearCache}
              className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300 py-3 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Limpar Cache
            </button>
            
            <button className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 py-3 px-4 rounded-lg transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Limpar Todos os Dados
            </button>
          </div>
        </motion.div>
      </div>

      {/* 🚪 LOGOUT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-red-900/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-2">Sair do Sistema</h3>
            <p className="text-slate-400">
              Desconectar da sua conta do Erasmo Invest
            </p>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsTab; 