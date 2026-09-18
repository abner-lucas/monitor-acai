import { RotationRecord } from '../types';

export interface CreateRecordInput {
  cycleNumber: number;
  positionId: number;
  cellId: number;
  plantIndex: number;
  installedAt: string;
  scheduledNextChange: string;
  removedAt?: string | null;
  responsible: string;
  notes?: string;
  status: 'active' | 'completed' | 'scheduled';
  batteryLevel?: number;
  signalQuality?: 'Excelente' | 'Bom' | 'Regular';
}

export interface UpdateRecordInput {
  cycleNumber?: number;
  positionId?: number;
  cellId?: number;
  plantIndex?: number;
  installedAt?: string;
  scheduledNextChange?: string;
  removedAt?: string | null;
  responsible?: string;
  notes?: string;
  status?: 'active' | 'completed' | 'scheduled';
  batteryLevel?: number;
  signalQuality?: 'Excelente' | 'Bom' | 'Regular';
}

/**
 * Service Contract for Rotation Records Management.
 * Implemented by MockRotationService (localStorage) and ready for SupabaseRotationService.
 */
export interface IRotationService {
  /** Fetch all rotation records */
  getRecords(): Promise<RotationRecord[]>;

  /** Get a single record by ID */
  getRecordById(id: string): Promise<RotationRecord | null>;

  /** Create a new record */
  createRecord(input: CreateRecordInput): Promise<RotationRecord>;

  /** Update an existing record */
  updateRecord(id: string, updates: UpdateRecordInput): Promise<RotationRecord>;

  /** Delete a record by ID */
  deleteRecord(id: string): Promise<boolean>;

  /** Get the current active cycle number */
  getCurrentCycle(): Promise<number>;

  /** Update the current cycle */
  setCycle(cycle: number): Promise<number>;
}
