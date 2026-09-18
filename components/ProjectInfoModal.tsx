'use client';

import React from 'react';
import { 
  X, 
  Sprout, 
  MapPin, 
  Calendar, 
  Layers, 
  Radio, 
  Activity, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { TOTAL_POSITIONS, TOTAL_WEEKS, DAYS_PER_ROTATION, CELLS_METADATA } from '@/lib/constants';

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                MonitorAçaí — Projeto SAF IFPA Breves
              </h3>
              <p className="text-xs text-emerald-200">
                Engenharia Agrícola & Monitoramento IoT em Campo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Section 1: Overview */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700" />
              Objetivo e Metodologia Científica
            </h4>
            <p className="text-slate-600">
              O projeto no IFPA Campus Breves (Marajó/PA) desenvolve o monitoramento integrado de solo, microclima e fisiologia vegetal em um Sistema Agroflorestal (SAF) consorciado (açaí, cacau, café, acapu e adubadeiras) sob manejo irrigado.
            </p>
            <p className="text-slate-600 mt-2">
              O sistema utiliza a amostragem aleatória sem reposição para mover o conjunto de sensores entre as 18 posições (6 células triangulares × 3 plantas) ao longo de ciclos de 36 semanas (14 dias por posição). Essa metodologia mapeia o perfil de retenção hídrica do solo (conteúdo volumétrico e potencial mátrico), o microclima atmosférico e a dinâmica foliar sem viés espacial, transmitindo dados em tempo real via ZENTRA Cloud e FieldClimate
            </p>
          </div>

          {/* Section 2: Mathematical Parameters */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-800">
              Parâmetros do Experimento de Campo:
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-500 block">Células Triangulares</span>
                <strong className="text-slate-900 text-base font-black">6 Células</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-500 block">Plantas por Célula</span>
                <strong className="text-slate-900 text-base font-black">3 Plantas</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-500 block">Total de Posições</span>
                <strong className="text-slate-900 text-base font-black">{TOTAL_POSITIONS} Locais</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-500 block">Tempo por Local</span>
                <strong className="text-emerald-700 text-base font-black">{DAYS_PER_ROTATION} Dias</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              * Duração de 1 Ciclo Completo: <strong>18 posições × 14 dias = 252 dias (36 semanas de monitoramento contínuo)</strong>.
            </p>
          </div>

          {/* Section 3: Cell Architecture */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              Mapeamento das Células e Plantas (SAF Breves)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {CELLS_METADATA.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{c.name}</span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded-sm text-slate-600">
                      {c.dataloggerId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Plantas monitoradas: <strong>Posições #{c.plantPositions.map(p => p < 10 ? '0' + p : p).join(', #')}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Telemetry & IoT */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-700" />
              Infraestrutura de Sensores & Telemetria
            </div>
            <p className="text-emerald-950/80">
              A estrutura física é composta por 6 hastes metálicas ancoradas em bases de concreto no solo, com topos milimetricamente nivelados para corrigir a declividade do terreno. O datalogger e a estação meteorológica (ATMOS 41 Gen 2) são montados sobre uma haste telescópica deslizante (luva) de encaixe rápido, que garante a altura regulamentar de 2 metros e permite a movimentação ágil entre as células no rodízio.
            </p>
            <p className="text-emerald-950/80 mt-2">
              Os sensores de solo (TEROS 10 para umidade volumétrica e TEROS 21 para potencial mátrico e temperatura) e os de planta (FylloClips) são fisicamente conectados aos registradores por fiações protegidas em conduítes subterrâneos de alta resistência, evitando danos por circulação no campus. A transmissão de dados é feita via telemetria celular (4G / Wi-Fi / NB-IoT) diretamente para as plataformas em nuvem ZENTRA Cloud (datalogger METER ZL6) e FieldClimate (datalogger µMETOS® ET0).
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs sm:text-sm hover:bg-slate-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
