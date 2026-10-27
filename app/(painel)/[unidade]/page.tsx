'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardCards } from '@/components/DashboardCards';
import { SafVisualMap } from '@/components/SafVisualMap';
import { Revelar } from '@/components/vivo/Revelar';
import { Indicadores } from '@/components/graficos/Indicadores';
import { useUnidade } from '@/components/app/PainelUnidade';
import { codigoRelatorio, rodizioDoRegistro } from '@/lib/relatorio';

export default function PaginaPainel() {
  const router = useRouter();
  const {
    unidade,
    records,
    relatorios,
    currentCycle,
    stats,
    availablePositions,
    scheduledRecord,
    activeRecord,
    selectedPositionId,
    selecionarPosicao,
    focarNoMapa,
    consumirPedidoDeMapa,
    abrirRegistro,
    abrirAgendamento,
    abrirCicloCompleto,
    hrefRelatorio,
  } = useUnidade();

  // Vindo do histórico ("ver no mapa"): rola até a planta selecionada.
  useEffect(() => {
    if (!consumirPedidoDeMapa()) return;
    const t = setTimeout(() => {
      document.getElementById('saf-visual-matrix')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [consumirPedidoDeMapa]);

  const rodizioAtivo = activeRecord ? rodizioDoRegistro(records, activeRecord.id) : null;

  return (
    <>
      <DashboardCards
        stats={stats}
        activeRecord={activeRecord}
        availablePositions={availablePositions}
        scheduledRecord={scheduledRecord}
        onRegistrar={abrirRegistro}
        onAgendar={abrirAgendamento}
        relatorioAtivo={activeRecord ? relatorios.get(activeRecord.id) : undefined}
        codigoRelatorioAtivo={rodizioAtivo ? codigoRelatorio(unidade, currentCycle, rodizioAtivo.numero) : undefined}
        hrefRelatorioAtivo={activeRecord ? hrefRelatorio(activeRecord.id, !relatorios.has(activeRecord.id)) : undefined}
        onSelectPosition={focarNoMapa}
        onOpenCycleComplete={abrirCicloCompleto}
      />

      <Revelar>
        <Indicadores records={records} relatorios={relatorios} currentCycle={currentCycle} />
      </Revelar>

      <Revelar>
        <SafVisualMap
          records={records}
          currentCycle={currentCycle}
          local={unidade.nome}
          selectedPositionId={selectedPositionId}
          onSelectPosition={(posId) => selecionarPosicao(posId === selectedPositionId ? null : posId)}
          onOpenRaffle={activeRecord && !scheduledRecord ? abrirAgendamento : abrirRegistro}
          onOpenReport={(recordId) => router.push(hrefRelatorio(recordId, !relatorios.has(recordId)))}
        />
      </Revelar>
    </>
  );
}
