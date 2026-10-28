'use client';

import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

/**
 * Moldura comum das janelas (sorteio, registro, equipe).
 *
 * A rolagem fica na camada de fundo e a janela num bloco com altura mínima da tela:
 * centraliza quando cabe e, quando é mais alta que a tela, começa no topo e rola —
 * sem cortar o cabeçalho (o problema de centralizar direto num flex com overflow).
 */
export function Janela({
  titulo,
  subtitulo,
  icone,
  onFechar,
  bloquearFechar = false,
  largura = 'max-w-xl',
  rodape,
  children,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  icone?: React.ReactNode;
  onFechar: () => void;
  bloquearFechar?: boolean;
  largura?: string;
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduzir = useReducedMotion();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloquearFechar) onFechar();
    };
    window.addEventListener('keydown', esc);
    // Trava a rolagem da página por trás enquanto a janela está aberta.
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = anterior;
    };
  }, [bloquearFechar, onFechar]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-acai-950/60 backdrop-blur-xs">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          initial={reduzir ? false : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full ${largura} overflow-hidden rounded-[28px] bg-white shadow-2xl`}
        >
          <div className="flex items-start justify-between gap-3 px-6 pt-6">
            <div className="flex min-w-0 items-center gap-3">
              {icone && (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-acai-100 text-acai-800">{icone}</span>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-grafite">{titulo}</h2>
                {subtitulo && <p className="mt-0.5 text-sm text-slate-600">{subtitulo}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onFechar}
              disabled={bloquearFechar}
              aria-label="Fechar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-papel hover:text-grafite disabled:opacity-50 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-5">{children}</div>

          {rodape && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-folha-100 px-6 py-4">{rodape}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/** Estilos de campo e botões compartilhados pelas janelas. */
export const estilos = {
  campo:
    'w-full min-h-11 rounded-2xl border border-transparent bg-papel/70 px-3.5 py-2.5 text-sm text-grafite outline-hidden transition-colors focus:bg-white focus:ring-2 focus:ring-folha-600 disabled:opacity-60',
  rotulo: 'mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800',
  botaoPrincipal:
    'inline-flex min-h-11 items-center gap-2 rounded-full bg-acai-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-acai-800 disabled:opacity-50 cursor-pointer',
  botaoSecundario: 'min-h-10 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-papel disabled:opacity-50 cursor-pointer',
};
