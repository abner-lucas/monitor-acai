import { NextResponse, type NextRequest } from 'next/server';
import { confirmarEnvio, prepararEnvio } from '@/lib/server/fotos';
import { handleRouteError, jsonError, origemPublica, readJsonBody, requireUser } from '@/lib/server/http';

type RouteContext = { params: Promise<{ recordId: string }> };

/**
 * Envio de uma foto em duas etapas:
 *  - acao "preparar": devolve o endereço para o navegador mandar o original direto ao Google Drive;
 *  - acao "confirmar": confere o arquivo no Drive e o liga ao relatório.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const recordId = (await params).recordId;
    const body = await readJsonBody(request);
    if (body.acao === 'preparar') {
      return NextResponse.json(await prepararEnvio(recordId, body, origemPublica(request)));
    }
    if (body.acao === 'confirmar') {
      const autor = guard.user.fullName || guard.user.email;
      return NextResponse.json({ foto: await confirmarEnvio(recordId, body, autor) });
    }
    return jsonError(400, 'Ação inválida.');
  } catch (err) {
    return handleRouteError(err);
  }
}
