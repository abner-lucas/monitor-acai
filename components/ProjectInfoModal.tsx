'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Layers, MapPin, Radio, Sprout } from 'lucide-react';
import { TOTAL_POSITIONS, TOTAL_WEEKS, DAYS_PER_ROTATION, CELLS_METADATA } from '@/lib/constants';
import { Janela, estilos } from '@/components/vivo/Janela';

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

function Secao({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-grafite">
        <span className="text-folha-600">{icone}</span>
        {titulo}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Triângulo da célula com as 3 plantas nos vértices, como na planta baixa. */
function MiniCelula({ apontaParaBaixo }: { apontaParaBaixo: boolean }) {
  const pontos = apontaParaBaixo ? '4,5 32,5 18,29' : '18,5 32,29 4,29';
  const vertices = apontaParaBaixo
    ? [[4, 5], [32, 5], [18, 29]]
    : [[18, 5], [32, 29], [4, 29]];
  return (
    <svg viewBox="0 0 36 34" className="h-9 w-9 shrink-0" aria-hidden="true">
      <polygon points={pontos} fill="rgba(194,54,43,0.06)" stroke="#c2362b" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="18" cy={apontaParaBaixo ? 13 : 20} r="3" fill="#523159" />
      {vertices.map(([x, y], i) => (
        <rect key={i} x={x - 3.5} y={y - 3.5} width="7" height="7" rx="2" fill="#fff" stroke="#1f5e45" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export const ProjectInfoModal: React.FC<ProjectInfoModalProps> = ({ isOpen, onClose }) => {
  const reduzir = useReducedMotion();
  if (!isOpen) return null;

  const parametros = [
    { valor: '6', rotulo: 'células triangulares' },
    { valor: '3', rotulo: 'plantas por célula' },
    { valor: String(TOTAL_POSITIONS), rotulo: 'posições no total' },
    { valor: String(DAYS_PER_ROTATION), rotulo: 'dias em cada posição', destaque: true },
  ];

  return (
    <Janela
      titulo="Sobre o projeto"
      subtitulo="Monitoramento integrado de solo, microclima e planta no SAF de açaí"
      icone={<Sprout className="h-5 w-5" />}
      onFechar={onClose}
      largura="max-w-2xl"
      rodape={
        <button type="button" onClick={onClose} className={estilos.botaoPrincipal}>
          Entendido
        </button>
      }
    >
      <div className="text-sm leading-relaxed text-slate-700">
        <Secao icone={<MapPin className="h-4 w-4" />} titulo="Objetivo e metodologia">
          <p>
            O projeto no IFPA Campus Breves (Marajó/PA) desenvolve o monitoramento integrado de solo, microclima e
            fisiologia vegetal em um Sistema Agroflorestal (SAF) consorciado (açaí, cacau, café, acapu e adubadeiras) sob
            manejo irrigado.
          </p>
          <p className="mt-2">
            O sistema utiliza a amostragem aleatória sem reposição para mover o conjunto de sensores entre as 18 posições
            (6 células triangulares × 3 plantas) ao longo de ciclos de 36 semanas (14 dias por posição). Essa metodologia
            mapeia o perfil de retenção hídrica do solo (conteúdo volumétrico e potencial mátrico), o microclima atmosférico
            e a dinâmica foliar sem viés espacial, transmitindo dados em tempo real via ZENTRA Cloud e FieldClimate.
          </p>
        </Secao>

        {/* Parâmetros: os números do experimento em destaque */}
        <section className="mt-7 rounded-[20px] bg-papel/70 p-4 sm:p-5">
          <h3 className="font-display text-base font-semibold text-grafite">Parâmetros do experimento</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {parametros.map((p, i) => (
              <motion.div
                key={p.rotulo}
                initial={reduzir ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.1 + i * 0.06 }}
              >
                <dt className="sr-only">{p.rotulo}</dt>
                <dd>
                  <span className={`block font-display text-3xl font-semibold leading-none tabular-nums ${p.destaque ? 'text-folha-700' : 'text-grafite'}`}>
                    {p.valor}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">{p.rotulo}</span>
                </dd>
              </motion.div>
            ))}
          </dl>
          <p className="mt-4 border-t border-papel-linha pt-3 text-xs text-slate-600">
            Um ciclo completo: {TOTAL_POSITIONS} posições × {DAYS_PER_ROTATION} dias ={' '}
            <strong className="font-semibold text-grafite">
              {TOTAL_POSITIONS * DAYS_PER_ROTATION} dias ({TOTAL_WEEKS} semanas)
            </strong>{' '}
            de monitoramento contínuo.
          </p>
        </section>

        <Secao icone={<Layers className="h-4 w-4" />} titulo="Células e plantas">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CELLS_METADATA.map((c, i) => (
              <motion.li
                key={c.id}
                initial={reduzir ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-folha-100"
              >
                <MiniCelula apontaParaBaixo={c.id <= 3} />
                <div className="min-w-0">
                  <p className="font-semibold text-grafite">
                    {c.name} <span className="text-xs font-normal text-slate-500">· {c.dataloggerId}</span>
                  </p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    Plantas {c.plantPositions.map((p) => `#${String(p).padStart(2, '0')}`).join(', ')}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </Secao>

        {/* Telemetria: painel escuro, como o cartão do sensor em campo */}
        <section className="grao mt-7 rounded-[20px] bg-acai-900 p-4 text-acai-100 sm:p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Radio className="h-4 w-4 text-broto-400" />
            Sensores e telemetria
          </h3>
          <p className="mt-2.5">
            A estrutura física é composta por 6 hastes metálicas ancoradas em bases de concreto no solo, com topos
            milimetricamente nivelados para corrigir a declividade do terreno. O datalogger e a estação meteorológica
            (ATMOS 41 Gen 2) são montados sobre uma haste telescópica deslizante (luva) de encaixe rápido, que garante a
            altura regulamentar de 2 metros e permite a movimentação ágil entre as células no rodízio.
          </p>
          <p className="mt-2">
            Os sensores de solo (TEROS 10 para umidade volumétrica e TEROS 21 para potencial mátrico e temperatura) e os de
            planta (FylloClips) são fisicamente conectados aos registradores por fiações protegidas em conduítes
            subterrâneos de alta resistência, evitando danos por circulação no campus. A transmissão de dados é feita via
            telemetria celular (4G / Wi-Fi / NB-IoT) diretamente para as plataformas em nuvem ZENTRA Cloud (datalogger
            METER ZL6) e FieldClimate (datalogger µMETOS® ET0).
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs">
            {['ATMOS 41 Gen 2', 'TEROS 10', 'TEROS 21', 'FylloClips', 'ZL6 · ZENTRA Cloud', 'µMETOS · FieldClimate'].map((t) => (
              <li key={t} className="rounded-full border border-dashed border-acai-300/50 px-2.5 py-1 text-acai-100">
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Janela>
  );
};
