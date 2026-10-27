import { NextResponse, type NextRequest } from 'next/server';
import { DatabaseNotConfiguredError } from './db';
import { getSessionUser } from './auth';
import type { AuthUser } from '../types';
import { isUnidade, type UnidadeId } from '../unidades';

/** Erro de dados enviados pelo cliente; vira resposta 400 com a própria mensagem. */
export class ValidationError extends Error {}

export function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof ValidationError) return jsonError(400, err.message);
  if (err instanceof DatabaseNotConfiguredError) return jsonError(503, err.message);

  console.error('[api]', err);
  return jsonError(500, 'Erro interno no servidor. Tente novamente em instantes.');
}

/** Unidade piloto pedida na URL (?unidade=breves|muana). */
export function unidadeDaRequisicao(request: NextRequest): UnidadeId {
  const unidade = request.nextUrl.searchParams.get('unidade');
  if (!isUnidade(unidade)) throw new ValidationError('Informe a unidade: breves ou muana.');
  return unidade;
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Corpo da requisição inválido.');
  }
  return body as Record<string, unknown>;
}

type Guard = { user: AuthUser; response?: undefined } | { user?: undefined; response: NextResponse };

export async function requireUser(request: NextRequest): Promise<Guard> {
  const user = await getSessionUser(request);
  if (!user) return { response: jsonError(401, 'Sessão expirada. Entre novamente para continuar.') };
  return { user };
}

export async function requireSuperuser(request: NextRequest): Promise<Guard> {
  const guard = await requireUser(request);
  if (guard.response) return guard;
  if (guard.user.role !== 'superuser') {
    return { response: jsonError(403, 'Apenas o coordenador do projeto pode gerenciar pesquisadores.') };
  }
  return guard;
}
