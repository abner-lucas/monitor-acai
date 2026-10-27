'use client';

import React, { useId, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Table2, BarChart3 } from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import { DAYS_PER_ROTATION } from '@/lib/constants';
import { Relatorio, Rodizio, doisDigitos, rodiziosDoCiclo } from '@/lib/relatorio';
import { formatDateBR, getTodayLocalDateStr } from '@/lib/storage';

/*
 * Indicadores do ciclo, só com dados reais (registros e relatórios de campo).
 * Paleta validada (dataviz/validate_palette.js, modo claro): série 1 #1f8a5c, série 2 #7d4a9e.
 */
const COR = { serie1: '#1f8a5c', serie2: '#7d4a9e', grade: '#e3ebe5', eixo: '#5b6b62', referencia: '#c2362b' };
const EASE = [0.16, 1, 0.3, 1] as const;

const diasEntre = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
};
const minutos = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

/** Escala "redonda" para o eixo Y. */
function escala(min: number, max: number, passos = 4) {
  const bruto = (max - min) / passos || 1;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto;
  const inicio = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const marcas: number[] = [];
  for (let v = inicio; v <= fim + 1e-9; v += passo) marcas.push(Math.round(v * 100) / 100);
  return { inicio, fim, marcas };
}

// Geometria comum
const L = 360;
const A = 210;
const M = { esq: 44, dir: 14, topo: 14, base: 34 };
const larguraPlot = L - M.esq - M.dir;
const alturaPlot = A - M.topo - M.base;

interface Coluna {
  rotulo: string;
  sub: string;
}

function Eixos({ colunas, marcas, y, formato }: { colunas: Coluna[]; marcas: number[]; y: (v: number) => number; formato: (v: number) => string }) {
  const banda = larguraPlot / colunas.length;
  return (
    <g fontSize="10.5" fill={COR.eixo}>
      {marcas.map((m) => (
        <g key={m}>
          <line x1={M.esq} x2={L - M.dir} y1={y(m)} y2={y(m)} stroke={COR.grade} strokeWidth="1" />
          <text x={M.esq - 6} y={y(m) + 3.5} textAnchor="end" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formato(m)}
          </text>
        </g>
      ))}
      {colunas.map((c, i) => (
        <g key={c.rotulo}>
          <text x={M.esq + banda * (i + 0.5)} y={A - M.base + 15} textAnchor="middle" fontWeight="600" fill="#24302b">
            {c.rotulo}
          </text>
          <text x={M.esq + banda * (i + 0.5)} y={A - M.base + 27} textAnchor="middle">
            {c.sub}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Cartão do gráfico: título, alternância gráfico/tabela e a dica de hover. */
function CartaoGrafico({
  titulo,
  descricao,
  vazio,
  tabela,
  children,
}: {
  titulo: string;
  descricao: string;
  vazio?: string;
  tabela: { cabecalho: string[]; linhas: (string | number)[][] };
  children: React.ReactNode;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <figure className="flex min-w-0 flex-col rounded-[24px] bg-white p-5 ring-1 ring-folha-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <figcaption className="font-display text-lg font-semibold leading-tight text-grafite">{titulo}</figcaption>
          <p className="mt-0.5 text-sm text-slate-600">{descricao}</p>
        </div>
        {!vazio && (
          <button
            type="button"
            onClick={() => setVerTabela((v) => !v)}
            aria-pressed={verTabela}
            title={verTabela ? 'Ver gráfico' : 'Ver tabela'}
            aria-label={verTabela ? `Ver gráfico: ${titulo}` : `Ver tabela: ${titulo}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-papel hover:text-grafite cursor-pointer"
          >
            {verTabela ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          </button>
        )}
      </div>
      <div className="mt-3 flex-1">
        {vazio ? (
          <p className="flex h-full min-h-40 items-center justify-center rounded-2xl bg-papel/50 px-4 text-center text-sm text-slate-600">{vazio}</p>
        ) : verTabela ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-slate-600">
                  {tabela.cabecalho.map((c) => (
                    <th key={c} className="py-1.5 pr-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-folha-100">
                {tabela.linhas.map((l, i) => (
                  <tr key={i}>
                    {l.map((v, j) => (
                      <td key={j} className="py-1.5 pr-3 text-grafite">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}

function Dica({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  // Posição em % do gráfico, para acompanhar o tamanho do SVG.
  const esquerda = Math.min(Math.max((x / L) * 100, 18), 82);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-grafite px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: `${esquerda}%`, top: `${(y / A) * 100}%` }}
    >
      {children}
    </div>
  );
}

/** Barras verticais com ponta arredondada (4px) no topo e base reta. */
function caminhoBarra(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

// ---------------------------------------------------------------------------
// 1. Permanência por posição
// ---------------------------------------------------------------------------
function GraficoPermanencia({ rodizios }: { rodizios: Rodizio[] }) {
  const reduzir = useReducedMotion();
  const [foco, setFoco] = useState<number | null>(null);
  const hoje = getTodayLocalDateStr();
  const dados = rodizios.map((r) => ({
    r,
    dias: diasEntre(r.record.installedAt, r.record.removedAt ?? hoje),
    emCampo: r.record.status === 'active',
  }));
  const { fim, marcas } = escala(0, Math.max(DAYS_PER_ROTATION, ...dados.map((d) => d.dias)));
  const y = (v: number) => M.topo + alturaPlot * (1 - v / fim);
  const banda = larguraPlot / Math.max(dados.length, 1);
  const largura = Math.min(24, banda * 0.55);
  const colunas = dados.map((d) => ({ rotulo: `R${d.r.numero}`, sub: `#${doisDigitos(d.r.record.positionId)}` }));

  return (
    <CartaoGrafico
      titulo="Dias em cada posição"
      descricao={`Permanência real do conjunto em cada planta; a linha marca os ${DAYS_PER_ROTATION} dias previstos.`}
      vazio={dados.length === 0 ? 'Aparece depois do primeiro rodízio registrado.' : undefined}
      tabela={{
        cabecalho: ['Rodízio', 'Posição', 'De', 'Até', 'Dias'],
        linhas: dados.map((d) => [
          `R${d.r.numero}`,
          `#${doisDigitos(d.r.record.positionId)}`,
          formatDateBR(d.r.record.installedAt),
          d.emCampo ? 'em campo' : formatDateBR(d.r.record.removedAt),
          d.dias,
        ]),
      }}
    >
      <div className="relative" onMouseLeave={() => setFoco(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Dias de permanência do sensor em cada posição do ciclo">
          <Eixos colunas={colunas} marcas={marcas} y={y} formato={(v) => String(v)} />
          {dados.map((d, i) => {
            const x = M.esq + banda * i + (banda - largura) / 2;
            const h = Math.max(y(0) - y(d.dias), 1);
            return (
              <g key={d.r.record.id}>
                <motion.path
                  d={caminhoBarra(x, y(d.dias), largura, h)}
                  fill={COR.serie1}
                  fillOpacity={d.emCampo ? 0.45 : foco === null || foco === i ? 1 : 0.55}
                  stroke={d.emCampo ? COR.serie1 : 'none'}
                  strokeWidth={d.emCampo ? 1.5 : 0}
                  strokeDasharray={d.emCampo ? '3 2' : undefined}
                  initial={reduzir ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.06 }}
                  style={{ transformOrigin: `0 ${y(0)}px`, transformBox: 'view-box' }}
                />
                <text x={x + largura / 2} y={y(d.dias) - 5} textAnchor="middle" fontSize="10.5" fill="#24302b" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {d.dias}
                </text>
                <rect
                  x={M.esq + banda * i}
                  y={M.topo}
                  width={banda}
                  height={alturaPlot}
                  fill="transparent"
                  onMouseEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                  onBlur={() => setFoco(null)}
                  tabIndex={0}
                  aria-label={`R${d.r.numero}, posição ${doisDigitos(d.r.record.positionId)}: ${d.dias} dias${d.emCampo ? ', em campo' : ''}`}
                  className="outline-none"
                />
              </g>
            );
          })}
          <line x1={M.esq} x2={L - M.dir} y1={y(DAYS_PER_ROTATION)} y2={y(DAYS_PER_ROTATION)} stroke={COR.referencia} strokeWidth="1.5" strokeDasharray="5 4" />

        </svg>
        {foco !== null && dados[foco] && (
          <Dica x={M.esq + banda * (foco + 0.5)} y={y(dados[foco].dias) - 10}>
            <strong className="block font-semibold">
              R{dados[foco].r.numero} · posição #{doisDigitos(dados[foco].r.record.positionId)}
            </strong>
            {dados[foco].dias} dias {dados[foco].emCampo ? '(ainda em campo)' : ''}
            <span className="block text-white/70">
              {formatDateBR(dados[foco].r.record.installedAt)} a {dados[foco].emCampo ? 'hoje' : formatDateBR(dados[foco].r.record.removedAt)}
            </span>
          </Dica>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-600">Linha vermelha: {DAYS_PER_ROTATION} dias previstos.{dados.some((d) => d.emCampo) && ' Barra tracejada: posição ainda em campo, contada até hoje.'}</p>
    </CartaoGrafico>
  );
}

// ---------------------------------------------------------------------------
// 2. Tensão das baterias dos dataloggers na troca
// ---------------------------------------------------------------------------
function GraficoBaterias({ pontos }: { pontos: { rotulo: string; sub: string; data: string; zl6: number | null; umetos: number | null }[] }) {
  const reduzir = useReducedMotion();
  const [foco, setFoco] = useState<number | null>(null);
  const idGrafico = useId();
  const valores = pontos.flatMap((p) => [p.zl6, p.umetos]).filter((v): v is number => v !== null);
  const vazio = valores.length === 0;
  const { inicio, fim, marcas } = escala(vazio ? 0 : Math.min(...valores) - 200, vazio ? 1 : Math.max(...valores) + 200);
  const y = (v: number) => M.topo + alturaPlot * (1 - (v - inicio) / (fim - inicio || 1));
  const banda = larguraPlot / Math.max(pontos.length, 1);
  const xc = (i: number) => M.esq + banda * (i + 0.5);
  const series = [
    { chave: 'zl6' as const, nome: 'ZL6', cor: COR.serie1 },
    { chave: 'umetos' as const, nome: 'μMETOS', cor: COR.serie2 },
  ];
  const linha = (chave: 'zl6' | 'umetos') =>
    pontos
      .map((p, i) => (p[chave] === null ? null : `${xc(i)},${y(p[chave]!)}`))
      .filter(Boolean)
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt}`)
      .join(' ');
  const milhar = (v: number) => v.toLocaleString('pt-BR');

  return (
    <CartaoGrafico
      titulo="Bateria dos dataloggers"
      descricao="Tensão medida no relatório de cada troca, em mV."
      vazio={vazio ? 'Aparece quando os relatórios tiverem a tensão das baterias.' : undefined}
      tabela={{
        cabecalho: ['Rodízio', 'Data', 'ZL6 (mV)', 'μMETOS (mV)'],
        linhas: pontos.map((p) => [p.rotulo, formatDateBR(p.data), p.zl6 === null ? '–' : milhar(p.zl6), p.umetos === null ? '–' : milhar(p.umetos)]),
      }}
    >
      {/* Legenda: duas séries, identidade nunca só pela cor (também rótulo direto no fim da linha) */}
      <ul className="mb-1 flex gap-4 text-xs text-slate-700" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.chave} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.cor }} />
            {s.nome}
          </li>
        ))}
      </ul>
      <div className="relative" onMouseLeave={() => setFoco(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Tensão das baterias dos dataloggers ZL6 e μMETOS em cada troca">
          <Eixos colunas={pontos.map((p) => ({ rotulo: p.rotulo, sub: p.sub }))} marcas={marcas} y={y} formato={(v) => `${(v / 1000).toLocaleString('pt-BR')}k`} />
          {foco !== null && <line x1={xc(foco)} x2={xc(foco)} y1={M.topo} y2={M.topo + alturaPlot} stroke="#b8c6bd" strokeWidth="1" />}
          {series.map((s, si) => (
            <g key={s.chave}>
              <motion.path
                d={linha(s.chave)}
                fill="none"
                stroke={s.cor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduzir ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: EASE, delay: 0.15 + si * 0.15 }}
              />
              {pontos.map((p, i) =>
                p[s.chave] === null ? null : (
                  <circle key={i} cx={xc(i)} cy={y(p[s.chave]!)} r={foco === i ? 5.5 : 4} fill={s.cor} stroke="#fff" strokeWidth="2" />
                )
              )}
            </g>
          ))}
          {/* Rótulos diretos no último ponto de cada série */}
          {series.map((s) => {
            const ultimo = [...pontos].map((p, i) => ({ v: p[s.chave], i })).reverse().find((p) => p.v !== null);
            if (!ultimo) return null;
            return (
              <text key={s.chave} x={xc(ultimo.i) - 7} y={y(ultimo.v!) + (s.chave === 'zl6' ? -9 : 15)} textAnchor="end" fontSize="10.5" fontWeight="600" fill="#24302b">
                {s.nome}
              </text>
            );
          })}
          {pontos.map((p, i) => (
            <rect
              key={`alvo-${idGrafico}-${i}`}
              x={M.esq + banda * i}
              y={M.topo}
              width={banda}
              height={alturaPlot}
              fill="transparent"
              tabIndex={0}
              onMouseEnter={() => setFoco(i)}
              onFocus={() => setFoco(i)}
              onBlur={() => setFoco(null)}
              aria-label={`${p.rotulo}: ZL6 ${p.zl6 ?? 'sem dado'} mV, μMETOS ${p.umetos ?? 'sem dado'} mV`}
              className="outline-none"
            />
          ))}
        </svg>
        {foco !== null && pontos[foco] && (
          <Dica x={xc(foco)} y={Math.min(...[pontos[foco].zl6, pontos[foco].umetos].filter((v): v is number => v !== null).map(y)) - 12}>
            <strong className="block font-semibold">
              {pontos[foco].rotulo} · {formatDateBR(pontos[foco].data)}
            </strong>
            {series.map((s) => (
              <span key={s.chave} className="flex items-center gap-1.5 tabular-nums">
                <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />
                {s.nome}: {pontos[foco][s.chave] === null ? '–' : `${milhar(pontos[foco][s.chave]!)} mV`}
              </span>
            ))}
          </Dica>
        )}
      </div>
    </CartaoGrafico>
  );
}

// ---------------------------------------------------------------------------
// 3. Tempo sem coleta durante a troca
// ---------------------------------------------------------------------------
function GraficoParada({ pontos }: { pontos: { rotulo: string; sub: string; minutos: number; de: string; ate: string }[] }) {
  const reduzir = useReducedMotion();
  const [foco, setFoco] = useState<number | null>(null);
  const { fim, marcas } = escala(0, Math.max(60, ...pontos.map((p) => p.minutos)));
  const y = (v: number) => M.topo + alturaPlot * (1 - v / fim);
  const banda = larguraPlot / Math.max(pontos.length, 1);
  const largura = Math.min(24, banda * 0.55);
  const media = pontos.length ? Math.round(pontos.reduce((s, p) => s + p.minutos, 0) / pontos.length) : 0;

  return (
    <CartaoGrafico
      titulo="Tempo sem coleta na troca"
      descricao={pontos.length ? `Da desconexão ao restabelecimento, em minutos. Média: ${media} min.` : 'Da desconexão ao restabelecimento, em minutos.'}
      vazio={pontos.length === 0 ? 'Aparece quando os relatórios tiverem os horários de desconexão e restabelecimento.' : undefined}
      tabela={{
        cabecalho: ['Rodízio', 'Desconexão', 'Restabelecimento', 'Minutos'],
        linhas: pontos.map((p) => [p.rotulo, p.de, p.ate, p.minutos]),
      }}
    >
      <div className="relative" onMouseLeave={() => setFoco(null)}>
        <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Minutos sem coleta de dados em cada troca de posição">
          <Eixos colunas={pontos.map((p) => ({ rotulo: p.rotulo, sub: p.sub }))} marcas={marcas} y={y} formato={(v) => String(v)} />
          {pontos.map((p, i) => {
            const x = M.esq + banda * i + (banda - largura) / 2;
            return (
              <g key={p.rotulo}>
                <motion.path
                  d={caminhoBarra(x, y(p.minutos), largura, Math.max(y(0) - y(p.minutos), 1))}
                  fill={COR.serie2}
                  fillOpacity={foco === null || foco === i ? 1 : 0.55}
                  initial={reduzir ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.06 }}
                  style={{ transformOrigin: `0 ${y(0)}px`, transformBox: 'view-box' }}
                />
                <text x={x + largura / 2} y={y(p.minutos) - 5} textAnchor="middle" fontSize="10.5" fill="#24302b" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {p.minutos}
                </text>
                <rect
                  x={M.esq + banda * i}
                  y={M.topo}
                  width={banda}
                  height={alturaPlot}
                  fill="transparent"
                  tabIndex={0}
                  onMouseEnter={() => setFoco(i)}
                  onFocus={() => setFoco(i)}
                  onBlur={() => setFoco(null)}
                  aria-label={`${p.rotulo}: ${p.minutos} minutos sem coleta`}
                  className="outline-none"
                />
              </g>
            );
          })}
        </svg>
        {foco !== null && pontos[foco] && (
          <Dica x={M.esq + banda * (foco + 0.5)} y={y(pontos[foco].minutos) - 10}>
            <strong className="block font-semibold">{pontos[foco].rotulo}</strong>
            {pontos[foco].minutos} min sem coleta
            <span className="block text-white/70">
              {pontos[foco].de} às {pontos[foco].ate}
            </span>
          </Dica>
        )}
      </div>
    </CartaoGrafico>
  );
}

// ---------------------------------------------------------------------------

export function Indicadores({
  records,
  relatorios,
  currentCycle,
}: {
  records: RotationRecord[];
  relatorios: Map<string, Relatorio>;
  currentCycle: number;
}) {
  const { executados, baterias, paradas } = useMemo(() => {
    const executados = rodiziosDoCiclo(records, currentCycle).filter((r) => r.record.status !== 'scheduled');
    const comRelatorio = executados
      .map((r) => ({ r, rel: relatorios.get(r.record.id) }))
      .filter((x): x is { r: Rodizio; rel: Relatorio } => !!x.rel);
    const baterias = comRelatorio
      .map(({ r, rel }) => ({
        rotulo: `R${r.numero}`,
        sub: `#${doisDigitos(r.record.positionId)}`,
        data: r.record.installedAt,
        zl6: rel.dados.telemetria.zl6.tensaoMv,
        umetos: rel.dados.telemetria.umetos.tensaoMv,
      }))
      .filter((p) => p.zl6 !== null || p.umetos !== null);
    const paradas = comRelatorio
      .filter(({ r, rel }) => r.origem && rel.dados.horaDesconexao && rel.dados.horaRestabelecimento)
      .map(({ r, rel }) => ({
        rotulo: `R${r.numero}`,
        sub: `#${doisDigitos(r.record.positionId)}`,
        minutos: minutos(rel.dados.horaRestabelecimento) - minutos(rel.dados.horaDesconexao),
        de: rel.dados.horaDesconexao,
        ate: rel.dados.horaRestabelecimento,
      }))
      .filter((p) => p.minutos >= 0);
    return { executados, baterias, paradas };
  }, [records, relatorios, currentCycle]);

  return (
    <section aria-labelledby="titulo-indicadores" className="mb-12">
      <h2 id="titulo-indicadores" className="mb-4 font-display text-2xl font-semibold tracking-tight text-grafite">
        Indicadores do ciclo {currentCycle}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GraficoPermanencia rodizios={executados} />
        <GraficoBaterias pontos={baterias} />
        <GraficoParada pontos={paradas} />
      </div>
    </section>
  );
}
