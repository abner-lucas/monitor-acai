'use client';

import React, { useState } from 'react';
import { 
  Sprout, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Database,
  MapPin,
  Sparkles
} from 'lucide-react';
import { authService, DEFAULT_DEMO_USER } from '@/lib/services/authService';
import { AuthUser } from '@/lib/types';

interface LoginScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Informe seu nome completo para identificação no projeto.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { user, error } = await authService.signIn({ email, password });
        if (error || !user) {
          setErrorMessage(error || 'Falha na autenticação. Verifique os dados digitados.');
        } else {
          onAuthSuccess(user);
        }
      } else {
        const { user, error, requiresEmailConfirmation } = await authService.signUp({
          email,
          password,
          fullName,
        });

        if (error) {
          setErrorMessage(error);
        } else if (requiresEmailConfirmation) {
          setSuccessMessage(
            'Cadastro realizado! Um link de confirmação foi enviado para seu email. Confirme para acessar.'
          );
          setMode('signin');
        } else if (user) {
          onAuthSuccess(user);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setMode('signin');
    setEmail(DEFAULT_DEMO_USER.email);
    setPassword('ifpa2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Subtle Decorations */}
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

          <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-emerald-200/90 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span>IFPA Campus Breves (Marajó/PA)</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Entrar no Sistema
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Novo Pesquisador
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Status / Alert Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name Field (Only in Sign Up) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ábner Lucas"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Institucional ou Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@ifpa.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Senha de Acesso
                </label>
                {mode === 'signin' && (
                  <span className="text-[10px] text-slate-400">
                    Mínimo 6 caracteres
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
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
                  <span>Validando com o banco de dados...</span>
                </>
              ) : mode === 'signin' ? (
                <>
                  <span>Entrar no MonitorAçaí</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Criar Conta de Pesquisador</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Box */}
          <div className="pt-3 border-t border-slate-100">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="text-[11px] text-slate-600">
                <strong className="text-slate-800 block">Acesso Rápido IFPA:</strong>
                <span className="font-mono text-slate-500">admin@ifpa.edu.br</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0"
              >
                Preencher
              </button>
            </div>
          </div>
        </div>

        {/* Card Footer Badge */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Acesso Restrito
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Database className="w-3 h-3 text-emerald-600" />
            PostgreSQL • Supabase
          </span>
        </div>
      </div>
    </div>
  );
};

