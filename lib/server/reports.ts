import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { ValidationError } from './http';
import {
  normalizarAssinatura,
  normalizarDados,
  pendenciasRelatorio,
  rodizioDoRegistro,
  RelatorioInvalido,
  type Relatorio,
  type StatusRelatorio,
} from '../relatorio';
import type { UnidadeId } from '../unidades';
import { listRecords, getRecord } from './records';

interface ReportRow extends RowDataPacket {
  record_id: string;
  status: StatusRelatorio;
  signed_at: string | null;
  report_data: string;
  updated_at: Date;
  updated_by: string | null;
}

function toRelatorio(row: ReportRow): Relatorio {
  return {
    recordId: row.record_id,
    status: row.status,
    assinadoEm: row.signed_at,
    // Normaliza ao ler: relatórios salvos antes de um campo novo recebem o valor vazio dele.
    dados: normalizarDados(JSON.parse(row.report_data)),
    atualizadoEm: row.updated_at.toISOString(),
    atualizadoPor: row.updated_by,
  };
}

export async function listReports(site: UnidadeId): Promise<Relatorio[]> {
  const db = await getDb();
  const [rows] = await db.query<ReportRow[]>(
    `SELECT rep.* FROM rotation_reports rep
     JOIN rotation_records rec ON rec.id = rep.record_id
     WHERE rec.site = ?`,
    [site]
  );
  return rows.map(toRelatorio);
}

export async function getReport(recordId: string): Promise<Relatorio | null> {
  const db = await getDb();
  const [rows] = await db.query<ReportRow[]>('SELECT * FROM rotation_reports WHERE record_id = ? LIMIT 1', [recordId]);
  return rows[0] ? toRelatorio(rows[0]) : null;
}

/** Cria ou atualiza o relatório de um rodízio. Retorna null se o registro não existir. */
export async function saveReport(
  recordId: string,
  body: Record<string, unknown>,
  autor: string
): Promise<Relatorio | null> {
  const record = await getRecord(recordId);
  if (!record) return null;
  if (record.status === 'scheduled') {
    throw new ValidationError('Esta posição ainda está agendada: o relatório é preenchido depois de registrar o rodízio.');
  }

  let dados;
  let assinadoEm;
  try {
    dados = normalizarDados(body.dados);
    assinadoEm = normalizarAssinatura(body.assinadoEm);
  } catch (err) {
    if (err instanceof RelatorioInvalido) throw new ValidationError(err.message);
    throw err;
  }

  const status: StatusRelatorio = body.status === 'concluido' ? 'concluido' : 'rascunho';
  if (status === 'concluido' || assinadoEm) {
    // A posição de origem é o rodízio anterior do mesmo ciclo e unidade.
    const rodizio = rodizioDoRegistro(await listRecords(record.site ?? 'breves'), recordId);
    const pendencias = pendenciasRelatorio(dados, !rodizio?.origem);
    if (pendencias.length > 0) {
      throw new ValidationError(`Para concluir, preencha: ${pendencias.join(', ')}.`);
    }
  }

  const agora = new Date();
  const db = await getDb();
  await db.query(
    `INSERT INTO rotation_reports (record_id, status, signed_at, report_data, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), signed_at = VALUES(signed_at),
       report_data = VALUES(report_data), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)`,
    [recordId, status === 'concluido' || assinadoEm ? 'concluido' : 'rascunho', assinadoEm, JSON.stringify(dados), agora, agora, autor]
  );
  return getReport(recordId);
}
