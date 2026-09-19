'use client';

import React, { useState } from 'react';
import { 
  Sprout, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Database,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { AuthUser } from '@/lib/types';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Card Header */}
        <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 p-6 sm:p-7 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur shadow-inner">
            <Sprout className="w-8 h-8 text-emerald-300" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            MonitorAçaí
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 font-medium">
            Gestão de Rodízio de Sensores IoT no SAF
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-emerald-200/90 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span>IFPA Campus Breves (Marajó/PA)</span>
          </div>
        </div>

        {/* Security Subheader */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Acesso Restrito a Pesquisadores Autorizados</span>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Status / Alert Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Institucional Autorizado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="pesquisador@ifpa.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
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
              className="w-full mt-2 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Access Policy Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
            <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              O cadastro é restrito. Caso necessite de acesso ao sistema do SAF, solicite autorização ao coordenador <strong>Ábner Lucas</strong>.
            </div>
          </div>
        </div>

        {/* Card Footer Badge */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            IFPA • SAF Agroecológico
          </span>
          <span className="flex items-center gap-1 text-xs font-mono text-slate-500">
            <Database className="w-3 h-3 text-emerald-600" />
            Supabase PostgreSQL
          </span>
        </div>
      </div>
    </div>
  );
};
