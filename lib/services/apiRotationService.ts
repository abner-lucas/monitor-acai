import { IRotationService, CreateRecordInput, UpdateRecordInput } from './types';
import { RotationRecord } from '../types';
import { UnidadeId } from '../unidades';
import { ApiError, apiRequest } from './apiClient';

/**
 * Rotation Service Implementation: rotas /api do app, gravando no MySQL da Hostinger.
 * Cada instância trabalha com uma unidade piloto (Breves ou Muaná).
 */
export class ApiRotationService implements IRotationService {
  constructor(private readonly unidade: UnidadeId) {}

  private get consulta() {
    return `?unidade=${this.unidade}`;
  }

  async getRecords(): Promise<RotationRecord[]> {
    const { records } = await apiRequest<{ records: RotationRecord[] }>(`/api/records${this.consulta}`);
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
    const { record } = await apiRequest<{ record: RotationRecord }>(`/api/records${this.consulta}`, {
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
    const { cycle } = await apiRequest<{ cycle: number }>(`/api/settings/cycle${this.consulta}`);
    return cycle;
  }

  async setCycle(cycle: number): Promise<number> {
    const { cycle: saved } = await apiRequest<{ cycle: number }>(`/api/settings/cycle${this.consulta}`, {
      method: 'PUT',
      body: JSON.stringify({ cycle }),
    });
    return saved;
  }
}

const servicos = new Map<UnidadeId, ApiRotationService>();

export function rotationServiceDa(unidade: UnidadeId): IRotationService {
  let servico = servicos.get(unidade);
  if (!servico) {
    servico = new ApiRotationService(unidade);
    servicos.set(unidade, servico);
  }
  return servico;
}
