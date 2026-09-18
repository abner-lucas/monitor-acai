import { IRotationService, CreateRecordInput, UpdateRecordInput } from './types';
import { RotationRecord } from '../types';
import { INITIAL_SEEDED_RECORDS } from '../constants';

const STORAGE_KEY_RECORDS = 'monitor_acai_records_v3';
const STORAGE_KEY_CYCLE = 'monitor_acai_cycle_v3';

// Simulated delay helper (300ms to 500ms)
const simulateDelay = (min = 300, max = 500) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export class MockRotationService implements IRotationService {
  private getLocalRecords(): RotationRecord[] {
    if (typeof window === 'undefined') return INITIAL_SEEDED_RECORDS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_SEEDED_RECORDS));
        return INITIAL_SEEDED_RECORDS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_SEEDED_RECORDS;
    } catch {
      return INITIAL_SEEDED_RECORDS;
    }
  }

  private saveLocalRecords(records: RotationRecord[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (err) {
      console.error('Falha ao salvar no localStorage:', err);
    }
  }

  async getRecords(): Promise<RotationRecord[]> {
    await simulateDelay(250, 450);
    return this.getLocalRecords();
  }

  async getRecordById(id: string): Promise<RotationRecord | null> {
    await simulateDelay(200, 350);
    const records = this.getLocalRecords();
    return records.find((r) => r.id === id) || null;
  }

  async createRecord(input: CreateRecordInput): Promise<RotationRecord> {
    await simulateDelay(350, 550);

    // Validation
    if (!input.installedAt || !input.scheduledNextChange) {
      throw new Error('As datas de instalação e próxima troca são obrigatórias.');
    }
    if (new Date(input.scheduledNextChange) < new Date(input.installedAt)) {
      throw new Error('A data da próxima troca não pode ser anterior à data de instalação.');
    }
    if (!input.responsible || input.responsible.trim().length < 2) {
      throw new Error('O nome do responsável técnico é obrigatório.');
    }

    const records = this.getLocalRecords();
    const newId = `REG-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}`;

    const newRecord: RotationRecord = {
      id: newId,
      cycleNumber: input.cycleNumber,
      positionId: input.positionId,
      cellId: input.cellId,
      plantIndex: input.plantIndex,
      installedAt: input.installedAt,
      scheduledNextChange: input.scheduledNextChange,
      removedAt: input.removedAt || null,
      responsible: input.responsible.trim(),
      notes: input.notes?.trim() || '',
      status: input.status,
      batteryLevel: input.batteryLevel ?? 98,
      signalQuality: input.signalQuality || 'Excelente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If new record is active, set any prior active record in the same cycle to completed
    let updatedRecords = records;
    if (newRecord.status === 'active') {
      updatedRecords = updatedRecords.map((r) => {
        if (r.cycleNumber === newRecord.cycleNumber && r.status === 'active') {
          return {
            ...r,
            status: 'completed' as const,
            removedAt: input.installedAt,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });
    }

    updatedRecords = [newRecord, ...updatedRecords];
    this.saveLocalRecords(updatedRecords);
    return newRecord;
  }

  async updateRecord(id: string, updates: UpdateRecordInput): Promise<RotationRecord> {
    await simulateDelay(350, 550);

    const records = this.getLocalRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Registro com ID ${id} não foi encontrado.`);
    }

    const current = records[index];

    // Validation
    const installedAt = updates.installedAt ?? current.installedAt;
    const scheduledNextChange = updates.scheduledNextChange ?? current.scheduledNextChange;
    if (new Date(scheduledNextChange) < new Date(installedAt)) {
      throw new Error('A data da próxima troca não pode ser anterior à data de instalação.');
    }

    const updatedRecord: RotationRecord = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    let updatedRecords = records.map((r) => (r.id === id ? updatedRecord : r));

    // If updated to active, ensure other records in cycle are marked completed
    if (updates.status === 'active') {
      updatedRecords = updatedRecords.map((r) => {
        if (r.id !== id && r.cycleNumber === updatedRecord.cycleNumber && r.status === 'active') {
          return {
            ...r,
            status: 'completed' as const,
            removedAt: updatedRecord.installedAt,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });
    }

    this.saveLocalRecords(updatedRecords);
    return updatedRecord;
  }

  async deleteRecord(id: string): Promise<boolean> {
    await simulateDelay(300, 500);
    const records = this.getLocalRecords();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) {
      throw new Error(`Registro com ID ${id} não encontrado para exclusão.`);
    }
    this.saveLocalRecords(filtered);
    return true;
  }

  async getCurrentCycle(): Promise<number> {
    await simulateDelay(150, 250);
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CYCLE);
      if (!raw) return 1;
      const num = parseInt(raw, 10);
      return isNaN(num) || num < 1 ? 1 : num;
    } catch {
      return 1;
    }
  }

  async setCycle(cycle: number): Promise<number> {
    await simulateDelay(200, 350);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CYCLE, cycle.toString());
      } catch (e) {
        console.error(e);
      }
    }
    return cycle;
  }
}

export const mockRotationService = new MockRotationService();
