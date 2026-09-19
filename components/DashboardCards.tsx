'use client';

import React from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  BatteryCharging, 
  Dices, 
  CheckCircle2, 
  AlertTriangle,
  Radio,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CycleStats, PositionInfo, RotationRecord } from '@/lib/types';
import { getPositionById, CELLS_METADATA } from '@/lib/constants';
import { formatDateBR } from '@/lib/storage';

interface DashboardCardsProps {
  stats: CycleStats;
  activeRecord: RotationRecord | null;
  availablePositions: PositionInfo[];
  onOpenRaffle: () => void;
  onSelectPosition: (positionId: number) => void;
  onOpenCycleComplete: () => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  stats,
  activeRecord,
  availablePositions,
  onOpenRaffle,
  onSelectPosition,
  onOpenCycleComplete,
}) => {
  const activePosition = activeRecord ? getPositionById(activeRecord.positionId) : null;
  const activeCellMeta = activePosition ? CELLS_METADATA.find((c) => c.id === activePosition.cellId) : null;

  const daysLeft = stats.daysRemainingInCurrentPosition;
  let countdownBadge = {
    text: daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Clock,
  };

  if (!activeRecord) {
    countdownBadge = {
      text: 'Sem sensor ativo',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: AlertTriangle,
    };
  } else if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    countdownBadge = {
      text: `Troca atrasada (${overdueDays}d)`,
      color: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: AlertTriangle,
    };
  } else if (daysLeft === 0) {
    countdownBadge = {
      text: 'Troca hoje!',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Clock,
    };
  } else if (daysLeft <= 2) {
    countdownBadge = {
      text: daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Clock,
    };
  }

  const isCycleComplete = stats.completedCount >= 18;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Local Ativo */}
      <div 
        id="card-local-ativo"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              Sensor em Campo
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${countdownBadge.color}`}>
              <countdownBadge.icon className="w-3.5 h-3.5" />
              {countdownBadge.text}
            </span>
          </div>

          {activePosition && activeRecord ? (
            <div>
              <div className="flex items-baseline gap-2 mb-0.5">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Célula {activePosition.cellId} - Planta {activePosition.plantIndex}
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                  #{activePosition.formattedId}
                </span>
              </div>
              
              <p className="text-xs text-slate-600 mb-3 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {activeCellMeta?.name || 'Açaizal IFPA Breves'}
              </p>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mb-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Instalação:</span>
                  <span className="font-semibold text-slate-900">{formatDateBR(activeRecord.installedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Próxima Troca:</span>
                  <span className={`font-semibold ${daysLeft < 0 ? 'text-rose-700 font-bold' : daysLeft === 0 ? 'text-amber-800 font-bold' : 'text-emerald-800'}`}>
                    {formatDateBR(activeRecord.scheduledNextChange)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Responsável:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[160px]">{activeRecord.responsible.split('/')[0]}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-700 pt-1.5 border-t border-slate-100">
                <span className="flex items-center gap-1 font-medium">
                  <BatteryCharging className="w-4 h-4 text-emerald-600" />
                  <strong>{activeRecord.batteryLevel || 96}%</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <strong>{activeRecord.signalQuality || 'Excelente'}</strong>
                </span>
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {activeCellMeta?.dataloggerId || 'DLG-01'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-1 opacity-80" />
              <p className="text-xs font-semibold text-slate-800">Nenhum sensor ativo</p>
              <p className="text-xs text-slate-600 font-medium">Realize um sorteio para alocar o sensor.</p>
            </div>
          )}
        </div>

        {activePosition && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectPosition(activePosition.id)}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-all cursor-pointer py-1 px-1.5 -ml-1.5 rounded-lg hover:bg-emerald-50 active:scale-95"
              title={`Ver posição #${activePosition.formattedId} no mapa esquemático do SAF`}
            >
              <span>Ver no Mapa</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-emerald-600" />
            </button>
            <span className="text-xs text-slate-600 font-medium">14 dias por ponto</span>
          </div>
        )}
      </div>

      {/* Card 2: Progresso do Ciclo */}
      <div 
        id="card-progresso-ciclo"
        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Ciclo {stats.currentCycle}
            </span>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {stats.weeksElapsed} de {stats.totalWeeks} semanas
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.completedCount}
              </span>
              <span className="text-sm font-semibold text-slate-600">
                de {stats.totalPositions} posições
              </span>
            </div>
            <span className="text-xl font-black text-emerald-700">
              {stats.percentageCompleted}%
            </span>
          </div>

          {/* Segmented bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3 p-0.5 flex gap-0.5 border border-slate-200/60">
            {Array.from({ length: 18 }).map((_, idx) => {
              const isFilled = idx < stats.completedCount;
              const isActive = activeRecord && idx === stats.completedCount - 1;
              return (
                <div
                  key={idx}
                  className={`flex-1 h-full rounded-xs transition-all ${
                    isActive
                      ? 'bg-emerald-500'
                      : isFilled
                      ? 'bg-emerald-700'
                      : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <span className="text-slate-600 text-xs font-medium block mb-0.5">Amostradas</span>
              <strong className="text-slate-900 font-bold text-sm flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                {stats.completedCount} plantas
              </strong>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <span className="text-slate-600 text-xs font-medium block mb-0.5">Disponíveis</span>
              <strong className="text-emerald-800 font-bold text-sm flex items-center gap-1">
                <Dices className="w-4 h-4 text-emerald-600" />
                {stats.remainingCount} plantas
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
          {isCycleComplete ? (
            <button
              onClick={onOpenCycleComplete}
              className="w-full py-2 px-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Ciclo Completo! Abrir Ciclo {stats.currentCycle + 1}</span>
            </button>
          ) : (
            <span className="text-slate-600 text-xs font-medium">
              Rotação probabilística sem reposição (SAF Breves)
            </span>
          )}
        </div>
      </div>

      {/* Card 3: Ação de Sorteio */}
      <div 
        id="card-sorteio-destaque"
        className="bg-gradient-to-br from-emerald-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/90 text-emerald-100 border border-emerald-500/50">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Sorteio Aleatório
            </span>
            <span className="text-xs text-emerald-200 font-mono font-semibold">
              {availablePositions.length} restantes
            </span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-white mb-1">
            Próximo Rodízio
          </h3>
          <p className="text-xs text-emerald-100/90 mb-3 leading-relaxed">
            Sorteie a próxima planta para troca do sensor com permanência de 14 dias.
          </p>

          <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto mb-3">
            {availablePositions.slice(0, 10).map((pos) => (
              <span
                key={pos.id}
                className="px-2 py-0.5 bg-emerald-950/80 text-emerald-200 text-xs font-mono font-bold rounded-md border border-emerald-700/60"
              >
                #{pos.formattedId}
              </span>
            ))}
            {availablePositions.length > 10 && (
              <span className="text-xs text-emerald-300 font-bold self-center px-1">
                +{availablePositions.length - 10}
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          {availablePositions.length > 0 ? (
            <button
              id="btn-sortear-principal"
              onClick={onOpenRaffle}
              className="w-full py-2.5 px-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Dices className="w-4 h-4 text-slate-900" />
              <span>Sortear Posição</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
            </button>
          ) : (
            <button
              id="btn-finalizar-ciclo-principal"
              onClick={onOpenCycleComplete}
              className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Iniciar Novo Ciclo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
