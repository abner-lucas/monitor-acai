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
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { authService, SUPERUSER_EMAIL } from '@/lib/services/authService';
import { AuthorizedUser } from '@/lib/types';

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'add'>('users');

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setNewPassword('');
    }
  }, [isOpen, loadUsers]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'Ifpa@';
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setShowPassword(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      onShowToast('error', 'Preenchimento incompleto', 'Informe o nome e o email do pesquisador.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      onShowToast('error', 'Senha curta', 'A senha deve conter no mínimo 6 caracteres.');
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
        onShowToast('success', 'Pesquisador Autorizado!', `${newName} (${newEmail}) foi cadastrado com sucesso.`);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setShowPassword(false);
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
          onShowToast('info', 'Acesso Revogado', `O pesquisador ${name} foi removido com sucesso.`);
          await loadUsers();
        } else {
          onShowToast('error', 'Erro ao revogar', res.error);
        }
      } catch (err: any) {
        onShowToast('error', 'Erro ao remover', err.message);
      }
    }
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
              <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                Controle de Acesso Restrito • Exclusivo do Superusuário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pesquisadores ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Autorizar Novo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LIST OF USERS */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-medium">Carregando lista de pesquisadores...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-slate-600 text-xs font-medium">
                  Nenhum usuário cadastrado no sistema.
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
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {u.fullName}
                              </span>
                              {isSuper ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                  Superusuário
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Pesquisador
                                </span>
                              )}
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 font-mono truncate mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isSuper ? (
                            <span className="text-xs text-slate-500 italic px-2 font-medium">
                              Acesso Vitalício
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.email, u.fullName)}
                              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title={`Revogar acesso de ${u.fullName}`}
                              aria-label={`Revogar acesso de ${u.fullName}`}
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
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
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
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Senha Provisória de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gerar Senha Segura</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Digite ou gere uma senha (mínimo 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-8 h-8 flex items-center justify-center absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Mínimo de 6 caracteres. O pesquisador poderá alterá-la futuramente.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
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
