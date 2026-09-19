'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import { formatDateBR } from '@/lib/storage';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RotationRecord | null;
  onConfirmDelete: (recordId: string, revertAvailability: boolean) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  record,
  onConfirmDelete,
}) => {
  const [revertAvailability, setRevertAvailability] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !record) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirmDelete(record.id, revertAvailability);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm sm:text-base">Excluir Registro</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Fechar modal de exclusão"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Deseja realmente excluir o registro{' '}
            <strong className="font-mono text-slate-900">{record.id}</strong> referente à{' '}
            <strong>
              Célula {record.cellId}, Planta {record.plantIndex} (Posição #{record.positionId < 10 ? `0${record.positionId}` : record.positionId})
            </strong>?
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                disabled={isDeleting}
                checked={revertAvailability}
                onChange={(e) => setRevertAvailability(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">
                  Liberar posição para novo sorteio
                </span>
                <span className="text-slate-600 block mt-0.5">
                  Permite sortear este local novamente no ciclo atual.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-75"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
