import * as XLSX from 'xlsx';
import { RotationRecord, PositionStatus, PositionInfo, CycleStats } from './types';
import { codigoRelatorio, rodiziosDoCiclo, situacaoRelatorio, type Relatorio } from './relatorio';
import type { Unidade } from './unidades';
import { POSITIONS_DATA, TOTAL_POSITIONS, DAYS_PER_ROTATION, TOTAL_WEEKS } from './constants';

// Date helper: get today's local date as YYYY-MM-DD
export const getTodayLocalDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Date helper: add days to YYYY-MM-DD
export const addDaysToDate = (dateStr: string, days: number): string => {
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;

  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  d.setDate(d.getDate() + days);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Format date for display (BR: DD/MM/YYYY)
export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Calculate days difference between today (midnight) and a target date (midnight)
// Returns:
//   > 0 : days left in the future (e.g. 14, 2, 1)
//   0   : target date is today
//   < 0 : target date is overdue (e.g. -1 means 1 day late)
export const calculateDaysRemaining = (targetDateStr: string): number => {
  if (!targetDateStr) return 0;
  const cleanDate = targetDateStr.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;

  const [targetYear, targetMonth, targetDay] = parts;
  const targetMidnight = new Date(targetYear, targetMonth - 1, targetDay, 0, 0, 0, 0).getTime();

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const diffMs = targetMidnight - todayMidnight;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

// Compute status of a position within the current cycle
export const getPositionStatusInCycle = (
  positionId: number,
  records: RotationRecord[],
  currentCycle: number
): PositionStatus => {
  const activeRecord = records.find(
    (r) => r.cycleNumber === currentCycle && r.positionId === positionId && r.status === 'active'
  );
  if (activeRecord) return 'active';

  const completedRecord = records.find(
    (r) => r.cycleNumber === currentCycle && r.positionId === positionId && r.status === 'completed'
  );
  if (completedRecord) return 'completed';

  const scheduledRecord = records.find(
    (r) => r.cycleNumber === currentCycle && r.positionId === positionId && r.status === 'scheduled'
  );
  if (scheduledRecord) return 'scheduled';

  return 'available';
};

// Posições que ainda podem ser sorteadas no ciclo: nem amostradas, nem já sorteadas (agendadas)
export const getAvailablePositionsForCycle = (
  records: RotationRecord[],
  currentCycle: number
): PositionInfo[] => {
  const visitedPositionIds = new Set(
    records.filter((r) => r.cycleNumber === currentCycle).map((r) => r.positionId)
  );

  return POSITIONS_DATA.filter((pos) => !visitedPositionIds.has(pos.id));
};

// Compute overall statistics for the dashboard
export const computeCycleStats = (
  records: RotationRecord[],
  currentCycle: number
): CycleStats => {
  const currentCycleRecords = records.filter((r) => r.cycleNumber === currentCycle);
  const activeRecord = currentCycleRecords.find((r) => r.status === 'active');
  const completedRecords = currentCycleRecords.filter((r) => r.status === 'completed');

  const visitedSet = new Set(
    currentCycleRecords
      .filter((r) => r.status === 'active' || r.status === 'completed')
      .map((r) => r.positionId)
  );

  const completedCount = visitedSet.size;
  const scheduledCount = currentCycleRecords.some((r) => r.status === 'scheduled') ? 1 : 0;
  // "Disponíveis" = ainda podem ser sorteadas (a posição agendada já foi sorteada).
  const remainingCount = Math.max(0, TOTAL_POSITIONS - completedCount - scheduledCount);
  const percentageCompleted = Math.round((completedCount / TOTAL_POSITIONS) * 100);
  const weeksElapsed = completedCount * 2;

  let daysRemainingInCurrentPosition = 0;
  if (activeRecord?.scheduledNextChange) {
    daysRemainingInCurrentPosition = calculateDaysRemaining(activeRecord.scheduledNextChange);
  }

  return {
    currentCycle,
    totalPositions: TOTAL_POSITIONS,
    completedCount,
    remainingCount,
    activePositionId: activeRecord ? activeRecord.positionId : null,
    percentageCompleted,
    weeksElapsed,
    totalWeeks: TOTAL_WEEKS,
    daysRemainingInCurrentPosition,
  };
};

// ---------------------------------------------------------------------------
// Exportação (CSV e Excel), sempre de uma unidade piloto
// ---------------------------------------------------------------------------

const STATUS_REGISTRO: Record<RotationRecord['status'], string> = {
  active: 'Ativo',
  completed: 'Concluído',
  scheduled: 'Agendado',
};

const SITUACAO_RELATORIO = {
  pendente: 'Pendente',
  rascunho: 'Rascunho',
  concluido: 'Concluído',
  assinado: 'Assinado',
} as const;

const posicao2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const numeroBR = (n: number | null) => (n === null ? '' : n.toLocaleString('pt-BR'));
const nomeArquivoUnidade = (unidade: Unidade) => unidade.nome.normalize('NFD').replace(/[̀-ͯ]/g, '');

interface LinhaExportacao {
  record: RotationRecord;
  codigo: string;
  origem: RotationRecord | null;
  relatorio: Relatorio | undefined;
}

/** Junta cada registro com o código do rodízio (BrevesC1R2), a posição de origem e o relatório. */
function montarLinhas(records: RotationRecord[], unidade: Unidade, relatorios: Relatorio[]): LinhaExportacao[] {
  const porRegistro = new Map(relatorios.map((r) => [r.recordId, r]));
  const ciclos = Array.from(new Set(records.map((r) => r.cycleNumber)));
  const info = new Map<string, { codigo: string; origem: RotationRecord | null }>();
  for (const ciclo of ciclos) {
    for (const rod of rodiziosDoCiclo(records, ciclo)) {
      info.set(rod.record.id, { codigo: codigoRelatorio(unidade, ciclo, rod.numero), origem: rod.origem });
    }
  }
  return records.map((record) => ({
    record,
    codigo: info.get(record.id)?.codigo ?? '',
    origem: info.get(record.id)?.origem ?? null,
    relatorio: porRegistro.get(record.id),
  }));
}

function linhaRegistro({ record: r, codigo, relatorio }: LinhaExportacao) {
  const tel = relatorio?.dados.telemetria;
  return {
    'ID Registro': r.id,
    'Rodízio': codigo,
    Ciclo: `Ciclo ${r.cycleNumber}`,
    Célula: `Célula ${r.cellId}`,
    'Planta (Posição)': `Planta ${r.plantIndex}`,
    Identificador: `Posição ${posicao2(r.positionId)}`,
    'Data Instalação': formatDateBR(r.installedAt),
    'Data Prevista / Troca': formatDateBR(r.scheduledNextChange),
    'Data Retirada': r.removedAt ? formatDateBR(r.removedAt) : 'Ativo em campo',
    Status: STATUS_REGISTRO[r.status],
    Responsável: r.responsible,
    'Relatório de campo': SITUACAO_RELATORIO[situacaoRelatorio(relatorio)],
    'ZL6 (mV)': numeroBR(tel?.zl6.tensaoMv ?? null),
    'μMETOS (mV)': numeroBR(tel?.umetos.tensaoMv ?? null),
    Observações: r.notes || '',
  };
}

const marca = (v: boolean) => (v ? 'Sim' : 'Não');

function linhaRelatorio({ record: r, codigo, origem, relatorio }: LinhaExportacao, unidade: Unidade) {
  const d = relatorio!.dados;
  const tel = (t: typeof d.telemetria.zl6, sinal: string) => ({
    status: t.status === 'ok' ? 'OK' : t.status === 'falha' ? 'Falha' : '',
    sinal: t.sinalFraco ? `${sinal} (fraco)` : sinal,
  });
  const zl6 = tel(d.telemetria.zl6, '4G');
  const umetos = tel(d.telemetria.umetos, 'NB-IoT');
  return {
    Rodízio: codigo,
    'ID Registro': r.id,
    'Unidade piloto': unidade.rotuloRelatorio,
    Ciclo: r.cycleNumber,
    'Data da movimentação': formatDateBR(r.installedAt),
    'Responsável técnico': d.responsavelTecnico,
    'Equipe de apoio': d.equipeApoio,
    'Horário de desconexão': origem ? d.horaDesconexao : '1ª instalação',
    'Horário de restabelecimento': d.horaRestabelecimento,
    'Posição de origem': origem ? posicao2(origem.positionId) : '00',
    'Posição de destino': posicao2(r.positionId),
    'Tratamento origem': d.origem.tratamento ?? '',
    'Tratamento destino': d.destino.tratamento ?? '',
    'Latitude origem': d.origem.latitude,
    'Longitude origem': d.origem.longitude,
    'Latitude destino': d.destino.latitude,
    'Longitude destino': d.destino.longitude,
    'Raio origem (m)': numeroBR(d.origem.raioM),
    'Raio destino (m)': numeroBR(d.destino.raioM),
    'Espécies vizinhas origem': d.origem.especies,
    'Espécies vizinhas destino': d.destino.especies,
    'Desinstalação conferida': origem ? `${Object.values(d.desinstalacao).filter(Boolean).length} de 5` : 'Não se aplica',
    'Altura ATMOS 41 (m)': numeroBR(d.estrutura.alturaM),
    'Nivelamento (°)': numeroBR(d.estrutura.nivelamentoGraus),
    'Orientação ao Norte': marca(d.estrutura.orientacaoNorte),
    'TEROS 10 (cm)': numeroBR(d.solo.teros10Cm),
    'TEROS 21 (cm)': numeroBR(d.solo.teros21Cm),
    'Proteção de cabos': marca(d.solo.protecaoCabos),
    FylloClips: marca(d.planta.fylloclips),
    'Radiômetro SIL-411 (°)': numeroBR(d.planta.radiometroGraus),
    'Dendrômetro DD-L':
      d.planta.dendrometro === 'caule'
        ? `No caule (${numeroBR(d.planta.dendrometroDiametroCm)} cm)`
        : d.planta.dendrometro === 'suspenso'
        ? 'Suspenso (planta muito jovem)'
        : '',
    'ZL6 status': zl6.status,
    'ZL6 tensão (mV)': numeroBR(d.telemetria.zl6.tensaoMv),
    'ZL6 sinal': zl6.sinal,
    'ZL6 primeiro pacote': d.telemetria.zl6.primeiroPacote,
    'μMETOS status': umetos.status,
    'μMETOS tensão (mV)': numeroBR(d.telemetria.umetos.tensaoMv),
    'μMETOS sinal': umetos.sinal,
    'μMETOS primeiro pacote': d.telemetria.umetos.primeiroPacote,
    'Fotos registradas': `${d.fotos.filter(Boolean).length} de ${d.fotos.length}`,
    'Ocorrências de campo': d.ocorrencias,
    Situação: SITUACAO_RELATORIO[situacaoRelatorio(relatorio)],
    'Assinado em': relatorio!.assinadoEm ? formatDateBR(relatorio!.assinadoEm) : '',
  };
}

// Export to CSV with UTF-8 BOM
export const exportRecordsToCSV = (
  records: RotationRecord[],
  cycle: number,
  unidade: Unidade,
  relatorios: Relatorio[]
): void => {
  const linhas = montarLinhas(records, unidade, relatorios).map(linhaRegistro);
  if (linhas.length === 0) return;
  const headers = Object.keys(linhas[0]);
  const celula = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvContent =
    '﻿' + [headers.map(celula).join(';'), ...linhas.map((l) => Object.values(l).map(celula).join(';'))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `MonitorAcai_Rodizio_${nomeArquivoUnidade(unidade)}_Ciclo${cycle}_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to native Excel (.xlsx): aba de registros + aba com os relatórios de campo
export const exportRecordsToExcel = (
  records: RotationRecord[],
  cycle: number,
  unidade: Unidade,
  relatorios: Relatorio[]
): void => {
  const linhas = montarLinhas(records, unidade, relatorios);
  const workbook = XLSX.utils.book_new();

  const abaRegistros = XLSX.utils.json_to_sheet(linhas.map(linhaRegistro));
  abaRegistros['!cols'] = [14, 13, 10, 12, 10, 12, 16, 20, 16, 12, 24, 18, 11, 12, 45].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, abaRegistros, `Rodízio Ciclo ${cycle}`);

  const comRelatorio = linhas.filter((l) => l.relatorio);
  if (comRelatorio.length > 0) {
    const abaRelatorios = XLSX.utils.json_to_sheet(comRelatorio.map((l) => linhaRelatorio(l, unidade)));
    XLSX.utils.book_append_sheet(workbook, abaRelatorios, 'Relatórios de campo');
  }

  XLSX.writeFile(
    workbook,
    `MonitorAcai_Rodizio_${nomeArquivoUnidade(unidade)}_Ciclo${cycle}_${new Date().toISOString().split('T')[0]}.xlsx`
  );
};
