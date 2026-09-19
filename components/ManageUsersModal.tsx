'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Code2,
  Database,
  Lock
} from 'lucide-react';
import { authService, SUPERUSER_EMAIL } from '@/lib/services/authService';
import { AuthorizedUser } from '@/lib/types';

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const SUPABASE_SQL_SCRIPT = `-- Execute no SQL Editor do seu projeto Supabase:
create table if not exists public.authorized_users (
  id text primary key,
  email text unique not null,
  full_name text not null,
  role text default 'pesquisador',
  password text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Habilitar RLS e criar políticas de acesso
alter table public.authorized_users enable row level security;

create policy "Permitir leitura de usuarios autorizados"
  on public.authorized_users for select using (true);

create policy "Permitir gerenciamento de usuarios autorizados"
  on public.authorized_users for all using (true);

-- Inserir superusuário coordenador
insert into public.authorized_users (id, email, full_name, role, password, is_active)
values (
  'usr_superuser_abner',
  'abner.lucas@ifpa.edu.br',
  'Prof. Me. Ábner Lucas (Coordenador SAF)',
  'superuser',
  'Ifpa@2026',
  true
)
on conflict (email) do update set 
  password = 'Ifpa@2026',
  role = 'superuser';
`;

export const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'add' | 'sql'>('users');

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Ifpa@2026');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await authService.getAuthorizedUsers();
      setUsers(list);
    } catch (err: any) {
      onShowToast('error', 'Erro ao carregar usuários', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setActiveTab('users');
    }
  }, [isOpen, loadUsers]);

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      onShowToast('error', 'Preenchimento incompleto', 'Informe todos os dados do pesquisador.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.addAuthorizedUser({
        fullName: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: 'pesquisador',
      });

      if (!res.success) {
        onShowToast('error', 'Falha ao autorizar', res.error || 'Erro desconhecido.');
      } else {
        onShowToast('success', 'Pesquisador Autorizado!', `${newName} (${newEmail}) agora pode acessar o sistema.`);
        setNewName('');
        setNewEmail('');
        setNewPassword('Ifpa@2026');
        await loadUsers();
        setActiveTab('users');
      }
    } catch (err: any) {
      onShowToast('error', 'Erro ao processar cadastro', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async (email: string, name: string) => {
    if (confirm(`Tem certeza que deseja revogar o acesso de "${name}" (${email})?`)) {
      try {
        const res = await authService.removeAuthorizedUser(email);
        if (res.success) {
          onShowToast('info', 'Acesso Revogado', `O pesquisador ${name} foi removido da lista de autorizados.`);
          await loadUsers();
        } else {
          onShowToast('error', 'Erro', res.error);
        }
      } catch (err: any) {
        onShowToast('error', 'Erro ao remover', err.message);
      }
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    onShowToast('success', 'Script Copiado', 'Cole o script SQL no editor do Supabase.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <Users className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Gerenciar Pesquisadores Autorizados
              </h2>
              <p className="text-xs text-emerald-200/90 font-medium">
                Controle de Acesso Restrito • Exclusivo do Superusuário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pesquisadores ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'add'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Autorizar Novo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Script SQL Supabase</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LIST OF USERS */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Consultando usuários autorizados...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Nenhum usuário cadastrado além do superusuário.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {users.map((u) => {
                    const isSuper = u.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase();
                    return (
                      <div
                        key={u.id || u.email}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                              isSuper
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {(u.fullName?.[0] || u.email[0] || 'P').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {u.fullName}
                              </span>
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                                  Superusuário
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Pesquisador
                                </span>
                              )}
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isSuper ? (
                            <span className="text-[11px] text-slate-400 italic px-2">
                              Acesso Vitalício
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.email, u.fullName)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Revogar Acesso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD USER */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddUser} className="space-y-4 max-w-lg mx-auto py-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Apenas emails registrados aqui conseguirão efetuar login no MonitorAçaí.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo do Pesquisador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Maria Santos"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@ifpa.edu.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha Provisória de Acesso *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ifpa@2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono shadow-2xs"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-mono">
                    Padrão: Ifpa@2026
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Autorizar Pesquisador</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SQL SCRIPT */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-start gap-2">
                <Database className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Para sincronização multi-dispositivos via PostgreSQL, execute este script no{' '}
                  <strong className="text-slate-900">SQL Editor</strong> do painel Supabase:
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed max-h-72">
                  {SUPABASE_SQL_SCRIPT}
                </pre>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
