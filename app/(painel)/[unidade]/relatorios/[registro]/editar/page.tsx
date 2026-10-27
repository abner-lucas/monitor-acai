'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useUnidade } from '@/components/app/PainelUnidade';
import { FormularioRelatorio, type EstadoRelatorio } from '@/components/relatorio/FormularioRelatorio';
import { SeloSituacao } from '@/components/relatorio/comum';
import { codigoRelatorio, relatorioVazio, rodizioDoRegistro, type Relatorio, type Rodizio } from '@/lib/relatorio';
import { RotationRecord } from '@/lib/types';
import { Unidade } from '@/lib/unidades';

/**
 * Relatório novo: aproveita o que já foi medido. A origem repete o destino do relatório anterior
 * (o conjunto saiu de onde foi instalado da última vez) e, se a planta de destino já recebeu o
 * conjunto em outro ciclo, GPS, raio e espécies vêm do relatório daquela visita. Nenhuma medição
 * de calibração ou telemetria é preenchida.
 */
function sugestaoInicial(
  unidade: Unidade,
  rodizio: Rodizio,
  records: RotationRecord[],
  relatorios: Map<string, Relatorio>
): { estado: EstadoRelatorio; aviso?: string } {
  const dados = relatorioVazio();
  const avisos: string[] = [];
  const anterior = rodizio.origem ? relatorios.get(rodizio.origem.id) : undefined;

  dados.responsavelTecnico = anterior?.dados.responsavelTecnico || rodizio.record.responsible;
  dados.equipeApoio = anterior?.dados.equipeApoio ?? '';
  if (anterior && rodizio.origem) {
    dados.origem = { ...anterior.dados.destino };
    avisos.push(
      `A origem foi preenchida com o destino do relatório ${codigoRelatorio(unidade, rodizio.origem.cycleNumber, rodizio.numero - 1)}.`
    );
  }

  const visitaAnterior = records
    .filter((r) => r.id !== rodizio.record.id && r.positionId === rodizio.record.positionId && relatorios.has(r.id))
    .sort((a, b) => b.installedAt.localeCompare(a.installedAt))[0];
  if (visitaAnterior) {
    dados.destino = { ...relatorios.get(visitaAnterior.id)!.dados.destino };
    avisos.push(`O destino repete os dados da visita de ${visitaAnterior.installedAt.split('-').reverse().join('/')} a esta planta.`);
  }

  return {
    estado: { status: 'rascunho', assinadoEm: null, dados },
    aviso: avisos.length ? `${avisos.join(' ')} Confira com o que foi medido em campo.` : undefined,
  };
}

export default function PaginaEditarRelatorio() {
  const { registro } = useParams<{ registro: string }>();
  const recordId = decodeURIComponent(registro);
  const router = useRouter();
  const { unidade, records, relatorios, salvarRelatorio, hrefRelatorio } = useUnidade();
  const rodizio = rodizioDoRegistro(records, recordId);

  if (!rodizio) {
    return (
      <div className="rounded-[28px] bg-white p-7 ring-1 ring-folha-100">
        <p className="text-sm text-slate-700">Rodízio {recordId} não encontrado em {unidade.nome}.</p>
      </div>
    );
  }

  if (rodizio.record.status === 'scheduled') {
    return (
      <div className="rounded-[28px] bg-white p-7 ring-1 ring-folha-100">
        <p className="text-sm text-slate-700">
          Esta posição ainda está agendada. O relatório é preenchido depois de registrar o rodízio.
        </p>
        <Link href={hrefRelatorio(recordId)} className="mt-3 inline-block text-sm font-medium text-folha-700 hover:underline">
          Ver a previsão
        </Link>
      </div>
    );
  }

  const existente = relatorios.get(recordId);
  const codigo = codigoRelatorio(unidade, rodizio.record.cycleNumber, rodizio.numero);
  const { estado, aviso } = existente
    ? { estado: { status: existente.status, assinadoEm: existente.assinadoEm, dados: existente.dados }, aviso: undefined }
    : sugestaoInicial(unidade, rodizio, records, relatorios);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href={existente ? hrefRelatorio(recordId) : `/${unidade.id}/relatorios`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-folha-800 hover:bg-folha-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {existente ? 'Ver relatório' : 'Relatórios'}
        </Link>
        <span className="font-display text-xl font-semibold text-grafite">{codigo}</span>
        <SeloSituacao relatorio={existente} />
      </div>

      <FormularioRelatorio
        key={recordId}
        unidade={unidade}
        rodizio={rodizio}
        codigo={codigo}
        inicial={estado}
        existente={!!existente}
        avisoPreenchimento={aviso}
        onSalvar={async (e) => {
          await salvarRelatorio(recordId, e);
        }}
        onFinalizado={() => router.push(hrefRelatorio(recordId))}
      />
    </div>
  );
}
