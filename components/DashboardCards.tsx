'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  MapPin,
  FileText,
  Dices,
  AlertTriangle,
  Radio,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CycleStats, PositionInfo, RotationRecord } from '@/lib/types';
import { getPositionById, CELLS_METADATA, DAYS_PER_ROTATION } from '@/lib/constants';
import Link from 'next/link';
import { calculateDaysRemaining, formatDateBR } from '@/lib/storage';
import type { Relatorio } from '@/lib/relatorio';
import { Contador } from '@/components/vivo/Contador';

interface DashboardCardsProps {
  stats: CycleStats;
  activeRecord: RotationRecord | null;
  availablePositions: PositionInfo[];
  /** Posição já sorteada para a próxima troca. */
  scheduledRecord: RotationRecord | null;
  onRegistrar: () => void;
  onAgendar: () => void;
  onSelectPosition: (positionId: number) => void;
  onOpenCycleComplete: () => void;
  /** Relatório de campo do rodízio em andamento, quando já preenchido. */
  relatorioAtivo?: Relatorio;
  codigoRelatorioAtivo?: string;
  hrefRelatorioAtivo?: string;
}

const EASE_VIVA = [0.16, 1, 0.3, 1] as const;

type Tom = 'ok' | 'atencao' | 'atraso' | 'vazio';

const TOM_ESTILO: Record<Tom, { anel: string; texto: string; selo: string }> = {
  ok: { anel: '#8fd88b', texto: 'text-broto-400', selo: 'bg-broto-400/15 text-broto-400 ring-broto-400/30' },
  atencao: { anel: '#f5c35b', texto: 'text-amber-300', selo: 'bg-amber-300/15 text-amber-200 ring-amber-300/30' },
  atraso: { anel: '#ff8a7a', texto: 'text-rose-300', selo: 'bg-rose-400/15 text-rose-200 ring-rose-300/30' },
  vazio: { anel: '#c9a9cf', texto: 'text-acai-300', selo: 'bg-white/10 text-acai-100 ring-white/15' },
};

/** Anel que esvazia ao longo dos 14 dias de permanência do sensor na planta. */
function AnelPermanencia({ diasRestantes, tom }: { diasRestantes: number; tom: Tom }) {
  const reduzir = useReducedMotion();
  const raio = 52;
  const circunferencia = 2 * Math.PI * raio;
  const fracao = Math.min(Math.max(diasRestantes / DAYS_PER_ROTATION, 0), 1);
  const cor = TOM_ESTILO[tom].anel;
  const atrasado = diasRestantes < 0;

  return (
    <div className="relative h-36 w-36 shrink-0 sm:h-44 sm:w-44">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={raio} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
        {/* Marcas de cada dia, como uma régua */}
        {Array.from({ length: DAYS_PER_ROTATION }).map((_, i) => {
          const angulo = (i / DAYS_PER_ROTATION) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={60 + Math.cos(angulo) * 41}
              y1={60 + Math.sin(angulo) * 41}
              x2={60 + Math.cos(angulo) * 44}
              y2={60 + Math.sin(angulo) * 44}
              stroke="rgb(255 255 255 / 0.25)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          );
        })}
        <motion.circle
          cx="60"
          cy="60"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          initial={{ strokeDashoffset: reduzir ? circunferencia * (1 - fracao) : circunferencia }}
          animate={{ strokeDashoffset: circunferencia * (1 - (atrasado ? 1 : fracao)) }}
          transition={{ duration: 1.2, ease: EASE_VIVA, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-display text-4xl font-semibold leading-none tabular-nums ${TOM_ESTILO[tom].texto}`}>
          {tom === 'vazio' ? '–' : Math.abs(diasRestantes)}
        </span>
        <span className="mt-1 text-xs text-acai-100/80">
          {tom === 'vazio' ? 'sem sensor' : atrasado ? 'dias de atraso' : diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
        </span>
      </div>
    </div>
  );
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  stats,
  activeRecord,
  availablePositions,
  scheduledRecord,
  onRegistrar,
  onAgendar,
  onSelectPosition,
  onOpenCycleComplete,
  relatorioAtivo,
  codigoRelatorioAtivo,
  hrefRelatorioAtivo,
}) => {
  const reduzir = useReducedMotion();
  const activePosition = activeRecord ? getPositionById(activeRecord.positionId) : null;
  const proximaPos = scheduledRecord ? getPositionById(scheduledRecord.positionId) : null;
  const diasProxima = scheduledRecord ? calculateDaysRemaining(scheduledRecord.installedAt) : 0;
  const activeCellMeta = activePosition ? CELLS_METADATA.find((c) => c.id === activePosition.cellId) : null;

  const daysLeft = stats.daysRemainingInCurrentPosition;
  let tom: Tom = 'ok';
  let situacao = daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`;
  if (!activeRecord) {
    tom = 'vazio';
    situacao = 'Sem sensor ativo';
  } else if (daysLeft < 0) {
    tom = 'atraso';
    situacao = `Troca atrasada (${Math.abs(daysLeft)}d)`;
  } else if (daysLeft === 0) {
    tom = 'atencao';
    situacao = 'Troca hoje!';
  } else if (daysLeft <= 2) {
    tom = 'atencao';
    situacao = daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`;
  }

  const isCycleComplete = stats.completedCount >= 18;

  return (
    <section aria-label="Situação do rodízio" className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Painel ao vivo: sensor em campo */}
      <motion.div
        id="card-local-ativo"
        initial={reduzir ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_VIVA }}
        className="grao relative flex flex-col overflow-hidden rounded-[28px] bg-acai-900 p-5 text-acai-100 sm:p-7 lg:col-span-7"
      >
        {/* Galhos de açaizeiro desenhados ao fundo */}
        <svg
          viewBox="0 0 300 200"
          className="pointer-events-none absolute -right-10 -top-6 h-64 w-96 text-white/[0.05]"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M150 190 Q ${150 + (i - 4) * 18} 110 ${150 + (i - 4) * 38} ${20 + Math.abs(i - 4) * 14}`}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-acai-100/90">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              {activeRecord && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-broto-400 opacity-60" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${activeRecord ? 'bg-broto-400' : 'bg-acai-300'}`} />
            </span>
            Sensor em campo
          </p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TOM_ESTILO[tom].selo}`}>
            {(tom === 'atraso' || tom === 'vazio') && <AlertTriangle className="h-3.5 w-3.5" />}
            {situacao}
          </span>
        </div>

        {activePosition && activeRecord ? (
          <div className="relative mt-5 flex flex-1 flex-col gap-6 sm:flex-row sm:items-center">
            <AnelPermanencia diasRestantes={daysLeft} tom={tom} />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-6xl font-semibold leading-none tracking-tight text-white tabular-nums">
                  {activePosition.formattedId}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold leading-tight text-white">
                    Célula {activePosition.cellId} · Planta {activePosition.plantIndex}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-acai-100/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {activeCellMeta?.name || 'Açaizal IFPA Breves'}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-sm">
                <div>
                  <dt className="text-xs text-acai-100/70">Instalação</dt>
                  <dd className="mt-0.5 font-semibold text-white tabular-nums">{formatDateBR(activeRecord.installedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-acai-100/70">Próxima troca</dt>
                  <dd className={`mt-0.5 font-semibold tabular-nums ${tom === 'atraso' ? 'text-rose-300' : tom === 'atencao' ? 'text-amber-200' : 'text-broto-400'}`}>
                    {formatDateBR(activeRecord.scheduledNextChange)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-acai-100/70">Responsável</dt>
                  <dd className="mt-0.5 truncate font-semibold text-white">{activeRecord.responsible.split('/')[0]}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                {/* Telemetria vem do relatório de campo; sem relatório, nada é exibido no lugar. */}
                {relatorioAtivo ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-acai-100/90">
                    {([
                      ['ZL6', relatorioAtivo.dados.telemetria.zl6, '4G'],
                      ['μMETOS', relatorioAtivo.dados.telemetria.umetos, 'NB-IoT'],
                    ] as const).map(([nome, t, sinal]) => (
                      <span key={nome} className="flex items-center gap-1.5">
                        <Radio className={`h-4 w-4 ${t.status === 'falha' ? 'text-rose-300' : 'text-broto-400'}`} />
                        <span>{nome}</span>
                        <strong className="font-semibold text-white tabular-nums">
                          {t.tensaoMv !== null ? `${t.tensaoMv.toLocaleString('pt-BR')} mV` : '–'}
                        </strong>
                        <span className="text-xs text-acai-300">
                          {t.status === 'falha' ? 'falha' : t.sinalFraco ? `${sinal} fraco` : sinal}
                        </span>
                      </span>
                    ))}
                    {hrefRelatorioAtivo && (
                      <Link href={hrefRelatorioAtivo} className="text-xs text-acai-300 underline-offset-2 hover:text-white hover:underline">
                        {codigoRelatorioAtivo}
                      </Link>
                    )}
                  </div>
                ) : (
                  hrefRelatorioAtivo && (
                    <Link
                      href={hrefRelatorioAtivo}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-acai-300/60 px-3.5 py-2 text-acai-100 transition-colors hover:border-broto-400 hover:text-white"
                    >
                      <FileText className="h-4 w-4" />
                      Preencher relatório {codigoRelatorioAtivo}
                    </Link>
                  )
                )}
                <button
                  type="button"
                  onClick={() => onSelectPosition(activePosition.id)}
                  className="group inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20 active:scale-[0.97] cursor-pointer"
                  title={`Ver posição #${activePosition.formattedId} no mapa esquemático do SAF`}
                >
                  Ver no mapa
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mt-5 flex flex-1 flex-col items-start gap-5 sm:flex-row sm:items-center">
            <AnelPermanencia diasRestantes={0} tom="vazio" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">Nenhum sensor ativo</p>
              <p className="mt-1 text-sm text-acai-100/80">Realize um sorteio para alocar o sensor.</p>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
        {/* Progresso do ciclo */}
        <motion.div
          id="card-progresso-ciclo"
          initial={reduzir ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_VIVA, delay: 0.08 }}
          className="flex flex-col justify-between rounded-[28px] bg-white p-5 ring-1 ring-folha-100 sm:p-6"
        >
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-grafite">Ciclo {stats.currentCycle}</h3>
              <span className="text-sm text-folha-700 tabular-nums">
                semana {stats.weeksElapsed} de {stats.totalWeeks}
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <p className="flex items-baseline gap-2">
                <Contador valor={stats.completedCount} className="font-display text-5xl font-semibold leading-none text-grafite tabular-nums" />
                <span className="text-sm text-slate-600">de {stats.totalPositions} posições amostradas</span>
              </p>
              <span className="font-display text-2xl font-semibold text-folha-700 tabular-nums">
                {stats.percentageCompleted}%
              </span>
            </div>

            {/* Régua de 18 posições: cada traço é uma planta do ciclo */}
            <div className="mt-4 flex h-3 gap-[3px]" role="img" aria-label={`${stats.completedCount} de ${stats.totalPositions} posições amostradas`}>
              {Array.from({ length: 18 }).map((_, idx) => {
                const isFilled = idx < stats.completedCount;
                const isActive = activeRecord && idx === stats.completedCount - 1;
                return (
                  <motion.span
                    key={idx}
                    initial={reduzir ? false : { scaleY: 0.2, opacity: 0.4 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: EASE_VIVA, delay: 0.3 + idx * 0.035 }}
                    className={`flex-1 origin-bottom rounded-[3px] ${
                      isActive ? 'bg-broto-500' : isFilled ? 'bg-folha-700' : 'bg-folha-100'
                    }`}
                  />
                );
              })}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-600">Amostradas</dt>
                <dd className="font-semibold text-grafite tabular-nums">{stats.completedCount} plantas</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-600">Disponíveis</dt>
                <dd className="font-semibold text-folha-700 tabular-nums">{stats.remainingCount} plantas</dd>
              </div>
            </dl>
          </div>

          {isCycleComplete && (
            <button
              onClick={onOpenCycleComplete}
              className="mt-4 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Ciclo Completo! Abrir Ciclo {stats.currentCycle + 1}</span>
            </button>
          )}
        </motion.div>

        {/* Próximo rodízio: muda conforme a situação do dia de campo */}
        <motion.div
          id="card-sorteio-destaque"
          initial={reduzir ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_VIVA, delay: 0.16 }}
          className="flex flex-col justify-between rounded-[28px] bg-folha-800 p-5 text-folha-50 sm:p-6"
        >
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-white">Próximo rodízio</h3>
              <span className="text-sm text-broto-400 tabular-nums">{availablePositions.length} para sortear</span>
            </div>

            {proximaPos && scheduledRecord ? (
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onSelectPosition(proximaPos.id)}
                  title="Ver no mapa"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-broto-400/70 font-display text-3xl font-semibold text-white tabular-nums hover:bg-white/10 cursor-pointer"
                >
                  {proximaPos.formattedId}
                </button>
                <div className="text-sm">
                  <p className="font-semibold text-white">
                    Célula {proximaPos.cellId}, planta {proximaPos.plantIndex}
                  </p>
                  <p className={diasProxima < 0 ? 'text-rose-200' : 'text-folha-100/90'}>
                    {diasProxima < 0
                      ? `Troca prevista em ${formatDateBR(scheduledRecord.installedAt)} (${Math.abs(diasProxima)}d de atraso)`
                      : diasProxima === 0
                      ? 'Troca prevista para hoje'
                      : `Troca prevista em ${formatDateBR(scheduledRecord.installedAt)}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-folha-100/90">
                {activeRecord
                  ? 'A próxima posição ainda não foi sorteada. Sorteie agora ou no dia da troca.'
                  : 'Registre a instalação para começar o rodízio deste ciclo.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {scheduledRecord || (!activeRecord && availablePositions.length > 0) ? (
              <button
                id="btn-sortear-principal"
                onClick={onRegistrar}
                className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-broto-400 px-4 py-2.5 text-sm font-semibold text-acai-950 transition-colors hover:bg-broto-500 active:scale-[0.98] cursor-pointer"
              >
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                <span>{activeRecord ? 'Registrar rodízio' : 'Registrar instalação'}</span>
              </button>
            ) : availablePositions.length > 0 ? (
              <>
                <button
                  id="btn-sortear-principal"
                  onClick={onAgendar}
                  className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-broto-400 px-4 py-2.5 text-sm font-semibold text-acai-950 transition-colors hover:bg-broto-500 active:scale-[0.98] cursor-pointer"
                >
                  <Dices className="h-4 w-4 transition-transform duration-500 ease-out group-hover:rotate-[200deg]" />
                  <span>Sortear próxima posição</span>
                </button>
                <button
                  onClick={onRegistrar}
                  className="min-h-10 rounded-full px-4 py-2 text-sm font-medium text-folha-50 ring-1 ring-white/20 hover:bg-white/10 cursor-pointer"
                >
                  Registrar rodízio de hoje
                </button>
              </>
            ) : (
              <button
                id="btn-finalizar-ciclo-principal"
                onClick={onOpenCycleComplete}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-amber-300 px-4 py-2.5 text-sm font-semibold text-acai-950 transition-colors hover:bg-amber-200 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Iniciar Novo Ciclo</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
