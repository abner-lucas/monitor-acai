/**
 * Supabase Rotation Service Implementation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IRotationService, CreateRecordInput, UpdateRecordInput } from './types';
import { RotationRecord } from '../types';
import { INITIAL_SEEDED_RECORDS } from '../constants';

export class SupabaseRotationService implements IRotationService {
  private supabase: SupabaseClient | null = null;

  private getClient(): SupabaseClient | null {
    if (!this.supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
    return this.supabase;
  }

  async getRecords(): Promise<RotationRecord[]> {
    const client = this.getClient();
    if (!client) {
      console.warn('Supabase não configurado. Forneça NEXT_PUBLIC_SUPABASE_URL.');
      return INITIAL_SEEDED_RECORDS;
    }

    const { data, error } = await client
      .from('rotation_records')
      .select('*')
      .order('installed_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      cycleNumber: row.cycle_number,
      positionId: row.position_id,
      cellId: row.cell_id,
      plantIndex: row.plant_index,
      installedAt: row.installed_at,
      scheduledNextChange: row.scheduled_next_change,
      removedAt: row.removed_at,
      responsible: row.responsible,
      notes: row.notes || '',
      status: row.status,
      batteryLevel: row.battery_level,
      signalQuality: row.signal_quality,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getRecordById(id: string): Promise<RotationRecord | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from('rotation_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      id: data.id,
      cycleNumber: data.cycle_number,
      positionId: data.position_id,
      cellId: data.cell_id,
      plantIndex: data.plant_index,
      installedAt: data.installed_at,
      scheduledNextChange: data.scheduled_next_change,
      removedAt: data.removed_at,
      responsible: data.responsible,
      notes: data.notes || '',
      status: data.status,
      batteryLevel: data.battery_level,
      signalQuality: data.signal_quality,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createRecord(input: CreateRecordInput): Promise<RotationRecord> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Supabase client não inicializado.');
    }

    const id = (input as any).id || `REG-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const row = {
      id,
      cycle_number: input.cycleNumber,
      position_id: input.positionId,
      cell_id: input.cellId,
      plant_index: input.plantIndex,
      installed_at: input.installedAt,
      scheduled_next_change: input.scheduledNextChange,
      removed_at: input.removedAt || null,
      responsible: input.responsible,
      notes: input.notes || '',
      status: input.status,
      battery_level: input.batteryLevel ?? 98,
      signal_quality: input.signalQuality || 'Excelente',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await client
      .from('rotation_records')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      cycleNumber: data.cycle_number,
      positionId: data.position_id,
      cellId: data.cell_id,
      plantIndex: data.plant_index,
      installedAt: data.installed_at,
      scheduledNextChange: data.scheduled_next_change,
      removedAt: data.removed_at,
      responsible: data.responsible,
      notes: data.notes || '',
      status: data.status,
      batteryLevel: data.battery_level,
      signalQuality: data.signal_quality,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async updateRecord(id: string, updates: UpdateRecordInput): Promise<RotationRecord> {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client não inicializado.');

    const patch: any = { updated_at: new Date().toISOString() };
    if (updates.cycleNumber !== undefined) patch.cycle_number = updates.cycleNumber;
    if (updates.positionId !== undefined) patch.position_id = updates.positionId;
    if (updates.cellId !== undefined) patch.cell_id = updates.cellId;
    if (updates.plantIndex !== undefined) patch.plant_index = updates.plantIndex;
    if (updates.installedAt !== undefined) patch.installed_at = updates.installedAt;
    if (updates.scheduledNextChange !== undefined) patch.scheduled_next_change = updates.scheduledNextChange;
    if (updates.removedAt !== undefined) patch.removed_at = updates.removedAt;
    if (updates.responsible !== undefined) patch.responsible = updates.responsible;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.batteryLevel !== undefined) patch.battery_level = updates.batteryLevel;
    if (updates.signalQuality !== undefined) patch.signal_quality = updates.signalQuality;

    const { data, error } = await client
      .from('rotation_records')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      cycleNumber: data.cycle_number,
      positionId: data.position_id,
      cellId: data.cell_id,
      plantIndex: data.plant_index,
      installedAt: data.installed_at,
      scheduledNextChange: data.scheduled_next_change,
      removedAt: data.removed_at,
      responsible: data.responsible,
      notes: data.notes || '',
      status: data.status,
      batteryLevel: data.battery_level,
      signalQuality: data.signal_quality,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async deleteRecord(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client não inicializado.');

    const { error } = await client
      .from('rotation_records')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }

  async getCurrentCycle(): Promise<number> {
    const client = this.getClient();
    if (!client) return 1;

    const { data } = await client
      .from('app_settings')
      .select('value')
      .eq('key', 'current_cycle')
      .single();

    return data?.value ? parseInt(data.value, 10) : 1;
  }

  async setCycle(cycle: number): Promise<number> {
    const client = this.getClient();
    if (!client) return cycle;

    await client
      .from('app_settings')
      .upsert({ key: 'current_cycle', value: cycle.toString() });

    return cycle;
  }

  async resetToSeed(): Promise<RotationRecord[]> {
    const client = this.getClient();
    if (!client) return INITIAL_SEEDED_RECORDS;
    await client.from('rotation_records').delete().neq('id', '');
    for (const rec of INITIAL_SEEDED_RECORDS) {
      await client.from('rotation_records').insert({
        id: rec.id,
        cycle_number: rec.cycleNumber,
        position_id: rec.positionId,
        cell_id: rec.cellId,
        plant_index: rec.plantIndex,
        installed_at: rec.installedAt,
        scheduled_next_change: rec.scheduledNextChange,
        removed_at: rec.removedAt || null,
        responsible: rec.responsible,
        notes: rec.notes || '',
        status: rec.status,
        battery_level: rec.batteryLevel ?? 98,
        signal_quality: rec.signalQuality || 'Excelente',
        created_at: rec.createdAt,
        updated_at: rec.updatedAt,
      });
    }
    await this.setCycle(1);
    return this.getRecords();
  }
}

export const supabaseRotationService = new SupabaseRotationService();
