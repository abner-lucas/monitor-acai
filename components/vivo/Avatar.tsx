'use client';

import React, { useState } from 'react';

const TAMANHOS = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-lg',
  lg: 'h-28 w-28 text-4xl',
} as const;

/**
 * Foto do usuário em círculo; sem foto (ou se ela falhar ao carregar), mostra a inicial do nome.
 * O coordenador ganha um anel na cor do broto para ser reconhecido de longe.
 */
export function Avatar({
  nome,
  url,
  destaque = false,
  tamanho = 'sm',
  className = '',
}: {
  nome: string;
  url?: string | null;
  destaque?: boolean;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const mostrarFoto = !!url && falhou !== url;
  const inicial = (nome.trim()[0] || '?').toUpperCase();

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold ring-2 ${
        destaque ? 'bg-broto-400 text-acai-950 ring-broto-400/50' : 'bg-acai-100 text-acai-900 ring-white/30'
      } ${TAMANHOS[tamanho]} ${className}`}
      aria-hidden="true"
    >
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem servida pela própria API, com cache
        <img src={url!} alt="" className="h-full w-full object-cover" onError={() => setFalhou(url!)} />
      ) : (
        inicial
      )}
    </span>
  );
}
