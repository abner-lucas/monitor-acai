import type { NextRequest } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { readSessionUserId, SESSION_COOKIE } from './session';
import type { AuthUser, AuthorizedUser } from '../types';

export const BCRYPT_ROUNDS = 11;

/**
 * Colunas lidas nas consultas de usuário. A foto (coluna `avatar`) fica de fora de propósito:
 * a sessão é conferida a cada requisição e não precisa carregar a imagem; ela é servida
 * à parte por /api/avatar/[id].
 */
const COLUNAS = 'id, email, full_name, role, password_hash, is_active, created_at, avatar_updated_at';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  full_name: string;
  role: 'superuser' | 'pesquisador';
  password_hash: string;
  is_active: number;
  created_at: Date;
  avatar_updated_at: Date | null;
}

/** Endereço da foto com a data da última troca: muda a cada nova foto (evita cache velho). */
function avatarUrl(row: UserRow): string | null {
  return row.avatar_updated_at ? `/api/avatar/${encodeURIComponent(row.id)}?v=${row.avatar_updated_at.getTime()}` : null;
}

export function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, avatarUrl: avatarUrl(row) };
}

/** Versão pública do usuário: nunca inclui o hash da senha. */
export function toAuthorizedUser(row: UserRow): AuthorizedUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at.toISOString(),
    avatarUrl: avatarUrl(row),
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>(`SELECT ${COLUNAS} FROM authorized_users WHERE email = ? LIMIT 1`, [
    email.trim().toLowerCase(),
  ]);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>(`SELECT ${COLUNAS} FROM authorized_users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<AuthorizedUser[]> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>(`SELECT ${COLUNAS} FROM authorized_users ORDER BY created_at ASC`);
  return rows.map(toAuthorizedUser);
}

/** Usuário da sessão atual, relido do banco (some na hora se for removido ou desativado). */
export async function getSessionUser(request: NextRequest): Promise<AuthUser | null> {
  const userId = readSessionUserId(request.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const row = await findUserById(userId);
  if (!row || !row.is_active) return null;
  return toAuthUser(row);
}

// ---------------------------------------------------------------------------
// Foto do usuário
// ---------------------------------------------------------------------------

const FORMATO_FOTO = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/;
export const TAMANHO_MAXIMO_FOTO = 300 * 1024; // bytes da imagem já reduzida no navegador

/** Valida a foto (data URL) e devolve o tipo e os bytes; null se for inválida. */
export function lerFoto(dataUrl: unknown): { tipo: string; bytes: Buffer } | null {
  if (typeof dataUrl !== 'string') return null;
  const m = FORMATO_FOTO.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length === 0 || bytes.length > TAMANHO_MAXIMO_FOTO) return null;
  return { tipo: `image/${m[1]}`, bytes };
}

export async function salvarFoto(userId: string, dataUrl: string | null): Promise<UserRow | null> {
  const db = await getDb();
  await db.query('UPDATE authorized_users SET avatar = ?, avatar_updated_at = ? WHERE id = ?', [
    dataUrl,
    dataUrl ? new Date() : null,
    userId,
  ]);
  return findUserById(userId);
}

export async function buscarFoto(userId: string): Promise<{ tipo: string; bytes: Buffer } | null> {
  const db = await getDb();
  const [rows] = await db.query<RowDataPacket[]>('SELECT avatar FROM authorized_users WHERE id = ? LIMIT 1', [userId]);
  return lerFoto(rows[0]?.avatar);
}
