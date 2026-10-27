'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { AuthUser } from '@/lib/types';
import { MarcaAcai } from '@/components/vivo/MarcaAcai';
import { CelulaDesenhada } from '@/components/vivo/CelulaDesenhada';

interface LoginScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o email e a senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await authService.signIn({ email, password });
      if (error || !user) {
        setErrorMessage(error || 'Falha na autenticação. Verifique suas credenciais.');
      } else {
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grao min-h-screen bg-acai-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Uma célula da planta baixa se desenhando ao fundo */}
      <CelulaDesenhada className="pointer-events-none absolute -left-24 top-1/2 w-[640px] max-w-none -translate-y-1/2 opacity-60 sm:left-[4%]" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
        {/* Card Header */}
        <div className="px-7 pt-8 pb-2">
          <div className="flex items-center gap-3">
            <MarcaAcai className="h-12 w-11 shrink-0" />
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-grafite">MonitorAçaí</h1>
              <p className="flex items-center gap-1 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-folha-600" />
                SAF de açaí do IFPA Campus Breves
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-700">
            Entre com o email autorizado pelo coordenador para registrar e acompanhar o rodízio dos sensores.
          </p>
        </div>

        {/* Form Body */}
        <div className="px-7 pt-4 pb-7 space-y-4">
          {/* Status / Alert Message */}
          {errorMessage && (
            <div role="alert" className="p-3 bg-rose-50 rounded-2xl text-rose-800 text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-800 mb-1.5">
                Email institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="pesquisador@ifpa.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-11 pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-papel/70 border border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-folha-600 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-senha" className="block text-sm font-medium text-slate-800 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-11 pl-10 pr-11 py-2.5 text-sm rounded-2xl bg-papel/70 border border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-folha-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1 w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-grafite hover:bg-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full mt-2 min-h-12 py-3 px-4 bg-acai-900 hover:bg-acai-800 text-white font-semibold text-sm rounded-full flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Access Policy Notice */}
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <HelpCircle className="w-4 h-4 text-folha-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Ainda não tem acesso? Peça autorização ao coordenador <strong className="font-semibold text-grafite">Ábner Lucas</strong>.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
