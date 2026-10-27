'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser } from '@/lib/types';
import { authService } from '@/lib/services/authService';
import { LoginScreen } from '@/components/LoginScreen';
import { ToastContainer, ToastMessage, ToastType } from '@/components/Toast';

interface ContextoSessao {
  usuario: AuthUser;
  sair: () => Promise<void>;
  aviso: (tipo: ToastType, titulo: string, mensagem?: string) => void;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function useSessao(): ContextoSessao {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSessao fora de <Sessao>');
  return ctx;
}

/**
 * Login compartilhado pelas duas unidades: fica acima das páginas de Breves e Muaná,
 * então trocar de unidade não pede login de novo.
 */
export function Sessao({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<AuthUser | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [avisos, setAvisos] = useState<ToastMessage[]>([]);

  const aviso = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setAvisos((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setAvisos((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const removerAviso = useCallback((id: string) => {
    setAvisos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelado = false;
    authService.getCurrentUser().then((user) => {
      if (cancelado) return;
      setUsuario(user);
      setVerificando(false);
    });
    const cancelarInscricao = authService.onAuthStateChange((user) => {
      if (!cancelado) setUsuario(user);
    });
    return () => {
      cancelado = true;
      cancelarInscricao();
    };
  }, []);

  const sair = useCallback(async () => {
    try {
      await authService.signOut();
      setUsuario(null);
      aviso('info', 'Sessão encerrada', 'Você saiu com sucesso do MonitorAçaí.');
    } catch (err) {
      aviso('error', 'Erro ao sair', err instanceof Error ? err.message : undefined);
    }
  }, [aviso]);

  if (verificando) {
    return (
      <div className="min-h-screen bg-acai-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-broto-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-acai-100">Verificando credenciais de acesso...</span>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <>
        <ToastContainer toasts={avisos} onDismiss={removerAviso} />
        <LoginScreen
          onAuthSuccess={(user) => {
            setUsuario(user);
            aviso('success', 'Acesso Autorizado', `Bem-vindo(a), ${user.fullName || user.email}!`);
          }}
        />
      </>
    );
  }

  return (
    <Contexto.Provider value={{ usuario, sair, aviso }}>
      <ToastContainer toasts={avisos} onDismiss={removerAviso} />
      {children}
    </Contexto.Provider>
  );
}
