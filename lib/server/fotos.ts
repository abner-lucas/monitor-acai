import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { ValidationError } from './http';
import { getRecord, listRecords } from './records';
import { arquivo, iniciarEnvio, paraLixeira, pastaDoRelatorio } from './drive';
import {
  FOTOS_RELATORIO,
  TAMANHO_MAX_FOTO,
  TIPOS_FOTO,
  arquivoFoto,
  codigoRelatorio,
  pastaFotos,
  rodizioDoRegistro,
  type FotoRelatorio,
} from '../relatorio';
import { UNIDADES, type UnidadeId } from '../unidades';

/**
 * Fotos dos relatórios: o arquivo original vai do navegador direto para o Google Drive
 * (lib/server/drive.ts); aqui ficam só a referência e os dados para exibir.
 */

interface FotoRow extends RowDataPacket {
  record_id: string;
  numero: number;
  drive_file_id: string;
  nome: string;
  tamanho: number;
  largura: number | null;
  altura: number | null;
  enviada_por: string | null;
  created_at: Date;
}

function toFoto(row: FotoRow): FotoRelatorio {
  return {
    recordId: row.record_id,
    numero: row.numero,
    nome: row.nome,
    tamanho: Number(row.tamanho),
    largura: row.largura,
    altura: row.altura,
    versao: row.drive_file_id.slice(-10),
    enviadaPor: row.enviada_por,
    enviadaEm: row.created_at.toISOString(),
  };
}

export async function listarFotos(site: UnidadeId): Promise<FotoRelatorio[]> {
  const db = await getDb();
  const [rows] = await db.query<FotoRow[]>(
    `SELECT f.* FROM report_photos f JOIN rotation_records r ON r.id = f.record_id
     WHERE r.site = ? ORDER BY f.record_id, f.numero`,
    [site]
  );
  return rows.map(toFoto);
}

/** Id do arquivo no Drive e nome, para montar a miniatura ou o download. */
export async function arquivoDaFoto(recordId: string, numero: number): Promise<{ fileId: string; nome: string } | null> {
  const db = await getDb();
  const [rows] = await db.query<FotoRow[]>('SELECT * FROM report_photos WHERE record_id = ? AND numero = ? LIMIT 1', [recordId, numero]);
  return rows[0] ? { fileId: rows[0].drive_file_id, nome: rows[0].nome } : null;
}

export function numeroFoto(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > FOTOS_RELATORIO.length) {
    throw new ValidationError('Número da foto inválido (1 a 8).');
  }
  return n;
}

/** Rodízio, código e nomes no Drive de uma foto; valida se ela cabe neste relatório. */
async function contexto(recordId: string, numero: number) {
  const record = await getRecord(recordId);
  if (!record) throw new ValidationError('Rodízio não encontrado.');
  if (record.status === 'scheduled') throw new ValidationError('Esta posição ainda está agendada: registre o rodízio antes das fotos.');
  const unidade = UNIDADES[record.site ?? 'breves'];
  const rodizio = rodizioDoRegistro(await listRecords(unidade.id), recordId);
  if (!rodizio) throw new ValidationError('Rodízio não encontrado.');
  const codigo = codigoRelatorio(unidade, record.cycleNumber, rodizio.numero);
  return { record, unidade, codigo };
}

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/** Abre o envio de uma foto: devolve o endereço para o navegador mandar o arquivo ao Drive. */
export async function prepararEnvio(recordId: string, body: Record<string, unknown>, origem: string) {
  const numero = numeroFoto(body.numero);
  const mime = typeof body.tipo === 'string' ? body.tipo.toLowerCase() : '';
  if (!TIPOS_FOTO.includes(mime)) throw new ValidationError('Envie uma foto JPG, PNG, WebP ou HEIC.');
  const tamanho = body.tamanho;
  if (typeof tamanho !== 'number' || !Number.isInteger(tamanho) || tamanho <= 0 || tamanho > TAMANHO_MAX_FOTO) {
    throw new ValidationError('A foto deve ter no máximo 200 MB.');
  }

  const { record, unidade, codigo } = await contexto(recordId, numero);
  const nome = arquivoFoto(unidade, codigo, record.installedAt, numero, EXTENSOES[mime]);
  const pasta = await pastaDoRelatorio(recordId, pastaFotos(unidade, codigo));
  const uploadUrl = await iniciarEnvio({ pasta, nome, mime, tamanho, origem });
  return { uploadUrl, nome };
}

/** Depois do envio: confere o arquivo no Drive e o liga ao relatório (a foto anterior vai para a lixeira). */
export async function confirmarEnvio(recordId: string, body: Record<string, unknown>, autor: string): Promise<FotoRelatorio> {
  const numero = numeroFoto(body.numero);
  const fileId = typeof body.arquivoId === 'string' && /^[\w-]{10,128}$/.test(body.arquivoId) ? body.arquivoId : null;
  if (!fileId) throw new ValidationError('Arquivo enviado inválido.');

  const { unidade, codigo } = await contexto(recordId, numero);
  const pasta = await pastaDoRelatorio(recordId, pastaFotos(unidade, codigo));
  const f = await arquivo(fileId);
  if (f.trashed || !f.parents?.includes(pasta) || !TIPOS_FOTO.includes(f.mimeType)) {
    throw new ValidationError('O arquivo enviado não corresponde a esta foto.');
  }

  const anterior = await arquivoDaFoto(recordId, numero);
  const db = await getDb();
  await db.query(
    `INSERT INTO report_photos (record_id, numero, drive_file_id, nome, mime, tamanho, largura, altura, enviada_por, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE drive_file_id = VALUES(drive_file_id), nome = VALUES(nome), mime = VALUES(mime),
       tamanho = VALUES(tamanho), largura = VALUES(largura), altura = VALUES(altura),
       enviada_por = VALUES(enviada_por), created_at = VALUES(created_at)`,
    [
      recordId,
      numero,
      f.id,
      f.name,
      f.mimeType,
      Number(f.size ?? 0),
      f.imageMediaMetadata?.width ?? null,
      f.imageMediaMetadata?.height ?? null,
      autor,
      new Date(),
    ]
  );
  if (anterior && anterior.fileId !== f.id) await paraLixeira(anterior.fileId);

  const [rows] = await db.query<FotoRow[]>('SELECT * FROM report_photos WHERE record_id = ? AND numero = ?', [recordId, numero]);
  return toFoto(rows[0]);
}

/** Tira a foto do relatório e manda o arquivo para a lixeira do Drive (recuperável por 30 dias). */
export async function removerFoto(recordId: string, numero: number): Promise<boolean> {
  const atual = await arquivoDaFoto(recordId, numero);
  if (!atual) return false;
  await paraLixeira(atual.fileId);
  const db = await getDb();
  await db.query('DELETE FROM report_photos WHERE record_id = ? AND numero = ?', [recordId, numero]);
  return true;
}
