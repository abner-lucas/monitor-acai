import { PositionInfo, RotationRecord } from './types';

export const TOTAL_POSITIONS = 18;
export const DAYS_PER_ROTATION = 14;
export const TOTAL_WEEKS = 36; // 18 positions * 2 weeks

export const CELLS_METADATA = [
  { id: 1, name: 'Célula 1', description: 'Triângulo Superior Oeste - Açaizal SAF IFPA', plantPositions: [1, 7, 13], dataloggerId: 'DLG-01' },
  { id: 2, name: 'Célula 2', description: 'Triângulo Superior Centro - Açaizal SAF IFPA', plantPositions: [2, 8, 14], dataloggerId: 'DLG-02' },
  { id: 3, name: 'Célula 3', description: 'Triângulo Superior Leste - Açaizal SAF IFPA', plantPositions: [3, 9, 15], dataloggerId: 'DLG-03' },
  { id: 4, name: 'Célula 4', description: 'Triângulo Inferior Oeste - Açaizal SAF IFPA', plantPositions: [4, 10, 16], dataloggerId: 'DLG-04' },
  { id: 5, name: 'Célula 5', description: 'Triângulo Inferior Centro - Açaizal SAF IFPA', plantPositions: [5, 11, 17], dataloggerId: 'DLG-05' },
  { id: 6, name: 'Célula 6', description: 'Triângulo Inferior Leste - Açaizal SAF IFPA', plantPositions: [6, 12, 18], dataloggerId: 'DLG-06' },
];

export const POSITIONS_DATA: PositionInfo[] = [
  // Célula 1
  {
    id: 1,
    formattedId: '01',
    cellId: 1,
    plantIndex: 1,
    label: 'Célula 1 - Planta 1',
    coordinates: { x: 190, y: 135 },
  },
  {
    id: 7,
    formattedId: '07',
    cellId: 1,
    plantIndex: 2,
    label: 'Célula 1 - Planta 2',
    coordinates: { x: 290, y: 135 },
  },
  {
    id: 13,
    formattedId: '13',
    cellId: 1,
    plantIndex: 3,
    label: 'Célula 1 - Planta 3',
    coordinates: { x: 240, y: 260 },
  },

  // Célula 2
  {
    id: 2,
    formattedId: '02',
    cellId: 2,
    plantIndex: 1,
    label: 'Célula 2 - Planta 1',
    coordinates: { x: 505, y: 135 },
  },
  {
    id: 8,
    formattedId: '08',
    cellId: 2,
    plantIndex: 2,
    label: 'Célula 2 - Planta 2',
    coordinates: { x: 605, y: 135 },
  },
  {
    id: 14,
    formattedId: '14',
    cellId: 2,
    plantIndex: 3,
    label: 'Célula 2 - Planta 3',
    coordinates: { x: 555, y: 260 },
  },

  // Célula 3
  {
    id: 3,
    formattedId: '03',
    cellId: 3,
    plantIndex: 1,
    label: 'Célula 3 - Planta 1',
    coordinates: { x: 820, y: 135 },
  },
  {
    id: 9,
    formattedId: '09',
    cellId: 3,
    plantIndex: 2,
    label: 'Célula 3 - Planta 2',
    coordinates: { x: 920, y: 135 },
  },
  {
    id: 15,
    formattedId: '15',
    cellId: 3,
    plantIndex: 3,
    label: 'Célula 3 - Planta 3',
    coordinates: { x: 870, y: 260 },
  },

  // Célula 4
  {
    id: 10,
    formattedId: '10',
    cellId: 4,
    plantIndex: 2,
    label: 'Célula 4 - Planta 2',
    coordinates: { x: 190, y: 375 },
  },
  {
    id: 4,
    formattedId: '04',
    cellId: 4,
    plantIndex: 1,
    label: 'Célula 4 - Planta 1',
    coordinates: { x: 85, y: 495 },
  },
  {
    id: 16,
    formattedId: '16',
    cellId: 4,
    plantIndex: 3,
    label: 'Célula 4 - Planta 3',
    coordinates: { x: 290, y: 495 },
  },

  // Célula 5
  {
    id: 11,
    formattedId: '11',
    cellId: 5,
    plantIndex: 2,
    label: 'Célula 5 - Planta 2',
    coordinates: { x: 505, y: 375 },
  },
  {
    id: 5,
    formattedId: '05',
    cellId: 5,
    plantIndex: 1,
    label: 'Célula 5 - Planta 1',
    coordinates: { x: 400, y: 495 },
  },
  {
    id: 17,
    formattedId: '17',
    cellId: 5,
    plantIndex: 3,
    label: 'Célula 5 - Planta 3',
    coordinates: { x: 605, y: 495 },
  },

  // Célula 6
  {
    id: 12,
    formattedId: '12',
    cellId: 6,
    plantIndex: 2,
    label: 'Célula 6 - Planta 2',
    coordinates: { x: 815, y: 375 },
  },
  {
    id: 6,
    formattedId: '06',
    cellId: 6,
    plantIndex: 1,
    label: 'Célula 6 - Planta 1',
    coordinates: { x: 710, y: 495 },
  },
  {
    id: 18,
    formattedId: '18',
    cellId: 6,
    plantIndex: 3,
    label: 'Célula 6 - Planta 3',
    coordinates: { x: 895, y: 495 },
  },
];

// Helper to look up position by id
export const getPositionById = (id: number): PositionInfo | undefined => {
  return POSITIONS_DATA.find((p) => p.id === id);
};

// Initial seeded records matching user specifications:
// 1. Instalação na planta 01 na célula 1 no dia 15/08 (concluído)
// 2. Instalação na planta 02 na célula 2 no dia 03/09 (ativo)
export const INITIAL_SEEDED_RECORDS: RotationRecord[] = [
  {
    id: 'REG-2026-001',
    cycleNumber: 1,
    positionId: 1,
    cellId: 1,
    plantIndex: 1,
    installedAt: '2026-08-15',
    scheduledNextChange: '2026-08-29',
    removedAt: '2026-09-03',
    responsible: 'Ábner Lucas / Técnico IFPA',
    notes: 'Instalação inicial da campanha. Sensores FDR posicionados a 20cm e 40cm de profundidade.',
    status: 'completed',
    batteryLevel: 98,
    signalQuality: 'Excelente',
    createdAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-09-03T10:00:00Z',
  },
  {
    id: 'REG-2026-002',
    cycleNumber: 1,
    positionId: 8,
    cellId: 2,
    plantIndex: 2,
    installedAt: '2026-09-03',
    scheduledNextChange: '2026-09-17',
    removedAt: null,
    responsible: 'Ábner Lucas / Técnico IFPA',
    notes: 'Sensor ativo em campo. Baterias recarregadas e transmissão de telemetria LoRa operando normalmente.',
    status: 'active',
    batteryLevel: 96,
    signalQuality: 'Excelente',
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-03T10:00:00Z',
  },
];
