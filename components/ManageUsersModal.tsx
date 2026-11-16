'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Eye, EyeOff, HardDrive, KeyRound, Loader2, PauseCircle, PlayCircle, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { authService, SUPERUSER_EMAIL } from '@/lib/services/authService';
import { AuthorizedUser } from '@/lib/types';
import { Janela, estilos } from '@/components/vivo/Janela';
import { AbasDeslizantes } from '@/components/vivo/AbasDeslizantes';
import { Avatar } from '@/components/vivo/Avatar';
import { PainelDrive } from '@/components/PainelDrive';
import { useSessao } from '@/components/app/Sessao';
import { PAPEIS, PAPEIS_ORDEM, problemaSenha, type Papel } from '@/lib/papeis';

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
  for (;;) {
    const sorteio = new Uint32Array(14);
    crypto.getRandomValues(sorteio);
    const senha = Array.from(sorteio, (n) => caracteres[n % caracteres.length]).join('');
    if (!problemaSenha(senha)) return senha;
  }
}

/** Senha provisória acabada de criar: mostrada uma única vez para o administrador repassar. */
function AvisoSenha({ nome, email, senha, onFechar }: { nome: string; email: string; senha: string; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `MonitorAçaí (https://monitoracai.profabnerlucas.com)\nEmail: ${email}\nSenha provisória: ${senha}\nNo primeiro acesso o sistema pede para criar uma senha sua.`;
  return (
    <div className="mb-4 rounded-2xl bg-broto-100/70 p-4 ring-1 ring-folha-600/25" role="status">
      <p className="text-sm font-semibold text-grafite">Senha provisória de {nome}</p>
      <p className="mt-1 break-all font-mono text-base text-grafite">{senha}</p>
      <p className="mt-1 text-xs text-slate-700">
        Ela aparece só agora. Envie por um canal seguro; no primeiro acesso a pessoa cria a própria senha.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(texto).catch(() => undefined);
            setCopiado(true);
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-acai-900 px-3.5 text-xs font-semibold text-white hover:bg-acai-800 cursor-pointer"
        >
          {copiado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? 'Copiado' : 'Copiar mensagem de acesso'}
        </button>
        <button type="button" onClick={onFechar} className={estilos.botaoSecundario}>
          Pronto
        </button>
      </div>
    </div>
  );
}

function Conteudo({ onClose, onShowToast }: Omit<ManageUsersModalProps, 'isOpen'>) {
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'add' | 'drive'>('users');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRole, setNewRole] = useState<Papel>('visualizador');
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; email: string; senha: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { usuario } = useSessao();

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
    const problema = problemaSenha(newPassword, newEmail.trim().toLowerCase());
    if (problema) {
      onShowToast('error', 'Senha provisória fraca', problema);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.addAuthorizedUser({
        fullName: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      if (!res.success) {
        onShowToast('error', 'Falha ao autorizar', res.error || 'Erro desconhecido.');
      } else {
        onShowToast('success', 'Acesso criado', `${newName} entra como ${PAPEIS[newRole].rotulo.toLowerCase()}.`);
        setSenhaGerada({ nome: newName.trim(), email: newEmail.trim().toLowerCase(), senha: newPassword });
        setNewRole('visualizador');
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

  const alterar = async (u: AuthorizedUser, mudancas: { role?: Papel; ativo?: boolean; novaSenha?: string }, sucesso: string) => {
    setOcupado(u.email);
    try {
      const atualizado = await authService.atualizarUsuario(u.email, mudancas);
      setUsers((lista) => lista.map((x) => (x.email === u.email ? atualizado : x)));
      onShowToast('success', sucesso);
      return true;
    } catch (err) {
      onShowToast('error', 'Não foi possível alterar', err instanceof Error ? err.message : undefined);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const redefinirSenha = async (u: AuthorizedUser) => {
    if (!confirm(`Gerar uma nova senha provisória para ${u.fullName}? A senha atual deixa de funcionar e a pessoa sai de todas as sessões.`)) return;
    const senha = gerarSenha();
    if (await alterar(u, { novaSenha: senha }, 'Senha redefinida')) setSenhaGerada({ nome: u.fullName, email: u.email, senha });
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
      titulo="Equipe e acessos"
      subtitulo="Quem pode entrar no MonitorAçaí e o que cada pessoa pode fazer."
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
              Criar acesso
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
            { id: 'add', rotulo: 'Novo acesso', icone: UserPlus },
            { id: 'drive', rotulo: 'Fotos', icone: HardDrive },
          ]}
          ativa={activeTab}
          onMudar={setActiveTab}
        />
      </div>

      {senhaGerada && activeTab !== 'drive' && <AvisoSenha {...senhaGerada} onFechar={() => setSenhaGerada(null)} />}

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
              const isSuper = u.role === 'superuser';
              // O coordenador do projeto e o próprio administrador logado não perdem o acesso por aqui.
              const protegido = u.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase() || u.id === usuario.id;
              const travado = ocupado === u.email;
              return (
                <li
                  key={u.id || u.email}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ${isSuper ? 'bg-acai-100/60' : 'bg-papel/60'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar nome={u.fullName || u.email} url={u.avatarUrl} destaque={isSuper} tamanho="md" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate font-semibold text-grafite">{u.fullName}</span>
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-acai-900 px-2 py-0.5 text-xs font-semibold text-white">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {PAPEIS.superuser.rotulo}
                          </span>
                        ) : (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-folha-800 ring-1 ring-folha-100">
                            {PAPEIS[u.role].rotulo}
                          </span>
                        )}
                        {u.trocarSenha && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Senha provisória</span>
                        )}
                        {!u.isActive && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Suspenso</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{u.email}</p>
                    </div>
                  </div>
                  {protegido ? (
                    <span className="shrink-0 text-xs text-slate-500">{u.id === usuario.id ? 'Você' : 'Coordenador'}</span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                    {travado && <Loader2 className="mr-1 h-4 w-4 animate-spin text-folha-600" aria-label="Salvando" />}
                    <select
                      aria-label={`Nível de acesso de ${u.fullName}`}
                      value={u.role}
                      disabled={travado}
                      onChange={(e) => alterar(u, { role: e.target.value as Papel }, `${u.fullName}: ${PAPEIS[e.target.value as Papel].rotulo.toLowerCase()}`)}
                      className="min-h-10 max-w-[11rem] rounded-full bg-white px-3 text-sm text-grafite ring-1 ring-papel-linha outline-hidden focus:ring-2 focus:ring-folha-600 disabled:opacity-60"
                    >
                      {PAPEIS_ORDEM.map((p) => (
                        <option key={p} value={p}>
                          {PAPEIS[p].rotulo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={travado}
                      onClick={() => redefinirSenha(u)}
                      title={`Nova senha provisória para ${u.fullName}`}
                      aria-label={`Nova senha provisória para ${u.fullName}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-grafite disabled:opacity-50 cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={travado}
                      onClick={() => alterar(u, { ativo: !u.isActive }, u.isActive ? `${u.fullName} suspenso` : `${u.fullName} reativado`)}
                      title={u.isActive ? `Suspender ${u.fullName}` : `Reativar ${u.fullName}`}
                      aria-label={u.isActive ? `Suspender ${u.fullName}` : `Reativar ${u.fullName}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-grafite disabled:opacity-50 cursor-pointer"
                    >
                      {u.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={travado}
                      onClick={() => handleRemoveUser(u.email, u.fullName)}
                      title={`Revogar acesso de ${u.fullName}`}
                      aria-label={`Revogar acesso de ${u.fullName}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
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
                minLength={10}
                placeholder="Mínimo de 10 caracteres, com letras e números"
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
            <p className="mt-1 text-xs text-slate-600">
              É provisória: no primeiro acesso a pessoa é obrigada a criar uma senha própria.
            </p>
          </div>

          <fieldset>
            <legend className={estilos.rotulo}>Nível de acesso</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PAPEIS_ORDEM.map((p) => (
                <label
                  key={p}
                  className={`flex cursor-pointer flex-col rounded-2xl p-3 text-sm ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-folha-600 ${
                    newRole === p ? 'bg-broto-100/60 ring-folha-600/40' : 'bg-papel/60 ring-transparent hover:bg-papel'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-grafite">
                    <input
                      type="radio"
                      name="eq-papel"
                      value={p}
                      checked={newRole === p}
                      onChange={() => setNewRole(p)}
                      className="h-4 w-4 accent-[var(--color-folha-700)]"
                    />
                    {PAPEIS[p].rotulo}
                  </span>
                  <span className="mt-1 text-xs text-slate-600">{PAPEIS[p].descricao}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      )}

      {activeTab === 'drive' && <PainelDrive onShowToast={onShowToast} />}
    </Janela>
  );
}
