export type PositionStatus = 'active' | 'completed' | 'available';

export interface PositionInfo {
  id: number; // 1 to 18
  formattedId: string; // "01", "02", ...
  cellId: number; // 1 to 6
  plantIndex: number; // 1 to 3
  label: string; // "Célula X - Planta Y"
  coordinates: {
    // Relative coordinates in the SVG schematic (0 to 1000 x, 0 to 600 y)
    x: number;
    y: number;
  };
}

export interface RotationRecord {
  id: string; // e.g. "REG-001"
  cycleNumber: number;
  positionId: number;
  cellId: number;
  plantIndex: number;
  installedAt: string; // YYYY-MM-DD
  scheduledNextChange: string; // YYYY-MM-DD (typically installedAt + 14 days)
  removedAt?: string | null; // YYYY-MM-DD or null if still active
  responsible: string;
  notes: string;
  status: 'active' | 'completed' | 'scheduled';
  batteryLevel?: number; // 0-100%
  signalQuality?: 'Excelente' | 'Bom' | 'Regular';
  createdAt: string;
  updatedAt: string;
}

export interface CycleStats {
  currentCycle: number;
  totalPositions: number; // 18
  completedCount: number;
  remainingCount: number;
  activePositionId: number | null;
  percentageCompleted: number;
  weeksElapsed: number;
  totalWeeks: number; // 36
  daysRemainingInCurrentPosition: number;
}
