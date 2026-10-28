'use client';

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Camera, Check, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { AuthUser } from '@/lib/types';
import { authService } from '@/lib/services/authService';
import { Janela, estilos } from '@/components/vivo/Janela';
import { Avatar } from '@/components/vivo/Avatar';

const LADO = 320; // px da foto salva (quadrada); fica nítida até no tamanho grande da tela
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Recorta o centro da imagem em quadrado e reduz para LADO×LADO no próprio navegador,
 * então só uns poucos KB chegam ao banco (fotos de celular têm vários MB).
 */
async function prepararFoto(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const lado = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  bitmap.close();
  const webp = canvas.toDataURL('image/webp', 0.85);
  // Navegadores sem WebP devolvem PNG; nesse caso usa JPEG, bem menor.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

export function PerfilModal({
  isOpen,
  onClose,
  usuario,
  onAviso,
}: {
  isOpen: boolean;
  onClose: () => void;
  usuario: AuthUser;
  onAviso: (tipo: 'success' | 'error' | 'info', titulo: string, mensagem?: string) => void;
}) {
  if (!isOpen) return null;
  return <Conteudo onClose={onClose} usuario={usuario} onAviso={onAviso} />;
}

function Conteudo({ onClose, usuario, onAviso }: Omit<Parameters<typeof PerfilModal>[0], 'isOpen'>) {
  const reduzir = useReducedMotion();
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const nome = usuario.fullName || usuario.email;
  const coordenador = usuario.role === 'superuser';
  const fotoAtual = previa ?? usuario.avatarUrl ?? null;

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErro('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (arquivo.size > 15 * 1024 * 1024) {
      setErro('A imagem tem mais de 15 MB. Escolha uma foto menor.');
      return;
    }
    try {
      setPrevia(await prepararFoto(arquivo));
    } catch {
      setErro('Não foi possível ler esta imagem.');
    }
  };

  const salvar = async (imagem: string | null) => {
    setSalvando(true);
    setErro(null);
    try {
      await authService.atualizarFoto(imagem);
      onAviso('success', imagem ? 'Foto atualizada' : 'Foto removida');
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a foto.');
      setSalvando(false);
    }
  };

  return (
    <Janela
      titulo="Minha foto"
      subtitulo="Aparece no menu e na lista da equipe."
      icone={<Camera className="h-5 w-5" />}
      onFechar={onClose}
      bloquearFechar={salvando}
      largura="max-w-md"
      rodape={
        <>
          {usuario.avatarUrl && !previa && (
            <button
              type="button"
              onClick={() => salvar(null)}
              disabled={salvando}
              className="mr-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Remover foto
            </button>
          )}
          <button type="button" onClick={onClose} disabled={salvando} className={estilos.botaoSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={() => previa && salvar(previa)} disabled={!previa || salvando} className={estilos.botaoPrincipal}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salvar foto
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        {/* Foto atual ou prévia, com o anel girando de leve enquanto há uma prévia por salvar */}
        <div className="relative">
          {previa && !reduzir && (
            <motion.span
              aria-hidden="true"
              className="absolute -inset-2 rounded-full border-2 border-dashed border-folha-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            />
          )}
          <motion.div key={fotoAtual ?? 'inicial'} initial={reduzir ? false : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <Avatar nome={nome} url={fotoAtual} destaque={coordenador} tamanho="lg" className="ring-4" />
          </motion.div>
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            aria-label="Escolher outra foto"
            className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-acai-900 text-white shadow-lg ring-4 ring-white hover:bg-acai-800 cursor-pointer"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-grafite">{nome}</p>
        <p className="text-sm text-slate-600">{usuario.email}</p>

        {/* Área para soltar a imagem (ou tocar para escolher, no celular abre a câmera ou a galeria) */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            escolher(e.dataTransfer.files[0]);
          }}
          className={`mt-5 flex w-full cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-folha-600 ${
            arrastando ? 'border-folha-600 bg-broto-100/60' : 'border-papel-linha bg-papel/50 hover:border-folha-600/60'
          }`}
        >
          <ImagePlus className="h-6 w-6 text-folha-600" />
          <span className="font-medium text-grafite">{previa ? 'Escolher outra imagem' : 'Escolher uma imagem'}</span>
          <span className="text-xs text-slate-600">ou arraste aqui · JPG, PNG ou WebP. O centro vira um quadrado.</span>
          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              escolher(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {erro && (
          <p role="alert" className="mt-3 w-full rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {erro}
          </p>
        )}
      </div>
    </Janela>
  );
}
