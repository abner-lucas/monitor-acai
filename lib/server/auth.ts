import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { readSessionUserId, SESSION_COOKIE } from './session';
import type { AuthUser, AuthorizedUser } from '../types';
import type { Papel } from '../papeis';

export const BCRYPT_ROUNDS = 11;

/**
 * Colunas lidas nas consultas de usuário. A foto (coluna `avatar`) fica de fora de propósito:
 * a sessão é conferida a cada requisição e não precisa carregar a imagem; ela é servida
 * à parte por /api/avatar/[id].
 */
const COLUNAS =
  'id, email, full_name, role, password_hash, is_active, created_at, avatar_updated_at, must_change_password, session_version';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  full_name: string;
  role: Papel;
  password_hash: string;
  is_active: number;
  created_at: Date;
  avatar_updated_at: Date | null;
  must_change_password: number;
  session_version: number;
}

/** Endereço da foto com a data da última troca: muda a cada nova foto (evita cache velho). */
function avatarUrl(row: UserRow): string | null {
  return row.avatar_updated_at ? `/api/avatar/${encodeURIComponent(row.id)}?v=${row.avatar_updated_at.getTime()}` : null;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    avatarUrl: avatarUrl(row),
    trocarSenha: Boolean(row.must_change_password),
  };
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
    trocarSenha: Boolean(row.must_change_password),
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
  const sessao = readSessionUserId(request.cookies.get(SESSION_COOKIE)?.value);
  if (!sessao) return null;

  const row = await findUserById(sessao.uid);
  // Senha trocada depois do login (pelo próprio usuário ou pelo administrador): sessão vencida.
  if (!row || !row.is_active || row.session_version !== sessao.versao) return null;
  return toAuthUser(row);
}

// ---------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------

/** Hash qualquer, usado quando o email não existe: o login demora o mesmo nos dois casos. */
let hashFicticio: Promise<string> | undefined;

export async function senhaConfere(senha: string, row: UserRow | null): Promise<boolean> {
  hashFicticio ??= bcrypt.hash('monitoracai-sem-usuario', BCRYPT_ROUNDS);
  const ok = await bcrypt.compare(senha, row?.password_hash ?? (await hashFicticio));
  return Boolean(row) && ok;
}

/**
 * Grava uma senha nova. provisoria = true quando o administrador cria ou redefine a senha:
 * o usuário é obrigado a trocar no próximo acesso. Em qualquer caso as sessões abertas caem.
 */
export async function gravarSenha(userId: string, senha: string, provisoria: boolean): Promise<UserRow | null> {
  const db = await getDb();
  await db.query(
    `UPDATE authorized_users SET password_hash = ?, must_change_password = ?, password_changed_at = ?,
       session_version = session_version + 1 WHERE id = ?`,
    [await bcrypt.hash(senha, BCRYPT_ROUNDS), provisoria ? 1 : 0, new Date(), userId]
  );
  return findUserById(userId);
}

// ---------------------------------------------------------------------------
// Limite de tentativas de senha (por IP e por email), em memória do processo
// ---------------------------------------------------------------------------

const JANELA_MS = 15 * 60 * 1000;
const MAX_POR_EMAIL = 5;
const MAX_POR_IP = 20;
const globalLimite = globalThis as typeof globalThis & { monitorAcaiFalhas?: Map<string, number[]> };
const falhas = (globalLimite.monitorAcaiFalhas ??= new Map<string, number[]>());

function recentes(chave: string): number[] {
  const agora = Date.now();
  const lista = (falhas.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  if (lista.length) falhas.set(chave, lista);
  else falhas.delete(chave);
  return lista;
}

/** Minutos até poder tentar de novo, ou 0 se está liberado. */
export function bloqueioDeSenha(ip: string, email: string): number {
  const porEmail = recentes(`e:${email}`);
  const porIp = recentes(`i:${ip}`);
  const cheio = porEmail.length >= MAX_POR_EMAIL ? porEmail : porIp.length >= MAX_POR_IP ? porIp : null;
  if (!cheio) return 0;
  return Math.max(1, Math.ceil((cheio[0] + JANELA_MS - Date.now()) / 60000));
}

export function registrarFalha(ip: string, email: string): void {
  for (const chave of [`e:${email}`, `i:${ip}`]) falhas.set(chave, [...recentes(chave), Date.now()]);
}

export function limparFalhas(email: string): void {
  falhas.delete(`e:${email}`);
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
