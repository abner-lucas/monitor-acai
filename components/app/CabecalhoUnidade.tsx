'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { FileText, LayoutDashboard, Table as TableIcon } from 'lucide-react';
import { UNIDADE_IDS, UNIDADES, Unidade } from '@/lib/unidades';

const PAGINAS = [
  { trecho: '', rotulo: 'Painel', icone: LayoutDashboard },
  { trecho: 'historico', rotulo: 'Histórico', icone: TableIcon },
  { trecho: 'relatorios', rotulo: 'Relatórios', icone: FileText },
] as const;

/**
 * Topo de cada página: troca de unidade (Breves / Muaná) e navegação entre
 * painel, histórico e relatórios da unidade escolhida.
 */
export function CabecalhoUnidade({ unidade, currentCycle }: { unidade: Unidade; currentCycle: number }) {
  const pathname = usePathname();
  const resto = pathname.split('/').slice(2);
  const paginaAtual = resto[0] === 'historico' || resto[0] === 'relatorios' ? resto[0] : '';

  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end print:hidden">
      <div>
        {/* Unidade piloto: a ativa é o título da página, a outra fica ao lado para trocar */}
        <nav aria-label="Unidade piloto" className="flex items-baseline gap-4">
          {UNIDADE_IDS.map((id) => {
            const ativa = id === unidade.id;
            return (
              <Link
                key={id}
                href={`/${id}${paginaAtual ? `/${paginaAtual}` : ''}`}
                aria-current={ativa ? 'page' : undefined}
                className={`relative font-display font-semibold tracking-tight transition-colors ${
                  ativa
                    ? 'text-3xl text-grafite sm:text-4xl'
                    : 'text-xl text-slate-500 hover:text-folha-700 sm:text-2xl'
                }`}
              >
                {UNIDADES[id].nome}
                {ativa && (
                  <motion.span
                    layoutId="traco-unidade"
                    className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-lapis"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <p className="mt-2.5 text-sm text-slate-600">
          {unidade.local} · Ciclo {currentCycle}
        </p>
      </div>

      <nav
        aria-label={`Seções de ${unidade.nome}`}
        className="relative inline-flex items-center gap-0.5 self-start rounded-full bg-folha-100/70 p-1 text-sm font-medium ring-1 ring-folha-100 sm:self-auto"
      >
        {PAGINAS.map(({ trecho, rotulo, icone: Icone }) => {
          const ativa = trecho === paginaAtual;
          return (
            <Link
              key={rotulo}
              href={`/${unidade.id}${trecho ? `/${trecho}` : ''}`}
              aria-current={ativa ? 'page' : undefined}
              className={`relative z-0 flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors duration-300 ${
                ativa ? 'text-white' : 'text-folha-800 hover:text-folha-900'
              }`}
            >
              {ativa && (
                <motion.span
                  layoutId="indicador-paginas"
                  className="absolute inset-0 -z-10 rounded-full bg-folha-700"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icone className="h-4 w-4" />
              <span>{rotulo}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
