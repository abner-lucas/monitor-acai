'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dices, 
  X, 
  Calendar, 
  UserCheck, 
  FileText, 
  BatteryCharging, 
  Radio, 
  Check, 
  Sparkles,
  MapPin,
  Clock,
  RotateCw,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PositionInfo, RotationRecord } from '@/lib/types';
import { addDaysToDate, formatDateBR, getTodayLocalDateStr } from '@/lib/storage';

interface RaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePositions: PositionInfo[];
  currentActiveRecord: RotationRecord | null;
  currentCycle: number;
  onConfirmDraw: (data: {
    positionId: number;
    installedAt: string;
    scheduledNextChange: string;
    responsible: string;
    notes: string;
    batteryLevel: number;
    signalQuality: 'Excelente' | 'Bom' | 'Regular';
  }) => Promise<void>;
}

export const RaffleModal: React.FC<RaffleModalProps> = ({
  isOpen,
  onClose,
  availablePositions,
  currentActiveRecord,
  currentCycle,
  onConfirmDraw,
}) => {
  const [isShuffling, setIsShuffling] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<PositionInfo | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  // Form states
  const todayStr = getTodayLocalDateStr();
  const [installedAt, setInstalledAt] = useState(todayStr);
  const [scheduledNextChange, setScheduledNextChange] = useState(addDaysToDate(todayStr, 14));
  const [responsible, setResponsible] = useState('Ábner Lucas / Técnico IFPA');
  const [notes, setNotes] = useState('Instalação e alinhamento dos sensores FDR em campo.');
  const [batteryLevel, setBatteryLevel] = useState(98);
  const [signalQuality, setSignalQuality] = useState<'Excelente' | 'Bom' | 'Regular'>('Excelente');

  const performRaffle = useCallback(() => {
    if (availablePositions.length === 0) return;

    setIsShuffling(true);
    let counter = 0;
    const totalFlips = 16;
    const intervalMs = 60;

    const timer = setInterval(() => {
      counter++;
      const randomIndex = Math.floor(Math.random() * availablePositions.length);
      setDisplayIndex(randomIndex);

      if (counter >= totalFlips) {
        clearInterval(timer);
        const chosen = availablePositions[Math.floor(Math.random() * availablePositions.length)];
        setSelectedCandidate(chosen);
        setIsShuffling(false);

        try {
          confetti({
            particleCount: 35,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#059669', '#10b981', '#34d399', '#0284c7'],
          });
        } catch {}
      }
    }, intervalMs);
  }, [availablePositions]);

  useEffect(() => {
    if (!isOpen || availablePositions.length === 0) return;
    const timeout = setTimeout(() => {
      performRaffle();
    }, 50);
    return () => clearTimeout(timeout);
  }, [isOpen, performRaffle, availablePositions.length]);

  const handleDateChange = (newDate: string) => {
    setInstalledAt(newDate);
    setScheduledNextChange(addDaysToDate(newDate, 14));
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirmDraw({
        positionId: selectedCandidate.id,
        installedAt,
        scheduledNextChange,
        responsible: responsible.trim() || 'Equipe Agrícola IFPA',
        notes: notes.trim(),
        batteryLevel,
        signalQuality,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayPosition = isShuffling
    ? availablePositions[displayIndex] || availablePositions[0]
    : selectedCandidate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="modal-sorteio-container"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
      >
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Sorteio de Rodízio Sem Reposição
              </h3>
              <p className="text-xs text-emerald-200">
                Ciclo {currentCycle} • {availablePositions.length} posições disponíveis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isConfirming}
            aria-label="Fechar modal de sorteio"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {availablePositions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-800 font-bold mb-1">
                Todas as 18 posições do Ciclo {currentCycle} já foram sorteadas!
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Inicie um novo ciclo para reiniciar a amostragem.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Raffle Result Card */}
              <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-emerald-200 text-center relative overflow-hidden">
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  {isShuffling ? 'Sorteando...' : 'Local Selecionado'}
                </div>

                {currentDisplayPosition && (
                  <div>
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white border border-emerald-600 shadow-xs mb-1.5 font-mono font-black text-2xl text-emerald-900">
                      {currentDisplayPosition.formattedId}
                    </div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Célula {currentDisplayPosition.cellId} — Planta {currentDisplayPosition.plantIndex}
                    </h2>

                    <p className="text-xs text-slate-600 mt-0.5 flex items-center justify-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      SAF IFPA Breves • Rodízio Quinzenal
                    </p>
                  </div>
                )}

                {!isShuffling && availablePositions.length > 1 && (
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={performRaffle}
                    className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RotateCw className="w-3 h-3" />
                    Sortear Novamente
                  </button>
                )}
              </div>

              {/* Confirmation Form */}
              <form onSubmit={handleConfirm} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      Data da Troca
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isConfirming}
                      value={installedAt}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      Próxima Troca (+14d)
                    </label>
                    <input
                      type="date"
                      required
                      disabled={isConfirming}
                      value={scheduledNextChange}
                      onChange={(e) => setScheduledNextChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Responsible */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Responsável Técnico
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isConfirming}
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
                  />
                </div>

                {/* Telemetry */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-700" />
                      Bateria (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      disabled={isConfirming}
                      value={batteryLevel}
                      onChange={(e) => setBatteryLevel(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-emerald-700" />
                      Sinal LoRa
                    </label>
                    <select
                      value={signalQuality}
                      disabled={isConfirming}
                      onChange={(e) => setSignalQuality(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden disabled:bg-slate-100"
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
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    disabled={isConfirming}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none disabled:bg-slate-100"
                  />
                </div>

                {currentActiveRecord && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    O sensor atual na <strong>Célula {currentActiveRecord.cellId}, Planta {currentActiveRecord.plantIndex}</strong> será concluído em {formatDateBR(installedAt)}.
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isConfirming}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isShuffling || !selectedCandidate || isConfirming}
                    className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirmar Rodízio</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
