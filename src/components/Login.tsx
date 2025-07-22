import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface LoginProps {}

const Login: React.FC<LoginProps> = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const email = 'erasmorusso@uol.com.br'; // Email fixo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('[Login] Iniciando tentativa de login para:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[Login] Resposta do Supabase:', { data, error });

      if (error) {
        console.error('[Login] Erro no Supabase:', error.message);
        toast.error(`Erro: ${error.message}`);
      } else if (data.user) {
        console.log('[Login] Sucesso! Usuário autenticado:', data.user.id);
        toast.success('Login realizado com sucesso!');
      } else {
        console.warn('[Login] Resposta inesperada do Supabase, sem erro mas sem usuário.', data);
        toast.error('Ocorreu um erro inesperado no login.');
      }
    } catch (error) {
      console.error('[Login] Erro crítico no handleSubmit:', error);
      toast.error('Erro crítico ao tentar fazer login.');
    } finally {
      setIsLoading(false);
      console.log('[Login] Finalizando tentativa de login.');
    }
  };

  const handlePasswordReset = async () => {
    toast.loading('Enviando link de redefinição...');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      toast.dismiss();

      if (error) {
        console.error('[Login] Erro ao redefinir senha:', error.message);
        toast.error(`Erro: ${error.message}`);
      } else {
        console.log('[Login] E-mail de redefinição enviado para:', email);
        toast.success('Link para redefinir a senha enviado para o seu e-mail!');
      }
    } catch (error) {
      toast.dismiss();
      console.error('[Login] Erro crítico ao redefinir senha:', error);
      toast.error('Erro crítico ao tentar redefinir a senha.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass border border-white/10 rounded-3xl p-8 text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl"
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-2"
          >
            ERASMO INVEST
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 mb-8"
          >
            Acesse sua conta
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de Senha */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="relative"
            >
              <label className="block text-sm font-medium text-slate-300 mb-2 text-left">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Botão de Login */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Entrar</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Esqueci minha senha */}
          <div className="mt-4 text-center">
            <button
              onClick={handlePasswordReset}
              className="text-sm text-slate-400 hover:text-white hover:underline"
            >
              Esqueceu sua senha?
            </button>
          </div>

          {/* Informação do Sistema */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            <p className="text-xs text-blue-300">
              🔒 Sistema de gestão de investimentos profissional
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
