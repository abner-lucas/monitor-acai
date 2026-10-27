import type { NextRequest } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { readSessionUserId, SESSION_COOKIE } from './session';
import type { AuthUser, AuthorizedUser } from '../types';

export const BCRYPT_ROUNDS = 11;

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  full_name: string;
  role: 'superuser' | 'pesquisador';
  password_hash: string;
  is_active: number;
  created_at: Date;
}

export function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role };
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
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>('SELECT * FROM authorized_users WHERE email = ? LIMIT 1', [
    email.trim().toLowerCase(),
  ]);
  return rows[0] ?? null;
}

async function findUserById(id: string): Promise<UserRow | null> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>('SELECT * FROM authorized_users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<AuthorizedUser[]> {
  const db = await getDb();
  const [rows] = await db.query<UserRow[]>('SELECT * FROM authorized_users ORDER BY created_at ASC');
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
