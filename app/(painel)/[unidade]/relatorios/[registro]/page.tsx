'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FilePen, Printer } from 'lucide-react';
import { useUnidade } from '@/components/app/PainelUnidade';
import { FolhaRelatorio } from '@/components/relatorio/FolhaRelatorio';
import { SeloSituacao } from '@/components/relatorio/comum';
import { CABECALHO_RELATORIO, codigoRelatorio, rodizioDoRegistro } from '@/lib/relatorio';

export default function PaginaRelatorio() {
  const { registro } = useParams<{ registro: string }>();
  const recordId = decodeURIComponent(registro);
  const { unidade, records, relatorios, hrefRelatorio, abrirRegistro } = useUnidade();
  const rodizio = rodizioDoRegistro(records, recordId);
  const relatorio = relatorios.get(recordId);
  const codigo = rodizio ? codigoRelatorio(unidade, rodizio.record.cycleNumber, rodizio.numero) : '';

  // O título vira o nome sugerido do PDF ao imprimir, no padrão dos arquivos do projeto.
  useEffect(() => {
    if (!codigo) return;
    const anterior = document.title;
    document.title = `${codigo} - ${CABECALHO_RELATORIO.titulo.toUpperCase()}`;
    return () => {
      document.title = anterior;
    };
  }, [codigo]);

  const voltar = (
    <Link
      href={`/${unidade.id}/relatorios`}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-folha-800 hover:bg-folha-50"
    >
      <ArrowLeft className="h-4 w-4" />
      Relatórios
    </Link>
  );

  if (!rodizio) {
    return (
      <div className="rounded-[28px] bg-white p-7 ring-1 ring-folha-100">
        {voltar}
        <p className="mt-4 text-sm text-slate-700">Rodízio {recordId} não encontrado em {unidade.nome}.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {voltar}
          <span className="font-display text-xl font-semibold text-grafite">{codigo}</span>
          <SeloSituacao relatorio={relatorio} />
        </div>
        {relatorio && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={hrefRelatorio(recordId, true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-grafite ring-1 ring-papel-linha hover:bg-papel"
            >
              <FilePen className="h-4 w-4" />
              Editar
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-acai-900 px-4 py-2 text-sm font-semibold text-white hover:bg-acai-800 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Imprimir ou salvar PDF
            </button>
          </div>
        )}
      </div>

      {relatorio ? (
        <>
          {!relatorio.assinadoEm && (
            <p className="mb-4 rounded-2xl bg-acai-100/60 px-4 py-3 text-sm text-acai-900 print:hidden">
              Para assinar: use “Imprimir ou salvar PDF”, escolha “Salvar como PDF”, assine o arquivo no gov.br e depois
              informe a data da assinatura em Editar.
            </p>
          )}
          <FolhaRelatorio unidade={unidade} rodizio={rodizio} relatorio={relatorio} codigo={codigo} />
        </>
      ) : rodizio.record.status === 'scheduled' ? (
        <div className="rounded-[28px] bg-white px-7 py-10 ring-1 ring-folha-100">
          <p className="font-display text-xl font-semibold text-grafite">
            Posição sorteada: troca prevista em {rodizio.record.installedAt.split('-').reverse().join('/')}
          </p>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            O conjunto sai da posição #{String(rodizio.origem?.positionId ?? 0).padStart(2, '0')} para a #
            {String(rodizio.record.positionId).padStart(2, '0')}. No dia da troca, use “Registrar rodízio”: as datas e os
            status são atualizados e este relatório abre já com a origem preenchida.
          </p>
          <button
            onClick={abrirRegistro}
            className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-acai-900 px-4 py-2 text-sm font-semibold text-white hover:bg-acai-800 cursor-pointer"
          >
            Registrar rodízio
          </button>
        </div>
      ) : (
        <div className="rounded-[28px] bg-white px-7 py-10 ring-1 ring-folha-100">
          <p className="font-display text-xl font-semibold text-grafite">Este rodízio ainda não tem relatório</p>
          <p className="mt-1 text-sm text-slate-600">
            Preencha com os dados anotados em campo. Dá para salvar como rascunho e terminar depois.
          </p>
          <Link
            href={hrefRelatorio(recordId, true)}
            className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-folha-700 px-4 py-2 text-sm font-semibold text-white hover:bg-folha-800"
          >
            <FilePen className="h-4 w-4" />
            Preencher relatório
          </Link>
        </div>
      )}
    </div>
  );
}
