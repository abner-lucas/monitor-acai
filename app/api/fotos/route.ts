import { NextResponse, type NextRequest } from 'next/server';
import { listarFotos } from '@/lib/server/fotos';
import { handleRouteError, requireUser, unidadeDaRequisicao } from '@/lib/server/http';

/** Fotos dos relatórios de uma unidade (só as referências; as imagens ficam no Google Drive). */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;
    return NextResponse.json({ fotos: await listarFotos(unidadeDaRequisicao(request)) });
  } catch (err) {
    return handleRouteError(err);
  }
}
