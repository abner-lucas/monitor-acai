import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';

/**
 * Sessão em cookie httpOnly assinado com HMAC (SESSION_SECRET).
 * O cookie guarda só o id do usuário e a validade; perfil e status
 * são sempre relidos do banco a cada requisição.
 */

export const SESSION_COOKIE = 'monitoracai_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET ausente ou curto (mínimo de 32 caracteres).');
  }
  return secret;
}

/** Assinatura HMAC com o SESSION_SECRET (também usada no state do OAuth do Google Drive). */
export function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function createSessionToken(userId: string, versao: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: expiresAt, v: versao })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/**
 * Id do usuário e versão da sessão, se o token for autêntico e não estiver expirado.
 * A versão é comparada com a do banco: trocar a senha invalida as sessões antigas.
 */
export function readSessionUserId(token: string | undefined): { uid: string; versao: number } | null {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const { uid, exp, v } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof uid !== 'string' || typeof exp !== 'number' || exp < Date.now() / 1000) {
      return null;
    }
    // Sessões anteriores à versão não têm o campo: valem como versão 0.
    return { uid, versao: typeof v === 'number' ? v : 0 };
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function setSessionCookie(response: NextResponse, userId: string, versao: number): void {
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId, versao), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}
