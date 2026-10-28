'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { authService, SUPERUSER_EMAIL } from '@/lib/services/authService';
import { AuthorizedUser } from '@/lib/types';
import { Janela, estilos } from '@/components/vivo/Janela';
import { AbasDeslizantes } from '@/components/vivo/AbasDeslizantes';

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ManageUsersModal: React.FC<ManageUsersModalProps> = ({ isOpen, onClose, onShowToast }) => {
  // Montada só quando abre: cada abertura começa na lista e recarrega os usuários.
  if (!isOpen) return null;
  return <Conteudo onClose={onClose} onShowToast={onShowToast} />;
};

/** Senha aleatória de 14 caracteres (letras, números e símbolos), gerada no navegador. */
function gerarSenha(): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const sorteio = new Uint32Array(14);
  crypto.getRandomValues(sorteio);
  return Array.from(sorteio, (n) => caracteres[n % caracteres.length]).join('');
}

function Conteudo({ onClose, onShowToast }: Omit<ManageUsersModalProps, 'isOpen'>) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'add'>('users');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await authService.getAuthorizedUsers());
    } catch (err) {
      onShowToast('error', 'Erro ao carregar usuários', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    let ativo = true;
    authService
      .getAuthorizedUsers()
      .then((lista) => ativo && setUsers(lista))
      .catch((err) => ativo && onShowToast('error', 'Erro ao carregar usuários', err instanceof Error ? err.message : undefined))
      .finally(() => ativo && setIsLoading(false));
    return () => {
      ativo = false;
    };
  }, [onShowToast]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      onShowToast('error', 'Preenchimento incompleto', 'Informe o nome e o email do pesquisador.');
      return;
    }
    if (newPassword.length < 6) {
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
        onShowToast('success', 'Pesquisador autorizado', `${newName} (${newEmail}) foi cadastrado.`);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setShowPassword(false);
        await loadUsers();
        setActiveTab('users');
      }
    } catch (err) {
      onShowToast('error', 'Erro ao processar cadastro', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async (email: string, name: string) => {
    if (!confirm(`Tem certeza que deseja revogar o acesso de "${name}" (${email})?`)) return;
    try {
      const res = await authService.removeAuthorizedUser(email);
      if (res.success) {
        onShowToast('info', 'Acesso revogado', `${name} foi removido.`);
        await loadUsers();
      } else {
        onShowToast('error', 'Erro ao revogar', res.error);
      }
    } catch (err) {
      onShowToast('error', 'Erro ao remover', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Janela
      titulo="Pesquisadores autorizados"
      subtitulo="Quem pode entrar no MonitorAçaí. Só o coordenador gerencia esta lista."
      icone={<Users className="h-5 w-5" />}
      onFechar={onClose}
      bloquearFechar={isSubmitting}
      largura="max-w-2xl"
      rodape={
        activeTab === 'add' ? (
          <>
            <button type="button" onClick={() => setActiveTab('users')} disabled={isSubmitting} className={estilos.botaoSecundario}>
              Cancelar
            </button>
            <button type="submit" form="form-pesquisador" disabled={isSubmitting} className={estilos.botaoPrincipal}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Autorizar pesquisador
            </button>
          </>
        ) : (
          <button type="button" onClick={onClose} className={estilos.botaoSecundario}>
            Fechar
          </button>
        )
      }
    >
      <div className="mb-5">
        <AbasDeslizantes
          grupo="equipe"
          rotuloGrupo="Equipe"
          abas={[
            { id: 'users', rotulo: `Equipe (${users.length})`, icone: Users },
            { id: 'add', rotulo: 'Autorizar novo', icone: UserPlus },
          ]}
          ativa={activeTab}
          onMudar={setActiveTab}
        />
      </div>

      {activeTab === 'users' &&
        (isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-600" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-folha-600" />
            <span className="text-sm">Carregando a equipe...</span>
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600">Nenhum usuário cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => {
              const isSuper = u.role === 'superuser' || u.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase();
              return (
                <li
                  key={u.id || u.email}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 ${isSuper ? 'bg-acai-100/60' : 'bg-papel/60'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${
                        isSuper ? 'bg-acai-900 text-white' : 'bg-folha-100 text-folha-800'
                      }`}
                      aria-hidden="true"
                    >
                      {(u.fullName?.[0] || u.email[0] || 'P').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-semibold text-grafite">{u.fullName}</span>
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-acai-900 px-2 py-0.5 text-xs font-semibold text-white">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Coordenador
                          </span>
                        ) : (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-folha-800 ring-1 ring-folha-100">
                            Pesquisador
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Suspenso</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{u.email}</p>
                    </div>
                  </div>
                  {isSuper ? (
                    <span className="shrink-0 text-xs text-slate-500">Não removível</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(u.email, u.fullName)}
                      title={`Revogar acesso de ${u.fullName}`}
                      aria-label={`Revogar acesso de ${u.fullName}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {activeTab === 'add' && (
        <form id="form-pesquisador" onSubmit={handleAddUser} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="eq-nome" className={estilos.rotulo}>
                Nome completo
              </label>
              <input
                id="eq-nome"
                required
                placeholder="Ex.: Maria Santos"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={estilos.campo}
              />
            </div>
            <div>
              <label htmlFor="eq-email" className={estilos.rotulo}>
                Email
              </label>
              <input
                id="eq-email"
                type="email"
                required
                placeholder="nome@ifpa.edu.br"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={estilos.campo}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="eq-senha" className={estilos.rotulo}>
                Senha provisória
              </label>
              <button
                type="button"
                onClick={() => {
                  setNewPassword(gerarSenha());
                  setShowPassword(true);
                }}
                className="mb-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-folha-700 hover:bg-folha-50 cursor-pointer"
              >
                <KeyRound className="h-4 w-4" />
                Gerar senha segura
              </button>
            </div>
            <div className="relative">
              <input
                id="eq-senha"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Mínimo de 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${estilos.campo} pr-12 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-grafite cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">Envie a senha ao pesquisador por um canal seguro.</p>
          </div>
        </form>
      )}
    </Janela>
  );
}
