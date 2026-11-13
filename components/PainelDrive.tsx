'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, CheckCircle2, ExternalLink, HardDrive, Loader2, Unplug } from 'lucide-react';
import { estilos } from '@/components/vivo/Janela';
import { fotoService, type EstadoDrive } from '@/lib/services/fotoService';

/**
 * Conexão com o Google Drive onde ficam as fotos originais dos relatórios (aba "Fotos" da Equipe).
 * Só o coordenador vê esta janela; a conexão vale para toda a equipe.
 */
export function PainelDrive({ onShowToast }: { onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void }) {
  const pathname = usePathname();
  const [drive, setDrive] = useState<EstadoDrive | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fotoService
      .drive()
      .then((d) => ativo && setDrive(d))
      .catch((err) => ativo && setErro(err instanceof Error ? err.message : 'Não foi possível consultar o Google Drive.'));
    return () => {
      ativo = false;
    };
  }, []);

  const desconectar = async () => {
    setDesconectando(true);
    try {
      setDrive(await fotoService.desconectarDrive());
      setConfirmando(false);
      onShowToast('info', 'Google Drive desconectado', 'As fotos já enviadas continuam na pasta do Drive.');
    } catch (err) {
      onShowToast('error', 'Erro ao desconectar', err instanceof Error ? err.message : undefined);
    } finally {
      setDesconectando(false);
    }
  };

  if (erro) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {erro}
      </p>
    );
  }
  if (!drive) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-600" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-folha-600" />
        <span className="text-sm">Consultando o Google Drive...</span>
      </div>
    );
  }

  return (
    <div>
      <div className={`rounded-[22px] p-5 ${drive.conectado ? 'bg-broto-100/60 ring-1 ring-folha-600/25' : 'bg-papel/70'}`}>
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              drive.conectado ? 'bg-folha-700 text-white' : 'bg-white text-slate-500 ring-1 ring-papel-linha'
            }`}
          >
            {drive.conectado ? <CheckCircle2 className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-grafite">
              {drive.conectado ? 'Google Drive conectado' : 'Google Drive não conectado'}
            </p>
            {drive.conectado ? (
              <p className="mt-0.5 break-all text-sm text-slate-700">
                Fotos guardadas em <strong className="font-semibold">{drive.conta}</strong>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-slate-700">
                {drive.configurado
                  ? 'Conecte a conta do projeto para a equipe poder enviar as fotos dos relatórios.'
                  : 'Faltam as credenciais do Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET) nas variáveis do servidor.'}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {drive.conectado && drive.pastaUrl && (
            <a href={drive.pastaUrl} target="_blank" rel="noreferrer" className={estilos.botaoPrincipal}>
              <ExternalLink className="h-4 w-4" />
              Abrir pasta das fotos
            </a>
          )}
          {drive.configurado && !drive.conectado && (
            // Navegação comum (não fetch): a rota leva à tela de consentimento do Google e volta para cá.
            <a href={`/api/drive/conectar?voltar=${encodeURIComponent(pathname)}`} className={estilos.botaoPrincipal}>
              <HardDrive className="h-4 w-4" />
              Conectar Google Drive
            </a>
          )}
          {drive.conectado &&
            (confirmando ? (
              <span className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={desconectar}
                  disabled={desconectando}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 cursor-pointer"
                >
                  {desconectando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmando(false)} className={estilos.botaoSecundario}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmando(true)} className={estilos.botaoSecundario}>
                Desconectar
              </button>
            ))}
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-sm text-slate-700">
        <li>
          <strong className="font-semibold text-grafite">Originais no Drive:</strong> cada foto vai direto do celular para a
          pasta do projeto, numa subpasta por relatório (Relatório_Breves_C1R1…), sem passar pela hospedagem.
        </li>
        <li>
          <strong className="font-semibold text-grafite">No site:</strong> só versões reduzidas, geradas pelo Drive. O botão
          “Baixar original” traz o arquivo completo.
        </li>
        <li>
          <strong className="font-semibold text-grafite">Acesso:</strong> o app só enxerga os arquivos que ele mesmo criou;
          a pasta é compartilhada como editora com abner.lucas@ifpa.edu.br.
        </li>
      </ul>
    </div>
  );
}
