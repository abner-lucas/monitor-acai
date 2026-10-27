import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, jsonError, readJsonBody, requireUser, unidadeDaRequisicao } from '@/lib/server/http';
import { agendarProxima, registrarRodizio } from '@/lib/server/rotations';

/**
 * POST /api/rotations?unidade=breves
 *   { acao: 'registrar', data, responsavel, observacoes?, posicaoDestino?, proximaPosicao? }
 *   { acao: 'agendar', proximaPosicao, responsavel }
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const unidade = unidadeDaRequisicao(request);
    const body = await readJsonBody(request);
    if (body.acao === 'registrar') return NextResponse.json(await registrarRodizio(unidade, body), { status: 201 });
    if (body.acao === 'agendar') return NextResponse.json(await agendarProxima(unidade, body), { status: 201 });
    return jsonError(400, 'Ação inválida: use "registrar" ou "agendar".');
  } catch (err) {
    return handleRouteError(err);
  }
}
