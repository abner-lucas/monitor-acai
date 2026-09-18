'use client';

import React, { useEffect } from 'react';
import { Sparkles, Trophy, CheckCircle2, ArrowRight, X, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TOTAL_POSITIONS, TOTAL_WEEKS } from '@/lib/constants';

interface CycleCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCycle: number;
  onStartNewCycle: () => void;
}

export const CycleCompletedModal: React.FC<CycleCompletedModalProps> = ({
  isOpen,
  onClose,
  currentCycle,
  onStartNewCycle,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#059669', '#10b981', '#f59e0b', '#3b82f6'],
        });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Amostragem Completa
        </span>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Ciclo {currentCycle} Concluído com Sucesso!
        </h3>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Todas as <strong>{TOTAL_POSITIONS} posições</strong> do SAF de Açaí do IFPA Breves foram monitoradas ao longo das <strong>{TOTAL_WEEKS} semanas</strong> do ciclo de amostragem sem reposição.
        </p>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left">
          <div>
            <span className="text-[11px] text-slate-500 block">Posições</span>
            <strong className="text-base font-bold text-slate-900">18 de 18</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Duração Total</span>
            <strong className="text-base font-bold text-slate-900">36 Semanas</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Dias / Posição</span>
            <strong className="text-base font-bold text-emerald-700">14 Dias</strong>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Ao iniciar um novo ciclo, o histórico atual é preservado intacto e a lista de 18 posições fica 100% disponível para a nova rodada de sorteios do <strong>Ciclo {currentCycle + 1}</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
          >
            Revisar Histórico
          </button>
          <button
            id="btn-iniciar-novo-ciclo"
            onClick={() => {
              onStartNewCycle();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <span>Iniciar Ciclo {currentCycle + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
