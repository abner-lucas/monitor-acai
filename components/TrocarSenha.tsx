'use client';

import React, { useId, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, LogOut } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { AuthUser } from '@/lib/types';
import { SENHA_MINIMA, problemaSenha } from '@/lib/papeis';
import { MarcaAcai } from '@/components/vivo/MarcaAcai';
import { CelulaDesenhada } from '@/components/vivo/CelulaDesenhada';
import { estilos } from '@/components/vivo/Janela';

function CampoSenha({
  rotulo,
  valor,
  onMudar,
  autoComplete,
  dica,
}: {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
  autoComplete: string;
  dica?: string;
}) {
  const id = useId();
  const [ver, setVer] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={estilos.rotulo}>
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={id}
          type={ver ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          className={`${estilos.campo} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? 'Ocultar senha' : 'Exibir senha'}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-grafite cursor-pointer"
        >
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {dica && <p className="mt-1 text-xs text-slate-600">{dica}</p>}
    </div>
  );
}

/** Regras da senha nova, marcadas conforme a pessoa digita. */
function Requisitos({ senha }: { senha: string }) {
  const itens = [
    { ok: senha.length >= SENHA_MINIMA, texto: `Pelo menos ${SENHA_MINIMA} caracteres` },
    { ok: /[A-Za-z]/.test(senha) && /\d/.test(senha), texto: 'Letras e números' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {itens.map((i) => (
        <li key={i.texto} className={`flex items-center gap-1 ${i.ok ? 'text-folha-700' : 'text-slate-500'}`}>
          <Check className={`h-3.5 w-3.5 ${i.ok ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

/** Formulário de troca da própria senha: usado no primeiro acesso e em "Minha conta". */
export function FormularioSenha({
  email,
  rotuloAtual = 'Senha atual',
  textoBotao = 'Salvar nova senha',
  onTrocada,
}: {
  email: string;
  rotuloAtual?: string;
  textoBotao?: string;
  onTrocada: (user: AuthUser) => void;
}) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const problema = problemaSenha(nova, email);
    if (problema) return setErro(problema);
    if (nova !== confirma) return setErro('A confirmação não é igual à nova senha.');
    if (nova === atual) return setErro('A nova senha deve ser diferente da atual.');
    setEnviando(true);
    try {
      onTrocada(await authService.trocarSenha(atual, nova));
      setAtual('');
      setNova('');
      setConfirma('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      {/* Ajuda o gerenciador de senhas do navegador a salvar a senha certa. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <CampoSenha rotulo={rotuloAtual} valor={atual} onMudar={setAtual} autoComplete="current-password" />
      <div className="space-y-2">
        <CampoSenha rotulo="Nova senha" valor={nova} onMudar={setNova} autoComplete="new-password" />
        <Requisitos senha={nova} />
      </div>
      <CampoSenha rotulo="Repita a nova senha" valor={confirma} onMudar={setConfirma} autoComplete="new-password" />
      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      )}
      <button type="submit" disabled={enviando} className={`${estilos.botaoPrincipal} w-full justify-center`}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {textoBotao}
      </button>
    </form>
  );
}

/** Tela que aparece no lugar do painel enquanto o usuário estiver com a senha provisória. */
export function TelaTrocarSenha({
  usuario,
  onTrocada,
  onSair,
}: {
  usuario: AuthUser;
  onTrocada: (user: AuthUser) => void;
  onSair: () => void;
}) {
  return (
    <div className="grao relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-acai-950 px-4 py-8">
      <CelulaDesenhada className="pointer-events-none absolute -left-24 top-1/2 w-[640px] max-w-none -translate-y-1/2 opacity-60 sm:left-[4%]" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="px-7 pt-8">
          <div className="flex items-center gap-3">
            <MarcaAcai className="h-12 w-11 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-grafite">Crie a sua senha</h1>
              <p className="truncate text-sm text-slate-600">{usuario.email}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-700">
            Olá{usuario.fullName ? `, ${usuario.fullName.split(' ')[0]}` : ''}! Você entrou com a senha provisória enviada pelo
            coordenador. Para continuar, escolha uma senha só sua.
          </p>
        </div>
        <div className="px-7 pb-7 pt-5">
          <FormularioSenha
            email={usuario.email}
            rotuloAtual="Senha provisória"
            textoBotao="Salvar e entrar"
            onTrocada={onTrocada}
          />
          <button
            type="button"
            onClick={onSair}
            className="mx-auto mt-4 flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-papel hover:text-grafite cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
