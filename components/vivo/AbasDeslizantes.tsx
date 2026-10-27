'use client';

import React, { useRef } from 'react';
import { motion } from 'motion/react';

export interface Aba<T extends string> {
  id: T;
  rotulo: string;
  icone?: React.ComponentType<{ className?: string }>;
}

/**
 * Abas com o indicador deslizando entre as opções (layoutId) e navegação por setas.
 * `grupo` precisa ser único na página para os indicadores não se misturarem.
 */
export function AbasDeslizantes<T extends string>({
  abas,
  ativa,
  onMudar,
  grupo,
  rotuloGrupo,
  escuro = false,
}: {
  abas: Aba<T>[];
  ativa: T;
  onMudar: (id: T) => void;
  grupo: string;
  rotuloGrupo: string;
  escuro?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const aoTeclar = (e: React.KeyboardEvent, indice: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const proximo = (indice + (e.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    onMudar(abas[proximo].id);
    refs.current[proximo]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={rotuloGrupo}
      className={`relative inline-flex items-center gap-0.5 rounded-full p-1 text-sm font-medium ${
        escuro ? 'bg-white/10' : 'bg-folha-100/70 ring-1 ring-folha-100'
      }`}
    >
      {abas.map((aba, i) => {
        const selecionada = aba.id === ativa;
        const Icone = aba.icone;
        return (
          <button
            key={aba.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={selecionada}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onMudar(aba.id)}
            onKeyDown={(e) => aoTeclar(e, i)}
            className={`relative z-0 flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors duration-300 cursor-pointer ${
              selecionada
                ? escuro
                  ? 'text-acai-950'
                  : 'text-white'
                : escuro
                ? 'text-acai-100/80 hover:text-white'
                : 'text-folha-800 hover:text-folha-900'
            }`}
          >
            {selecionada && (
              <motion.span
                layoutId={`indicador-${grupo}`}
                className={`absolute inset-0 -z-10 rounded-full ${escuro ? 'bg-broto-400' : 'bg-folha-700'}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {Icone && <Icone className="h-4 w-4" />}
            <span>{aba.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
