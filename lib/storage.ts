import * as XLSX from 'xlsx';
import { RotationRecord, PositionStatus, PositionInfo, CycleStats } from './types';
import { POSITIONS_DATA, INITIAL_SEEDED_RECORDS, TOTAL_POSITIONS, DAYS_PER_ROTATION, TOTAL_WEEKS } from './constants';

const STORAGE_KEY_RECORDS = 'monitor_acai_records_v2';
const STORAGE_KEY_CYCLE = 'monitor_acai_cycle_v2';

export const getStoredRecords = (): RotationRecord[] => {
  if (typeof window === 'undefined') return INITIAL_SEEDED_RECORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_SEEDED_RECORDS));
      return INITIAL_SEEDED_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SEEDED_RECORDS;
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return INITIAL_SEEDED_RECORDS;
  }
};

export const saveStoredRecords = (records: RotationRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
};

export const getStoredCycle = (): number => {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CYCLE);
    if (!raw) return 1;
    const num = parseInt(raw, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  } catch {
    return 1;
  }
};

export const saveStoredCycle = (cycle: number): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CYCLE, cycle.toString());
  } catch (err) {
    console.error('Error saving cycle:', err);
  }
};

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

  return 'available';
};

// Get list of available positions for drawing in the current cycle
export const getAvailablePositionsForCycle = (
  records: RotationRecord[],
  currentCycle: number
): PositionInfo[] => {
  const visitedPositionIds = new Set(
    records
      .filter((r) => r.cycleNumber === currentCycle && (r.status === 'active' || r.status === 'completed'))
      .map((r) => r.positionId)
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
  const remainingCount = Math.max(0, TOTAL_POSITIONS - completedCount);
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

// Export to CSV with UTF-8 BOM
export const exportRecordsToCSV = (records: RotationRecord[], cycle: number): void => {
  const headers = [
    'ID Registro',
    'Ciclo',
    'Célula',
    'Planta (Posição)',
    'Identificador',
    'Data Instalação',
    'Data Prevista / Troca',
    'Data Retirada',
    'Status',
    'Responsável',
    'Bateria (%)',
    'Sinal',
    'Observações',
  ];

  const rows = records.map((r) => [
    r.id,
    `Ciclo ${r.cycleNumber}`,
    `Célula ${r.cellId}`,
    `Planta ${r.plantIndex}`,
    `Posição ${r.positionId < 10 ? '0' + r.positionId : r.positionId}`,
    formatDateBR(r.installedAt),
    formatDateBR(r.scheduledNextChange),
    r.removedAt ? formatDateBR(r.removedAt) : 'Ativo em campo',
    r.status === 'active' ? 'Ativo' : r.status === 'completed' ? 'Concluído' : 'Agendado',
    r.responsible,
    r.batteryLevel ? `${r.batteryLevel}%` : 'N/A',
    r.signalQuality || 'N/A',
    `"${(r.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MonitorAcai_Rodizio_Sensores_IFPA_Breves_Ciclo${cycle}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to native Excel (.xlsx) using xlsx library
export const exportRecordsToExcel = (records: RotationRecord[], cycle: number): void => {
  const data = records.map((r) => ({
    'ID Registro': r.id,
    'Ciclo': `Ciclo ${r.cycleNumber}`,
    'Célula': `Célula ${r.cellId}`,
    'Planta': `Planta ${r.plantIndex}`,
    'Posição': `Posição ${r.positionId < 10 ? '0' + r.positionId : r.positionId}`,
    'Data de Instalação': formatDateBR(r.installedAt),
    'Previsão Próxima Troca': formatDateBR(r.scheduledNextChange),
    'Data de Retirada': r.removedAt ? formatDateBR(r.removedAt) : 'Ativo em campo',
    'Status': r.status === 'active' ? 'Ativo' : r.status === 'completed' ? 'Concluído' : 'Agendado',
    'Responsável': r.responsible,
    'Nível de Bateria': r.batteryLevel ? `${r.batteryLevel}%` : 'N/A',
    'Qualidade do Sinal': r.signalQuality || 'N/A',
    'Observações de Campo': r.notes,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const colWidths = [
    { wch: 14 }, // ID
    { wch: 10 }, // Ciclo
    { wch: 12 }, // Célula
    { wch: 10 }, // Planta
    { wch: 12 }, // Posição
    { wch: 16 }, // Data Instalação
    { wch: 20 }, // Previsão
    { wch: 16 }, // Data Retirada
    { wch: 12 }, // Status
    { wch: 24 }, // Responsável
    { wch: 15 }, // Bateria
    { wch: 16 }, // Sinal
    { wch: 45 }, // Observações
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rodízio Ciclo ${cycle}`);
  XLSX.writeFile(workbook, `MonitorAcai_Rodizio_IFPA_Breves_Ciclo${cycle}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
