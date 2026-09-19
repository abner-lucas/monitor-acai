'use client';

import React, { useState, useEffect } from 'react';
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
import { PositionInfo, RotationRecord, PositionStatus } from '@/lib/types';
import { POSITIONS_DATA, CELLS_METADATA } from '@/lib/constants';
import { getPositionStatusInCycle, formatDateBR } from '@/lib/storage';

interface SafVisualMapProps {
  records: RotationRecord[];
  currentCycle: number;
  selectedPositionId: number | null;
  onSelectPosition: (positionId: number) => void;
  onOpenRaffle: () => void;
  preferredViewMode?: 'schematic' | 'grid';
}

export const SafVisualMap: React.FC<SafVisualMapProps> = ({
  records,
  currentCycle,
  selectedPositionId,
  onSelectPosition,
  onOpenRaffle,
  preferredViewMode,
}) => {
  const [viewMode, setViewMode] = useState<'schematic' | 'grid'>(preferredViewMode || 'schematic');

  useEffect(() => {
    if (preferredViewMode) {
      setViewMode(preferredViewMode);
    }
  }, [preferredViewMode]);

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
    <div id="saf-visual-matrix" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-8 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Matriz de Monitoramento Visual do SAF
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              Campus Breves
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            6 Células Triangulares • 18 Plantas • Rodízio quinzenal de 14 dias com sensores IoT
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setViewMode('schematic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'schematic'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mapa Esquemático</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
            <span>Grade de Células</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="p-4 sm:p-6">
        {/* VIEW 1: SCHEMATIC SVG MAP */}
        {viewMode === 'schematic' && (
          <div className="space-y-4">
            <div className="relative w-full overflow-x-auto bg-slate-50/70 rounded-2xl border border-slate-200 p-2 sm:p-4">
              <div className="min-w-[800px] w-full max-w-[1020px] mx-auto">
                <svg
                  viewBox="0 0 1060 620"
                  className="w-full h-auto select-none"
                  style={{ maxHeight: '550px' }}
                >
                  <defs>
                    {/* Active Pulsing Radial Glow */}
                    <radialGradient id="activeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0" />
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
                      <polygon
                        points={tri.points}
                        fill="rgba(239, 68, 68, 0.04)"
                        stroke="#dc2626"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                      />

                      {/* Datalogger Stem (Purple Circle in center) */}
                      <g transform={`translate(${tri.logger.x}, ${tri.logger.y})`}>
                        <circle cx="0" cy="0" r="14" fill="#a855f7" stroke="#7e22ce" strokeWidth="2.5" />
                        <circle cx="0" cy="0" r="5" fill="#ffffff" />
                        <text
                          x="0"
                          y="24"
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#6b21a8"
                        >
                          Haste {tri.cellId}
                        </text>
                      </g>

                      {/* Cell Label Header */}
                      <text
                        x={tri.logger.x}
                        y={tri.cellId <= 3 ? 100 : 540}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill="#334155"
                        className="tracking-wider uppercase"
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
                    let strokeColor = '#94a3b8';
                    let textColor = '#334155';
                    let badgeBg = '#f1f5f9';

                    if (status === 'active') {
                      fillColor = '#ecfdf5';
                      strokeColor = '#059669';
                      textColor = '#065f46';
                      badgeBg = '#10b981';
                    } else if (status === 'completed') {
                      fillColor = '#eff6ff';
                      strokeColor = '#2563eb';
                      textColor = '#1e40af';
                      badgeBg = '#3b82f6';
                    }

                    return (
                      <g
                        key={`pos-node-${pos.id}`}
                        transform={`translate(${pos.coordinates.x}, ${pos.coordinates.y})`}
                        onClick={() => onSelectPosition(pos.id)}
                        className="cursor-pointer transition-transform hover:scale-110"
                        style={{ transformOrigin: `${pos.coordinates.x}px ${pos.coordinates.y}px` }}
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
                            stroke="#0284c7"
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
                          rx="8"
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '3.5' : '2.5'}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                        />

                        {/* Position Number */}
                        <text
                          x="0"
                          y="5"
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="900"
                          fontFamily="monospace"
                          fill={textColor}
                        >
                          {pos.formattedId}
                        </text>

                        {/* Small Status Dot or Checkmark */}
                        {status === 'active' && (
                          <circle cx="16" cy="-16" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                        )}
                        {status === 'completed' && (
                          <circle cx="16" cy="-16" r="6" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
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
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Interactive Legend Matching the Engineering Drawing */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-emerald-700 animate-pulse" />
                  <span className="text-slate-700 font-medium">Posição Ativa (com sensor)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-blue-700" />
                  <span className="text-slate-700 font-medium">Concluída no Ciclo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-white border-2 border-slate-300" />
                  <span className="text-slate-700 font-medium">Disponível para Sorteio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-700" />
                  <span className="text-slate-700 font-medium">Haste do Datalogger</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-red-600 rounded-full" />
                  <span className="text-slate-700 font-medium">Limite da Célula Triângular</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                * Clique em qualquer número para inspecionar os detalhes da planta
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
                <div
                  key={cell.id}
                  className={`rounded-xl border p-4 transition-all ${
                    activeInCell
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cell.name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {cell.dataloggerId}
                      </span>
                    </div>
                    {activeInCell && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                        Sensor Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{cell.description}</p>

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
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : status === 'active'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium'
                              : status === 'completed'
                              ? 'border-blue-200 bg-blue-50/50 text-slate-700'
                              : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-800">
                              {pos.formattedId}
                            </span>
                            <div>
                              <span className="font-semibold block">Planta {pos.plantIndex}</span>
                              <span className="text-[10px] text-slate-500">
                                {status === 'active' && posRecord && `Instalado em ${formatDateBR(posRecord.installedAt)}`}
                                {status === 'completed' && posRecord && `Coletado em ${formatDateBR(posRecord.removedAt || posRecord.installedAt)}`}
                                {status === 'available' && 'Aguardando sorteio'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                <Radio className="w-2.5 h-2.5 animate-ping" />
                                Monitorando
                              </span>
                            )}
                            {status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                Concluída
                              </span>
                            )}
                            {status === 'available' && (
                              <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                Disponível
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Position Detail Card */}
        {selectedPosition && (
          <div 
            id="saf-selected-position-card"
            className="mt-5 p-4 rounded-xl bg-slate-50 border-2 border-emerald-500/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono font-extrabold text-xl text-slate-900 shadow-xs">
                {selectedPosition.formattedId}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
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
                  {selectedPositionStatus === 'available' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 text-slate-700">
                      Disponível para Sorteio
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Célula {selectedPosition.cellId} ({CELLS_METADATA.find(c => c.id === selectedPosition.cellId)?.name}) • Planta {selectedPosition.plantIndex}
                  {selectedPositionRecord && ` • Instalado em: ${formatDateBR(selectedPositionRecord.installedAt)}`}
                  {selectedPositionRecord?.removedAt && ` • Coletado em: ${formatDateBR(selectedPositionRecord.removedAt)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {selectedPositionStatus === 'available' && (
                <button
                  onClick={onOpenRaffle}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Sortear Agora
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onSelectPosition(0)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
