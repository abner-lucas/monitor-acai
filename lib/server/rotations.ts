import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { ValidationError } from './http';
import { getCurrentCycle } from './records';
import { POSITIONS_DATA, DAYS_PER_ROTATION } from '../constants';
import { UNIDADES, type UnidadeId } from '../unidades';

/**
 * Dia de campo, numa única transação:
 *  1. a posição em campo é concluída na data da troca;
 *  2. a posição de destino (a já sorteada, ou uma sorteada agora) passa a ativa nessa data,
 *     com a próxima troca em +14 dias;
 *  3. opcionalmente, a próxima posição já é sorteada e fica agendada para essa próxima troca.
 * Assim as datas e os status nunca ficam desencontrados.
 */

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Soma dias a uma data AAAA-MM-DD sem depender do fuso do servidor. */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

function hojeLocal(): string {
  // Data civil de Belém (UTC-3), onde fica o experimento.
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

interface Linha extends RowDataPacket {
  id: string;
  position_id: number;
  status: 'active' | 'completed' | 'scheduled';
  installed_at: string;
  scheduled_next_change: string;
}

function posicao(id: unknown, campo: string) {
  const pos = POSITIONS_DATA.find((p) => p.id === id);
  if (!pos) throw new ValidationError(`Campo "${campo}" deve ser uma posição de 1 a 18.`);
  return pos;
}

function textoOpcional(v: unknown, campo: string, max: number): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string' || v.length > max) throw new ValidationError(`Campo "${campo}" inválido.`);
  return v.trim();
}

async function novoId(conn: PoolConnection, site: UnidadeId, data: string): Promise<string> {
  const prefixo = `${UNIDADES[site].prefixoRegistro}-${data.slice(0, 4)}-`;
  for (let i = 0; i < 20; i++) {
    const id = prefixo + Math.floor(Math.random() * 10_000).toString().padStart(4, '0');
    const [existe] = await conn.query<RowDataPacket[]>('SELECT 1 FROM rotation_records WHERE id = ?', [id]);
    if (existe.length === 0) return id;
  }
  throw new Error('Não foi possível gerar um identificador único para o registro.');
}

async function registrosDoCiclo(conn: PoolConnection, site: UnidadeId, ciclo: number) {
  // FOR UPDATE: dois técnicos registrando ao mesmo tempo não criam dois ativos.
  const [linhas] = await conn.query<Linha[]>(
    `SELECT id, position_id, status, installed_at, scheduled_next_change FROM rotation_records
     WHERE site = ? AND cycle_number = ? FOR UPDATE`,
    [site, ciclo]
  );
  return {
    ativo: linhas.find((l) => l.status === 'active') ?? null,
    agendado: linhas.find((l) => l.status === 'scheduled') ?? null,
    ocupadas: new Set(linhas.map((l) => l.position_id)),
  };
}

async function inserir(
  conn: PoolConnection,
  site: UnidadeId,
  ciclo: number,
  positionId: number,
  status: 'active' | 'scheduled',
  data: string,
  responsavel: string,
  notas: string
): Promise<string> {
  const pos = posicao(positionId, 'posição');
  const id = await novoId(conn, site, data);
  const agora = new Date();
  await conn.query('INSERT INTO rotation_records SET ?', [
    {
      id,
      site,
      cycle_number: ciclo,
      position_id: pos.id,
      cell_id: pos.cellId,
      plant_index: pos.plantIndex,
      installed_at: data,
      scheduled_next_change: somarDias(data, DAYS_PER_ROTATION),
      removed_at: null,
      responsible: responsavel,
      notes: notas,
      status,
      created_at: agora,
      updated_at: agora,
    },
  ]);
  return id;
}

async function emTransacao<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const db = await getDb();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function registrarRodizio(
  site: UnidadeId,
  body: Record<string, unknown>
): Promise<{ executadoId: string; agendadoId: string | null }> {
  const data = typeof body.data === 'string' && DATA.test(body.data) ? body.data : null;
  if (!data) throw new ValidationError('Informe a data da troca (AAAA-MM-DD).');
  if (data > hojeLocal()) throw new ValidationError('A data da troca não pode estar no futuro.');
  const responsavel = textoOpcional(body.responsavel, 'responsável', 255);
  if (!responsavel) throw new ValidationError('Informe o responsável pela troca.');
  const notas = textoOpcional(body.observacoes, 'observações', 5000);
  const ciclo = await getCurrentCycle(site);

  return emTransacao(async (conn) => {
    const { ativo, agendado, ocupadas } = await registrosDoCiclo(conn, site, ciclo);

    if (ativo && data < ativo.installed_at) {
      throw new ValidationError(`A troca não pode ser antes da instalação atual (${ativo.installed_at.split('-').reverse().join('/')}).`);
    }

    // Destino: a posição já sorteada; sem ela, a posição sorteada agora (1ª instalação ou sem agendamento).
    let executadoId: string;
    let destino: number;
    if (agendado) {
      if (body.posicaoDestino !== undefined && body.posicaoDestino !== agendado.position_id) {
        throw new ValidationError(`A próxima posição já sorteada é a #${String(agendado.position_id).padStart(2, '0')}.`);
      }
      destino = agendado.position_id;
      executadoId = agendado.id;
      await conn.query(
        `UPDATE rotation_records SET status = 'active', installed_at = ?, scheduled_next_change = ?, responsible = ?,
           notes = IF(? = '', notes, ?), updated_at = ? WHERE id = ?`,
        [data, somarDias(data, DAYS_PER_ROTATION), responsavel, notas, notas, new Date(), agendado.id]
      );
    } else {
      destino = posicao(body.posicaoDestino, 'posição de destino').id;
      if (ocupadas.has(destino)) throw new ValidationError('Esta posição já foi amostrada neste ciclo.');
      executadoId = await inserir(conn, site, ciclo, destino, 'active', data, responsavel, notas);
    }

    if (ativo) {
      await conn.query(
        `UPDATE rotation_records SET status = 'completed', removed_at = ?, updated_at = ? WHERE id = ?`,
        [data, new Date(), ativo.id]
      );
    }

    let agendadoId: string | null = null;
    if (body.proximaPosicao !== undefined && body.proximaPosicao !== null) {
      const proxima = posicao(body.proximaPosicao, 'próxima posição').id;
      if (proxima === destino || ocupadas.has(proxima)) {
        throw new ValidationError('A próxima posição sorteada já foi usada neste ciclo.');
      }
      agendadoId = await inserir(conn, site, ciclo, proxima, 'scheduled', somarDias(data, DAYS_PER_ROTATION), responsavel, '');
    }

    return { executadoId, agendadoId };
  });
}

/** Sorteio antecipado: agenda a próxima posição para a data de troca da posição em campo. */
export async function agendarProxima(site: UnidadeId, body: Record<string, unknown>): Promise<{ agendadoId: string }> {
  const proxima = posicao(body.proximaPosicao, 'próxima posição').id;
  const responsavel = textoOpcional(body.responsavel, 'responsável', 255);
  if (!responsavel) throw new ValidationError('Informe o responsável.');
  const ciclo = await getCurrentCycle(site);

  return emTransacao(async (conn) => {
    const { ativo, agendado, ocupadas } = await registrosDoCiclo(conn, site, ciclo);
    if (agendado) throw new ValidationError('Já existe uma próxima posição sorteada neste ciclo.');
    if (!ativo) throw new ValidationError('Não há sensor em campo: registre o rodízio de hoje.');
    if (ocupadas.has(proxima)) throw new ValidationError('Esta posição já foi amostrada neste ciclo.');
    const agendadoId = await inserir(conn, site, ciclo, proxima, 'scheduled', ativo.scheduled_next_change, responsavel, '');
    return { agendadoId };
  });
}
