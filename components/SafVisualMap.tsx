'use client';

import React, { useState, useRef } from 'react';
import {
  Map,
  LayoutGrid,
  Info,
  CheckCircle2,
  Clock,
  Radio,
  ChevronRight,
  ExternalLink,
  Eye
} from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { PositionInfo, RotationRecord, PositionStatus } from '@/lib/types';
import { AbasDeslizantes } from '@/components/vivo/AbasDeslizantes';
import { POSITIONS_DATA, CELLS_METADATA } from '@/lib/constants';
import { getPositionStatusInCycle, formatDateBR } from '@/lib/storage';

interface SafVisualMapProps {
  records: RotationRecord[];
  currentCycle: number;
  selectedPositionId: number | null;
  onSelectPosition: (positionId: number) => void;
  onOpenRaffle: () => void;
  /** Nome da unidade piloto mostrado no texto do mapa. */
  local: string;
  /** Abre o relatório de campo do rodízio da planta selecionada. */
  onOpenReport?: (recordId: string) => void;
}

export const SafVisualMap: React.FC<SafVisualMapProps> = ({
  records,
  currentCycle,
  selectedPositionId,
  onSelectPosition,
  onOpenRaffle,
  local,
  onOpenReport,
}) => {
  const [viewMode, setViewMode] = useState<'schematic' | 'grid'>('schematic');
  const reduzir = useReducedMotion();
  const EASE_VIVA = [0.16, 1, 0.3, 1] as const;
  // O mapa rola na horizontal no celular: a animação parte da área do mapa inteira,
  // não de cada elemento, senão as plantas fora da faixa visível nunca apareceriam.
  const refMapa = useRef<HTMLDivElement>(null);
  const mapaEmVista = useInView(refMapa, { once: true, amount: 0.25 });

  const selectedPosition = POSITIONS_DATA.find((p) => p.id === selectedPositionId);
  const selectedPositionRecord = records.find(
    (r) => r.cycleNumber === currentCycle && r.positionId === selectedPositionId
  );
  const selectedPositionStatus = selectedPositionId
    ? getPositionStatusInCycle(selectedPositionId, records, currentCycle)
    : null;

  // Triangle coordinates mapping for SVG schematic
  // viewBox="0 0 1060 620"
  const TRIANGLES = [
    // Top Row (Triangles pointing down)
    {
      cellId: 1,
      label: 'Célula 1',
      logger: { x: 240, y: 175 },
      points: '190,135 290,135 240,260',
      vertexIds: [1, 7, 13],
    },
    {
      cellId: 2,
      label: 'Célula 2',
      logger: { x: 555, y: 175 },
      points: '505,135 605,135 555,260',
      vertexIds: [2, 8, 14],
    },
    {
      cellId: 3,
      label: 'Célula 3',
      logger: { x: 870, y: 175 },
      points: '820,135 920,135 870,260',
      vertexIds: [3, 9, 15],
    },
    // Bottom Row (Triangles pointing up)
    {
      cellId: 4,
      label: 'Célula 4',
      logger: { x: 190, y: 450 },
      points: '190,375 85,495 290,495',
      vertexIds: [10, 4, 16],
    },
    {
      cellId: 5,
      label: 'Célula 5',
      logger: { x: 505, y: 450 },
      points: '505,375 400,495 605,495',
      vertexIds: [11, 5, 17],
    },
    {
      cellId: 6,
      label: 'Célula 6',
      logger: { x: 815, y: 450 },
      points: '815,375 710,495 895,495',
      vertexIds: [12, 6, 18],
    },
  ];

  // Additional background plants / agroforestry context items in SVG
  const BACKGROUND_ACAI = [
    { x: 70, y: 40 }, { x: 180, y: 40 }, { x: 290, y: 40 }, { x: 400, y: 40 }, { x: 510, y: 40 }, { x: 620, y: 40 }, { x: 730, y: 40 }, { x: 840, y: 40 }, { x: 950, y: 40 },
    { x: 390, y: 135 }, { x: 710, y: 135 },
    { x: 70, y: 260 }, { x: 390, y: 260 }, { x: 710, y: 260 }, { x: 990, y: 260 },
    { x: 70, y: 375 }, { x: 390, y: 375 }, { x: 710, y: 375 }, { x: 990, y: 375 },
    { x: 190, y: 495 }, { x: 505, y: 495 }, { x: 815, y: 495 },
    { x: 70, y: 580 }, { x: 180, y: 580 }, { x: 290, y: 580 }, { x: 400, y: 580 }, { x: 510, y: 580 }, { x: 620, y: 580 }, { x: 730, y: 580 }, { x: 840, y: 580 }, { x: 950, y: 580 }
  ];

  const SECONDARY_CROPS = [
    { x: 125, y: 135 }, { x: 240, y: 135 }, { x: 345, y: 135 }, { x: 450, y: 135 }, { x: 555, y: 135 }, { x: 660, y: 135 }, { x: 765, y: 135 }, { x: 870, y: 135 }, { x: 975, y: 135 },
    { x: 135, y: 260 }, { x: 300, y: 260 }, { x: 450, y: 260 }, { x: 615, y: 260 }, { x: 765, y: 260 }, { x: 930, y: 260 },
    { x: 135, y: 375 }, { x: 280, y: 375 }, { x: 440, y: 375 }, { x: 595, y: 375 }, { x: 750, y: 375 }, { x: 905, y: 375 },
    { x: 135, y: 495 }, { x: 240, y: 495 }, { x: 345, y: 495 }, { x: 450, y: 495 }, { x: 555, y: 495 }, { x: 660, y: 495 }, { x: 765, y: 495 }, { x: 855, y: 495 }, { x: 955, y: 495 }
  ];

  const SPRINKLERS = [
    { x: 205, y: 75 }, { x: 360, y: 75 }, { x: 520, y: 75 }, { x: 680, y: 75 }, { x: 840, y: 75 },
    { x: 150, y: 295 }, { x: 310, y: 295 }, { x: 465, y: 295 }, { x: 625, y: 295 }, { x: 785, y: 295 }, { x: 940, y: 295 },
    { x: 240, y: 535 }, { x: 420, y: 535 }, { x: 580, y: 535 }, { x: 740, y: 535 }, { x: 900, y: 535 }
  ];

  return (
    <section id="saf-visual-matrix" aria-labelledby="titulo-mapa-saf" className="scroll-mt-24 mb-12 overflow-hidden rounded-[28px] bg-white ring-1 ring-folha-100">
      {/* Panel Header */}
      <div className="flex flex-col justify-between gap-4 px-5 pt-6 pb-4 sm:flex-row sm:items-end sm:px-7">
        <div>
          <h2 id="titulo-mapa-saf" className="font-display text-2xl font-semibold tracking-tight text-grafite sm:text-3xl">
            Planta baixa do SAF
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            6 células triangulares e 18 plantas no açaizal de {local}. Toque em um número para ver a planta.
          </p>
        </div>

        <AbasDeslizantes
          grupo="mapa-saf"
          rotuloGrupo="Forma de visualizar o SAF"
          abas={[
            { id: 'schematic', rotulo: 'Planta baixa', icone: Map },
            { id: 'grid', rotulo: 'Por célula', icone: LayoutGrid },
          ]}
          ativa={viewMode}
          onMudar={setViewMode}
        />
      </div>

      {/* Main View Area */}
      <div className="px-3 pb-5 sm:px-6 sm:pb-7">
        {/* VIEW 1: SCHEMATIC SVG MAP */}
        {viewMode === 'schematic' && (
          <div className="space-y-4">
            <div ref={refMapa} className="papel-desenho relative w-full overflow-x-auto rounded-[20px] ring-1 ring-papel-linha p-2 sm:p-4">
              <div className="min-w-[800px] w-full max-w-[1020px] mx-auto">
                <svg
                  viewBox="0 0 1060 620"
                  className="w-full h-auto select-none"
                  aria-label="Planta baixa do SAF com as 6 células triangulares e as 18 posições de plantas"
                  style={{ maxHeight: '550px' }}
                >
                  <defs>
                    {/* Active Pulsing Radial Glow */}
                    <radialGradient id="activeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6cc36a" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#2a7457" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Microaspersors */}
                  {SPRINKLERS.map((s, idx) => (
                    <g key={`sprinkler-${idx}`} transform={`translate(${s.x}, ${s.y})`}>
                      <circle cx="0" cy="0" r="8" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
                      <polygon points="0,-4 3,3 -3,3" fill="#0284c7" />
                    </g>
                  ))}

                  {/* Secondary crops (small botanical stars) */}
                  {SECONDARY_CROPS.map((c, idx) => (
                    <g key={`sec-${idx}`} transform={`translate(${c.x}, ${c.y})`} opacity="0.55">
                      <circle cx="0" cy="0" r="6" fill="#ecfccb" stroke="#84cc16" strokeWidth="1" />
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="#65a30d" strokeWidth="1" />
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="#65a30d" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Background Açaí Palms */}
                  {BACKGROUND_ACAI.map((p, idx) => (
                    <g key={`acai-${idx}`} transform={`translate(${p.x}, ${p.y})`} opacity="0.35">
                      <circle cx="0" cy="0" r="11" fill="#d1fae5" stroke="#059669" strokeWidth="1" strokeDasharray="2,2" />
                      <path d="M0 -8 L0 8 M-8 0 L8 0 M-6 -6 L6 6 M-6 6 L6 -6" stroke="#047857" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Triangular Cells Perimeter (Red Boundaries) */}
                  {TRIANGLES.map((tri) => (
                    <g key={`cell-tri-${tri.cellId}`}>
                      {/* Triangular perimeter polygon */}
                      <motion.polygon
                        points={tri.points}
                        fill="rgba(194, 54, 43, 0.05)"
                        stroke="#c2362b"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        initial={reduzir ? false : { pathLength: 0, fillOpacity: 0 }}
                        animate={mapaEmVista ? { pathLength: 1, fillOpacity: 1 } : undefined}
                        transition={{ duration: 0.8, ease: EASE_VIVA, delay: tri.cellId * 0.06 }}
                      />

                      {/* Datalogger Stem (Purple Circle in center) */}
                      <g transform={`translate(${tri.logger.x}, ${tri.logger.y})`}>
                        <circle cx="0" cy="0" r="14" fill="#523159" stroke="#2a1730" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="5" fill="#ffffff" />
                        <text
                          x="0"
                          y="24"
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#3b2242"
                        >
                          Haste {tri.cellId}
                        </text>
                      </g>

                      {/* Cell Label Header */}
                      <text
                        x={tri.logger.x}
                        y={tri.cellId <= 3 ? 100 : 540}
                        textAnchor="middle"
                        fontSize="15"
                        fontWeight="600"
                        fill="#24302b"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {tri.label}
                      </text>
                    </g>
                  ))}

                  {/* 18 Plant Nodes (The vertices of the 6 cells) */}
                  {POSITIONS_DATA.map((pos) => {
                    const status = getPositionStatusInCycle(pos.id, records, currentCycle);
                    const isSelected = selectedPositionId === pos.id;

                    // Color theme per status
                    let fillColor = '#ffffff';
                    let strokeColor = '#8a9a90';
                    let textColor = '#24302b';

                    if (status === 'active') {
                      fillColor = '#e3f5e1';
                      strokeColor = '#1f5e45';
                      textColor = '#143f2e';
                    } else if (status === 'completed') {
                      fillColor = '#dcecf6';
                      strokeColor = '#1f5f88';
                      textColor = '#1f5f88';
                    } else if (status === 'scheduled') {
                      fillColor = '#f1e7f2';
                      strokeColor = '#523159';
                      textColor = '#3b2242';
                    }

                    return (
                      <g
                        key={`pos-node-${pos.id}`}
                        transform={`translate(${pos.coordinates.x}, ${pos.coordinates.y})`}
                        onClick={() => onSelectPosition(pos.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectPosition(pos.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`Posição ${pos.formattedId}, célula ${pos.cellId}, planta ${pos.plantIndex}: ${status === 'active' ? 'sensor ativo' : status === 'completed' ? 'concluída' : status === 'scheduled' ? 'sorteada para a próxima troca' : 'disponível'}`}
                        className="cursor-pointer outline-none transition-transform duration-300 hover:scale-110 focus-visible:scale-110"
                        style={{ transformOrigin: `${pos.coordinates.x}px ${pos.coordinates.y}px` }}
                      >
                        <motion.g
                          initial={reduzir ? false : { opacity: 0, scale: 0.4 }}
                          animate={mapaEmVista ? { opacity: 1, scale: 1 } : undefined}
                          transition={{ duration: 0.45, ease: EASE_VIVA, delay: 0.2 + pos.id * 0.02 }}
                        >
                        {/* Active Sensor Pulse Glow */}
                        {status === 'active' && (
                          <circle cx="0" cy="0" r="32" fill="url(#activeGlow)">
                            <animate
                              attributeName="r"
                              values="24;36;24"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.8;0.3;0.8"
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}

                        {/* Highlight ring if selected */}
                        {isSelected && (
                          <circle
                            cx="0"
                            cy="0"
                            r="30"
                            fill="none"
                            stroke="#523159"
                            strokeWidth="3"
                            strokeDasharray="6,4"
                          >
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              from="0"
                              to="360"
                              dur="10s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}

                        {/* Node Container Box */}
                        <rect
                          x="-20"
                          y="-20"
                          width="40"
                          height="40"
                          rx="10"
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '3.5' : '2.5'}
                          strokeDasharray={status === 'scheduled' ? '5 3' : undefined}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                        />

                        {/* Position Number */}
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fontSize="17"
                          fontWeight="600"
                          fill={textColor}
                          style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {pos.formattedId}
                        </text>

                        {/* Small Status Dot or Checkmark */}
                        {status === 'active' && (
                          <circle cx="16" cy="-16" r="6" fill="#6cc36a" stroke="#ffffff" strokeWidth="1.5" />
                        )}
                        {status === 'completed' && (
                          <circle cx="16" cy="-16" r="6" fill="#1f5f88" stroke="#ffffff" strokeWidth="1.5" />
                        )}

                        {/* Bottom Tag */}
                        <rect
                          x="-24"
                          y="23"
                          width="48"
                          height="14"
                          rx="3"
                          fill="#ffffff"
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="33"
                          textAnchor="middle"
                          fontSize="8.5"
                          fontWeight="bold"
                          fill="#475569"
                        >
                          P{pos.plantIndex}
                        </text>
                        </motion.g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Interactive Legend Matching the Engineering Drawing */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-sm">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-broto-100 border-2 border-folha-700" />
                  <span className="text-slate-700 font-medium">Com sensor agora</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-agua-100 border-2 border-agua-700" />
                  <span className="text-slate-700 font-medium">Concluída no ciclo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-acai-100 border-2 border-dashed border-acai-700" />
                  <span className="text-slate-700 font-medium">Sorteada (próxima troca)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-[#8a9a90]" />
                  <span className="text-slate-700 font-medium">Disponível para sorteio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-acai-700 border border-acai-900" />
                  <span className="text-slate-700 font-medium">Haste do datalogger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-1 bg-lapis rounded-full" />
                  <span className="text-slate-700 font-medium">Limite da célula triangular</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: CELL GRID VIEW (6 CARDS WITH 3 PLANTS EACH) */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CELLS_METADATA.map((cell) => {
              const cellPositions = POSITIONS_DATA.filter((p) => p.cellId === cell.id);
              const activeInCell = cellPositions.find(
                (p) => getPositionStatusInCycle(p.id, records, currentCycle) === 'active'
              );

              return (
                <motion.div
                  key={cell.id}
                  initial={reduzir ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_VIVA, delay: cell.id * 0.06 }}
                  className={`rounded-[20px] p-4 transition-colors ${
                    activeInCell
                      ? 'bg-broto-100/60 ring-2 ring-folha-700/60'
                      : 'bg-folha-50/60 ring-1 ring-folha-100 hover:ring-folha-600/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold text-grafite">{cell.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 ring-1 ring-papel-linha">
                        {cell.dataloggerId}
                      </span>
                    </div>
                    {activeInCell && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-folha-700 text-white">
                        Sensor ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-3">{cell.description}</p>

                  <div className="space-y-2">
                    {cellPositions.map((pos) => {
                      const status = getPositionStatusInCycle(pos.id, records, currentCycle);
                      const isSelected = selectedPositionId === pos.id;
                      const posRecord = records.find(
                        (r) => r.cycleNumber === currentCycle && r.positionId === pos.id
                      );

                      return (
                        <div
                          key={pos.id}
                          onClick={() => onSelectPosition(pos.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectPosition(pos.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-sm cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white ring-2 ring-acai-700'
                              : status === 'active'
                              ? 'bg-white ring-1 ring-folha-600/40 font-medium'
                              : status === 'completed'
                              ? 'bg-agua-100/60 text-slate-700'
                              : status === 'scheduled'
                              ? 'bg-acai-100/70 text-slate-700'
                              : 'bg-white/70 hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-white ring-1 ring-papel-linha flex items-center justify-center font-display font-semibold text-grafite tabular-nums">
                              {pos.formattedId}
                            </span>
                            <div>
                              <span className="font-semibold block text-slate-900">Planta {pos.plantIndex}</span>
                              <span className="text-xs text-slate-600">
                                {status === 'active' && posRecord && `Instalado em ${formatDateBR(posRecord.installedAt)}`}
                                {status === 'completed' && posRecord && `Coletado em ${formatDateBR(posRecord.removedAt || posRecord.installedAt)}`}
                                {status === 'scheduled' && posRecord && `Troca prevista em ${formatDateBR(posRecord.installedAt)}`}
                                {status === 'available' && 'Aguardando sorteio'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-folha-700 text-white">
                                <Radio className="w-3 h-3" />
                                Monitorando
                              </span>
                            )}
                            {status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-agua-100 text-agua-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Concluída
                              </span>
                            )}
                            {status === 'scheduled' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-acai-800 border border-dashed border-acai-700">
                                Sorteada
                              </span>
                            )}
                            {status === 'available' && (
                              <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                Disponível
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Selected Position Detail Card */}
        <AnimatePresence mode="wait">
        {selectedPosition && (
          <motion.div
            key={selectedPosition.id}
            id="saf-selected-position-card"
            aria-live="polite"
            initial={reduzir ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduzir ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: EASE_VIVA }}
            className="mt-5 p-4 rounded-[20px] bg-acai-100/60 ring-1 ring-acai-300/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-acai-900 flex items-center justify-center font-display font-semibold text-2xl text-white tabular-nums">
                {selectedPosition.formattedId}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-semibold text-grafite text-base sm:text-lg">
                    Célula {selectedPosition.cellId} • Planta {selectedPosition.plantIndex} (Posição {selectedPosition.formattedId})
                  </h4>
                  {selectedPositionStatus === 'active' && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Ativo Agora
                    </span>
                  )}
                  {selectedPositionStatus === 'completed' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Concluído no Ciclo {currentCycle}
                    </span>
                  )}
                  {selectedPositionStatus === 'scheduled' && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full text-acai-800 border border-dashed border-acai-700">
                      Sorteada para a próxima troca
                    </span>
                  )}
                  {selectedPositionStatus === 'available' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 text-slate-700">
                      Disponível para Sorteio
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Célula {selectedPosition.cellId} ({CELLS_METADATA.find(c => c.id === selectedPosition.cellId)?.name}) • Planta {selectedPosition.plantIndex}
                  {selectedPositionRecord && (selectedPositionStatus === 'scheduled' ? ` • Troca prevista em: ${formatDateBR(selectedPositionRecord.installedAt)}` : ` • Instalado em: ${formatDateBR(selectedPositionRecord.installedAt)}`)}
                  {selectedPositionRecord?.removedAt && ` • Coletado em: ${formatDateBR(selectedPositionRecord.removedAt)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {selectedPositionRecord && selectedPositionStatus !== 'scheduled' && onOpenReport && (
                <button
                  onClick={() => onOpenReport(selectedPositionRecord.id)}
                  className="min-h-10 px-4 py-2 text-sm font-semibold bg-acai-900 hover:bg-acai-800 text-white rounded-full transition-colors flex items-center gap-1.5 active:scale-[0.97] cursor-pointer"
                >
                  Relatório
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedPositionStatus === 'available' && (
                <button
                  onClick={onOpenRaffle}
                  className="min-h-10 px-4 py-2 text-sm font-semibold bg-folha-700 hover:bg-folha-800 text-white rounded-full transition-colors flex items-center gap-1.5 active:scale-[0.97]"
                >
                  Sortear Agora
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onSelectPosition(0)}
                aria-label="Fechar detalhes da planta selecionada"
                className="min-h-10 px-4 py-2 text-sm font-medium text-slate-700 hover:text-grafite bg-white rounded-full ring-1 ring-acai-300/60 hover:bg-acai-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </section>
  );
};
