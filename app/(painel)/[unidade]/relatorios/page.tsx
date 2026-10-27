'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Dices } from 'lucide-react';
import { useUnidade } from '@/components/app/PainelUnidade';
import { SeloSituacao, descricaoPosicao } from '@/components/relatorio/comum';
import { codigoRelatorio, doisDigitos, rodiziosDoCiclo, situacaoRelatorio } from '@/lib/relatorio';
import { formatDateBR } from '@/lib/storage';

export default function PaginaRelatorios() {
  const { unidade, records, relatorios, currentCycle, hrefRelatorio, abrirRegistro } = useUnidade();
  const reduzir = useReducedMotion();
  const ciclos = Array.from(new Set([currentCycle, ...records.map((r) => r.cycleNumber)])).sort((a, b) => b - a);
  const [ciclo, setCiclo] = useState(currentCycle);
  const rodizios = rodiziosDoCiclo(records, ciclo);

  const contagem = { pendente: 0, rascunho: 0, concluido: 0, assinado: 0 };
  // A posição agendada ainda não foi executada: não entra na contagem de relatórios.
  for (const r of rodizios) if (r.record.status !== 'scheduled') contagem[situacaoRelatorio(relatorios.get(r.record.id))]++;

  return (
    <section aria-labelledby="titulo-relatorios" className="rounded-[28px] bg-white ring-1 ring-folha-100">
      <div className="flex flex-col justify-between gap-4 px-5 pt-6 pb-5 sm:flex-row sm:items-end sm:px-7">
        <div>
          <h2 id="titulo-relatorios" className="font-display text-2xl font-semibold tracking-tight text-grafite sm:text-3xl">
            Relatórios de campo
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Um relatório por rodízio, com os mesmos campos do formulário em papel. Preencha aqui, salve em PDF e assine
            no gov.br.
          </p>
        </div>
        {ciclos.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Ciclo
            <select
              value={ciclo}
              onChange={(e) => setCiclo(Number(e.target.value))}
              className="min-h-10 rounded-xl bg-papel/70 px-3 py-2 text-sm outline-hidden focus:bg-white focus:ring-2 focus:ring-folha-600"
            >
              {ciclos.map((c) => (
                <option key={c} value={c}>
                  Ciclo {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {rodizios.length > 0 && (
        <p className="border-t border-folha-100 px-5 py-3 text-sm text-slate-600 sm:px-7 tabular-nums">
          Ciclo {ciclo}: <strong className="font-semibold text-grafite">{contagem.assinado}</strong> assinados,{' '}
          <strong className="font-semibold text-grafite">{contagem.concluido}</strong> concluídos sem assinatura,{' '}
          <strong className="font-semibold text-grafite">{contagem.rascunho}</strong> em rascunho e{' '}
          <strong className="font-semibold text-grafite">{contagem.pendente}</strong> pendentes
        </p>
      )}

      {rodizios.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-folha-100 px-5 py-10 sm:px-7">
          <p className="text-sm text-slate-700">Nenhum rodízio no ciclo {ciclo} ainda. O primeiro relatório nasce do primeiro rodízio registrado.</p>
          <button
            onClick={abrirRegistro}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-folha-700 px-4 py-2 text-sm font-semibold text-white hover:bg-folha-800 cursor-pointer"
          >
            <Dices className="h-4 w-4" />
            Registrar instalação
          </button>
        </div>
      ) : (
        // A lista segue o caminho do conjunto de sensores pelo SAF: cada item é uma mudança de posição.
        <ol className="relative border-t border-folha-100 px-3 py-3 sm:px-5">
          {rodizios.map((rodizio, i) => {
            const { record, numero, origem } = rodizio;
            const relatorio = relatorios.get(record.id);
            const agendado = record.status === 'scheduled';
            const pendente = !relatorio;
            const codigo = codigoRelatorio(unidade, ciclo, numero);
            const ultimo = i === rodizios.length - 1;
            return (
              <motion.li
                key={record.id}
                initial={reduzir ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                className="relative"
              >
                {!ultimo && <span aria-hidden="true" className="absolute left-[34px] top-14 bottom-0 w-px border-l-2 border-dashed border-lapis/40 sm:left-[38px]" />}
                <Link
                  href={hrefRelatorio(record.id, pendente && !agendado)}
                  className="group flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-papel/70 sm:px-3"
                >
                  <span className="relative z-10 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-acai-900 text-white sm:h-14 sm:w-14">
                    <span className="font-display text-lg font-semibold leading-none">R{numero}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 font-display text-lg font-semibold text-grafite tabular-nums">
                      <span>{origem ? doisDigitos(origem.positionId) : '00'}</span>
                      <ArrowRight className="h-4 w-4 self-center text-lapis" aria-label="para" />
                      <span>{doisDigitos(record.positionId)}</span>
                      <span className="text-sm font-normal text-slate-500">{codigo}</span>
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {agendado ? `Previsto para ${formatDateBR(record.installedAt)}` : formatDateBR(record.installedAt)}
                      <span className="hidden sm:inline"> · </span>
                      <span className="hidden sm:inline">{origem ? `${descricaoPosicao(origem.positionId)} para ${descricaoPosicao(record.positionId).toLowerCase()}` : `1ª instalação em ${descricaoPosicao(record.positionId).toLowerCase()}`}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    {agendado ? (
                      <span className="inline-flex items-center rounded-full border border-dashed border-acai-700 px-2.5 py-1 text-xs font-semibold text-acai-800">
                        Sorteada
                      </span>
                    ) : (
                      <SeloSituacao relatorio={relatorio} />
                    )}
                    <span className="hidden text-sm font-medium text-folha-700 group-hover:underline sm:inline">
                      {agendado ? 'Ver' : pendente ? 'Preencher' : 'Abrir'}
                    </span>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
