import { NextResponse, type NextRequest } from 'next/server';
import { DatabaseNotConfiguredError } from './db';
import { DriveErro, DriveNaoConectado } from './drive';
import { getSessionUser } from './auth';
import type { AuthUser } from '../types';
import { isUnidade, type UnidadeId } from '../unidades';
import { podeEditar } from '../papeis';

/** Erro de dados enviados pelo cliente; vira resposta 400 com a própria mensagem. */
export class ValidationError extends Error {}

export function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ValidationError) return jsonError(400, err.message);
  if (err instanceof DatabaseNotConfiguredError) return jsonError(503, err.message);
  if (err instanceof DriveNaoConectado) return jsonError(409, err.message);
  if (err instanceof DriveErro) return jsonError(err.status, err.message);

  console.error('[api]', err);
  return jsonError(500, 'Erro interno no servidor. Tente novamente em instantes.');
}

/** Unidade piloto pedida na URL (?unidade=breves|muana). */
export function unidadeDaRequisicao(request: NextRequest): UnidadeId {
  const unidade = request.nextUrl.searchParams.get('unidade');
  if (!isUnidade(unidade)) throw new ValidationError('Informe a unidade: breves ou muana.');
  return unidade;
}

/** Endereço público do site (atrás do proxy da Hostinger), ex.: https://monitoracai.profabnerlucas.com. */
export function origemPublica(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

/** IP do visitante (atrás do proxy da Hostinger), para o limite de tentativas de senha. */
export function ipDaRequisicao(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'desconhecido';
}

/**
 * Pedidos que alteram dados só valem vindos do próprio site (defesa extra contra CSRF,
 * além do cookie SameSite=Lax). Navegadores sempre mandam Origin nesses pedidos.
 */
export function origemInvalida(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const origem = request.headers.get('origin');
  if (!origem) return null;
  try {
    if (new URL(origem).host === new URL(origemPublica(request)).host) return null;
  } catch {
    // Origin malformado: recusa abaixo.
  }
  return jsonError(403, 'Pedido recusado: origem não autorizada.');
}

type Guard = { user: AuthUser; response?: undefined } | { user?: undefined; response: NextResponse };

/**
 * Usuário logado. Enquanto estiver com senha provisória, só pode trocar a senha
 * (rotas /api/auth/me e /api/auth/me/senha não passam por aqui).
 */
export async function requireUser(request: NextRequest): Promise<Guard> {
  const recusa = origemInvalida(request);
  if (recusa) return { response: recusa };
  const user = await getSessionUser(request);
  if (!user) return { response: jsonError(401, 'Sessão expirada. Entre novamente para continuar.') };
  if (user.trocarSenha) return { response: jsonError(403, 'Troque a senha provisória antes de continuar.') };
  return { user };
}

/** Quem lança dados: administrador ou lançamento de dados (o visualizador só consulta). */
export async function requireEditor(request: NextRequest): Promise<Guard> {
  const guard = await requireUser(request);
  if (guard.response) return guard;
  if (!podeEditar(guard.user.role)) {
    return { response: jsonError(403, 'Seu acesso é só de visualização: peça ao administrador para lançar ou alterar dados.') };
  }
  return guard;
}

export async function requireSuperuser(request: NextRequest): Promise<Guard> {
  const guard = await requireUser(request);
  if (guard.response) return guard;
  if (guard.user.role !== 'superuser') {
    return { response: jsonError(403, 'Apenas administradores podem fazer isso.') };
  }
  return guard;
}
