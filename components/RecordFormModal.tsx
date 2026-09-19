'use client';

import React, { useState } from 'react';
import { X, Check, Calendar, UserCheck, FileText, BatteryCharging, Radio, Loader2, AlertCircle } from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import { POSITIONS_DATA } from '@/lib/constants';
import { addDaysToDate, getTodayLocalDateStr } from '@/lib/storage';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: RotationRecord | null;
  currentCycle: number;
  onSaveRecord: (data: {
    id?: string;
    cycleNumber: number;
    positionId: number;
    cellId: number;
    plantIndex: number;
    installedAt: string;
    scheduledNextChange: string;
    removedAt: string | null;
    responsible: string;
    notes: string;
    status: 'active' | 'completed' | 'scheduled';
    batteryLevel: number;
    signalQuality: 'Excelente' | 'Bom' | 'Regular';
  }) => Promise<void>;
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  currentCycle,
  onSaveRecord,
}) => {
  if (!isOpen) return null;

  return (
    <RecordFormModalContent
      key={recordToEdit ? recordToEdit.id : `new-${currentCycle}`}
      onClose={onClose}
      recordToEdit={recordToEdit}
      currentCycle={currentCycle}
      onSaveRecord={onSaveRecord}
    />
  );
};

interface ContentProps {
  onClose: () => void;
  recordToEdit: RotationRecord | null;
  currentCycle: number;
  onSaveRecord: (data: any) => Promise<void>;
}

const RecordFormModalContent: React.FC<ContentProps> = ({
  onClose,
  recordToEdit,
  currentCycle,
  onSaveRecord,
}) => {
  const isEditing = !!recordToEdit;
  const todayStr = getTodayLocalDateStr();

  const [cycleNumber, setCycleNumber] = useState<number>(() => recordToEdit ? recordToEdit.cycleNumber : currentCycle);
  const [positionId, setPositionId] = useState<number>(() => recordToEdit ? recordToEdit.positionId : 1);
  const [installedAt, setInstalledAt] = useState<string>(() => recordToEdit ? recordToEdit.installedAt : todayStr);
  const [scheduledNextChange, setScheduledNextChange] = useState<string>(() =>
    recordToEdit ? recordToEdit.scheduledNextChange : addDaysToDate(todayStr, 14)
  );
  const [removedAt, setRemovedAt] = useState<string>(() => (recordToEdit && recordToEdit.removedAt) ? recordToEdit.removedAt : '');
  const [responsible, setResponsible] = useState<string>(() => recordToEdit ? recordToEdit.responsible : 'Ábner Lucas / Técnico IFPA');
  const [status, setStatus] = useState<'active' | 'completed' | 'scheduled'>(() => recordToEdit ? recordToEdit.status : 'active');
  const [notes, setNotes] = useState<string>(() => recordToEdit ? (recordToEdit.notes || '') : 'Instalação de rotina em campo.');
  const [batteryLevel, setBatteryLevel] = useState<number>(() => recordToEdit?.batteryLevel ?? 98);
  const [signalQuality, setSignalQuality] = useState<'Excelente' | 'Bom' | 'Regular'>(
    () => recordToEdit?.signalQuality ?? 'Excelente'
  );

  // UX states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInstalledAtChange = (newDate: string) => {
    setInstalledAt(newDate);
    if (errors.installedAt) {
      setErrors((prev) => ({ ...prev, installedAt: '' }));
    }
    if (!recordToEdit) {
      setScheduledNextChange(addDaysToDate(newDate, 14));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!installedAt) {
      newErrors.installedAt = 'A data de instalação é obrigatória.';
    }

    if (!scheduledNextChange) {
      newErrors.scheduledNextChange = 'A previsão de troca é obrigatória.';
    } else if (installedAt && new Date(scheduledNextChange) < new Date(installedAt)) {
      newErrors.scheduledNextChange = 'A data de troca não pode ser anterior à data de instalação.';
    }

    if (!responsible || responsible.trim().length < 2) {
      newErrors.responsible = 'Informe o nome do responsável (mínimo 2 letras).';
    }

    if (cycleNumber < 1) {
      newErrors.cycleNumber = 'O ciclo deve ser maior ou igual a 1.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const selectedPos = POSITIONS_DATA.find((p) => p.id === Number(positionId)) || POSITIONS_DATA[0];

      await onSaveRecord({
        id: recordToEdit?.id,
        cycleNumber: Number(cycleNumber),
        positionId: selectedPos.id,
        cellId: selectedPos.cellId,
        plantIndex: selectedPos.plantIndex,
        installedAt,
        scheduledNextChange,
        removedAt: removedAt || null,
        responsible: responsible.trim(),
        notes: notes.trim(),
        status,
        batteryLevel: Number(batteryLevel),
        signalQuality,
      });

      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Erro ao salvar registro.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPosInfo = POSITIONS_DATA.find((p) => p.id === Number(positionId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base">
              {isEditing ? 'Editar Registro' : 'Novo Registro de Campo'}
            </h3>
            {isEditing && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/15 text-slate-200">
                {recordToEdit.id}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global form error message */}
        {errors.form && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            {/* Cycle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciclo
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={isSubmitting}
                value={cycleNumber}
                onChange={(e) => setCycleNumber(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
              />
              {errors.cycleNumber && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.cycleNumber}</p>
              )}
            </div>

            {/* Position Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Local SAF
              </label>
              <select
                value={positionId}
                disabled={isSubmitting}
                onChange={(e) => setPositionId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
              >
                {POSITIONS_DATA.map((p) => (
                  <option key={p.id} value={p.id}>
                    Célula {p.cellId} - Planta {p.plantIndex} (Pos #{p.formattedId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentPosInfo && (
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>Célula {currentPosInfo.cellId} • Planta {currentPosInfo.plantIndex}</span>
              <span className="text-slate-500 font-mono">Posição #{currentPosInfo.formattedId}</span>
            </div>
          )}

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Data de Instalação *
              </label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={installedAt}
                onChange={(e) => handleInstalledAtChange(e.target.value)}
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono disabled:bg-slate-100 ${
                  errors.installedAt ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.installedAt && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.installedAt}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Previsão da Próxima Troca *
              </label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={scheduledNextChange}
                onChange={(e) => {
                  setScheduledNextChange(e.target.value);
                  if (errors.scheduledNextChange) {
                    setErrors((prev) => ({ ...prev, scheduledNextChange: '' }));
                  }
                }}
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono disabled:bg-slate-100 ${
                  errors.scheduledNextChange ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.scheduledNextChange && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.scheduledNextChange}</p>
              )}
            </div>
          </div>

          {/* Removal Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Retirada
              </label>
              <input
                type="date"
                disabled={isSubmitting}
                value={removedAt}
                onChange={(e) => setRemovedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono disabled:bg-slate-100"
              />
              <span className="text-[10px] text-slate-400">Em branco se ainda ativo em campo</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                disabled={isSubmitting}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
              >
                <option value="active">🟢 Ativo (em campo)</option>
                <option value="completed">🔵 Concluído</option>
                <option value="scheduled">⚪ Agendado</option>
              </select>
            </div>
          </div>

          {/* Responsible */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              Responsável Técnico *
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={responsible}
              onChange={(e) => {
                setResponsible(e.target.value);
                if (errors.responsible) setErrors((prev) => ({ ...prev, responsible: '' }));
              }}
              placeholder="Ex: Ábner Lucas / Técnico IFPA"
              className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100 ${
                errors.responsible ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {errors.responsible && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.responsible}</p>
            )}
          </div>

          {/* Telemetry */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-700" />
                Bateria (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                disabled={isSubmitting}
                value={batteryLevel}
                onChange={(e) => setBatteryLevel(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-700" />
                Sinal LoRa
              </label>
              <select
                value={signalQuality}
                disabled={isSubmitting}
                onChange={(e) => setSignalQuality(e.target.value as any)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
              >
                <option value="Excelente">Excelente</option>
                <option value="Bom">Bom</option>
                <option value="Regular">Regular</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              Observações de Campo
            </label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sensores FDR nivelados, transmissão via LoRaWAN OK..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none disabled:bg-slate-100"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
