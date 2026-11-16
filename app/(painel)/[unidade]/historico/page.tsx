'use client';

import { HistoryCrud } from '@/components/HistoryCrud';
import { useUnidade } from '@/components/app/PainelUnidade';

export default function PaginaHistorico() {
  const { unidade, records, relatorios, currentCycle, abrirNovoRegistro, editarRegistro, excluirRegistro, focarNoMapa, hrefRelatorio, podeEditar } =
    useUnidade();

  return (
    <HistoryCrud
      records={records}
      currentCycle={currentCycle}
      unidade={unidade}
      relatorios={relatorios}
      hrefRelatorio={hrefRelatorio}
      onOpenCreate={podeEditar ? abrirNovoRegistro : undefined}
      onEditRecord={podeEditar ? editarRegistro : undefined}
      onDeleteRecord={podeEditar ? excluirRegistro : undefined}
      onSelectPosition={focarNoMapa}
    />
  );
}
