import { IRotationService, CreateRecordInput, UpdateRecordInput } from './types';
import { RotationRecord } from '../types';
import { ApiError, apiRequest } from './apiClient';

/**
 * Rotation Service Implementation: rotas /api do app, gravando no MySQL da Hostinger.
 */
export class ApiRotationService implements IRotationService {
  async getRecords(): Promise<RotationRecord[]> {
    const { records } = await apiRequest<{ records: RotationRecord[] }>('/api/records');
    return records;
  }

  async getRecordById(id: string): Promise<RotationRecord | null> {
    try {
      const { record } = await apiRequest<{ record: RotationRecord }>(`/api/records/${encodeURIComponent(id)}`);
      return record;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async createRecord(input: CreateRecordInput): Promise<RotationRecord> {
    const { record } = await apiRequest<{ record: RotationRecord }>('/api/records', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return record;
  }

  async updateRecord(id: string, updates: UpdateRecordInput): Promise<RotationRecord> {
    const { record } = await apiRequest<{ record: RotationRecord }>(`/api/records/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return record;
  }

  async deleteRecord(id: string): Promise<boolean> {
    await apiRequest(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }

  async getCurrentCycle(): Promise<number> {
    const { cycle } = await apiRequest<{ cycle: number }>('/api/settings/cycle');
    return cycle;
  }

  async setCycle(cycle: number): Promise<number> {
    const { cycle: saved } = await apiRequest<{ cycle: number }>('/api/settings/cycle', {
      method: 'PUT',
      body: JSON.stringify({ cycle }),
    });
    return saved;
  }
}

export const apiRotationService = new ApiRotationService();
