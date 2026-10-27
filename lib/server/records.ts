import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { ValidationError } from './http';
import type { RotationRecord } from '../types';
import { UNIDADES, type UnidadeId } from '../unidades';

interface RecordRow extends RowDataPacket {
  id: string;
  site: UnidadeId;
  cycle_number: number;
  position_id: number;
  cell_id: number;
  plant_index: number;
  installed_at: string;
  scheduled_next_change: string;
  removed_at: string | null;
  responsible: string;
  notes: string | null;
  status: RotationRecord['status'];
  battery_level: number | null;
  signal_quality: RotationRecord['signalQuality'] | null;
  created_at: Date;
  updated_at: Date;
}

function toRecord(row: RecordRow): RotationRecord {
  return {
    id: row.id,
    site: row.site,
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
    batteryLevel: row.battery_level ?? undefined,
    signalQuality: row.signal_quality ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Validação do que chega do navegador
// ---------------------------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['active', 'completed', 'scheduled'] as const;
const SIGNAL_QUALITIES = ['Excelente', 'Bom', 'Regular'] as const;

function intInRange(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`Campo "${field}" inválido.`);
  }
  return value;
}

function dateString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new ValidationError(`Campo "${field}" deve ser uma data AAAA-MM-DD.`);
  }
  return value;
}

function optionalDate(value: unknown, field: string): string | null {
  return value === null || value === '' ? null : dateString(value, field);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (typeof value !== 'string' || !options.includes(value as T)) {
    throw new ValidationError(`Campo "${field}" inválido.`);
  }
  return value as T;
}

function text(value: unknown, field: string, maxLength: number, required: boolean): string {
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw new ValidationError(`Campo "${field}" é obrigatório.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`Campo "${field}" excede ${maxLength} caracteres.`);
  }
  return required ? value.trim() : value;
}

/**
 * Converte o corpo da requisição em colunas da tabela. Campos ausentes ficam de fora,
 * então o mesmo parser serve para criar (todos obrigatórios) e editar (parcial).
 * Bateria e sinal sem valor são gravados como NULL: nenhuma medição é inventada.
 */
function parseRecordColumns(body: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  const has = (key: string) => body[key] !== undefined;
  const need = (key: string) => {
    if (!partial && !has(key)) throw new ValidationError(`Campo "${key}" é obrigatório.`);
    return has(key);
  };

  if (need('cycleNumber')) columns.cycle_number = intInRange(body.cycleNumber, 'cycleNumber', 1, 10_000);
  if (need('positionId')) columns.position_id = intInRange(body.positionId, 'positionId', 1, 18);
  if (need('cellId')) columns.cell_id = intInRange(body.cellId, 'cellId', 1, 6);
  if (need('plantIndex')) columns.plant_index = intInRange(body.plantIndex, 'plantIndex', 1, 3);
  if (need('installedAt')) columns.installed_at = dateString(body.installedAt, 'installedAt');
  if (need('scheduledNextChange')) {
    columns.scheduled_next_change = dateString(body.scheduledNextChange, 'scheduledNextChange');
  }
  if (need('responsible')) columns.responsible = text(body.responsible, 'responsible', 255, true);
  if (need('status')) columns.status = oneOf(body.status, STATUSES, 'status');

  if (has('removedAt') || !partial) columns.removed_at = optionalDate(body.removedAt ?? null, 'removedAt');
  if (has('notes') || !partial) columns.notes = text(body.notes ?? '', 'notes', 5000, false);
  if (has('batteryLevel') || !partial) {
    columns.battery_level =
      body.batteryLevel === null || body.batteryLevel === undefined
        ? null
        : intInRange(body.batteryLevel, 'batteryLevel', 0, 100);
  }
  if (has('signalQuality') || !partial) {
    columns.signal_quality =
      body.signalQuality === null || body.signalQuality === undefined || body.signalQuality === ''
        ? null
        : oneOf(body.signalQuality, SIGNAL_QUALITIES, 'signalQuality');
  }

  return columns;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function listRecords(site: UnidadeId): Promise<RotationRecord[]> {
  const db = await getDb();
  const [rows] = await db.query<RecordRow[]>(
    'SELECT * FROM rotation_records WHERE site = ? ORDER BY installed_at DESC, created_at DESC',
    [site]
  );
  return rows.map(toRecord);
}

export async function getRecord(id: string): Promise<RotationRecord | null> {
  const db = await getDb();
  const [rows] = await db.query<RecordRow[]>('SELECT * FROM rotation_records WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

export async function createRecord(site: UnidadeId, body: Record<string, unknown>): Promise<RotationRecord> {
  const columns = parseRecordColumns(body, false);
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();

  // Mesmo formato dos registros existentes (REG-AAAA-NNNN em Breves, MUA-AAAA-NNNN em Muaná);
  // em caso de colisão, tenta outro número.
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix =
      attempt === 0
        ? Date.now().toString().slice(-4)
        : Math.floor(Math.random() * 10_000).toString().padStart(4, '0');
    const id = `${UNIDADES[site].prefixoRegistro}-${year}-${suffix}`;

    try {
      await db.query('INSERT INTO rotation_records SET ?', [
        { ...columns, id, site, created_at: now, updated_at: now },
      ]);
      const created = await getRecord(id);
      if (!created) throw new Error(`Registro ${id} não encontrado após inserção.`);
      return created;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }

  throw new Error('Não foi possível gerar um identificador único para o registro.');
}

export async function updateRecord(id: string, body: Record<string, unknown>): Promise<RotationRecord | null> {
  const columns = parseRecordColumns(body, true);
  const db = await getDb();
  await db.query('UPDATE rotation_records SET ? WHERE id = ?', [{ ...columns, updated_at: new Date() }, id]);
  return getRecord(id);
}

export async function deleteRecord(id: string): Promise<boolean> {
  const db = await getDb();
  const [result] = await db.query<ResultSetHeader>('DELETE FROM rotation_records WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Ciclo atual (tabela app_settings)
// ---------------------------------------------------------------------------

/** Breves mantém a chave original 'current_cycle'; as demais unidades usam 'current_cycle:<unidade>'. */
const chaveCiclo = (site: UnidadeId) => (site === 'breves' ? 'current_cycle' : `current_cycle:${site}`);

export async function getCurrentCycle(site: UnidadeId): Promise<number> {
  const db = await getDb();
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    [chaveCiclo(site)]
  );
  const value = Number.parseInt(String(rows[0]?.setting_value ?? '1'), 10);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export async function setCurrentCycle(site: UnidadeId, cycle: unknown): Promise<number> {
  const value = intInRange(cycle, 'cycle', 1, 10_000);
  const db = await getDb();
  await db.query(
    'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
    [chaveCiclo(site), String(value)]
  );
  return value;
}
