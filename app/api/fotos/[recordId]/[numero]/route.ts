import { NextResponse, type NextRequest } from 'next/server';
import { miniatura, original } from '@/lib/server/drive';
import { arquivoDaFoto, numeroFoto, removerFoto } from '@/lib/server/fotos';
import { handleRouteError, jsonError, requireUser } from '@/lib/server/http';

type RouteContext = { params: Promise<{ recordId: string; numero: string }> };

/** Lado maior, em pixels, de cada versão gerada pelo Drive: lista, tela cheia e impressão. */
const TAMANHOS: Record<string, number> = { p: 480, m: 1600, g: 2000 };

/**
 * Imagem de uma foto, buscada no Google Drive na hora (nada fica guardado na hospedagem).
 * ?tam=p|m|g devolve uma versão reduzida; ?tam=original devolve o arquivo enviado, para baixar.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const { recordId, numero } = await params;
    const foto = await arquivoDaFoto(recordId, numeroFoto(numero));
    if (!foto) return jsonError(404, 'Foto não encontrada.');

    const tam = request.nextUrl.searchParams.get('tam') ?? 'p';
    if (tam === 'original') {
      const r = await original(foto.fileId);
      const tamanho = r.headers.get('content-length');
      return new Response(r.body, {
        headers: {
          'Content-Type': r.headers.get('content-type') ?? 'application/octet-stream',
          ...(tamanho ? { 'Content-Length': tamanho } : {}),
          'Content-Disposition': `attachment; filename="${foto.nome}"; filename*=UTF-8''${encodeURIComponent(foto.nome)}`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const lado = TAMANHOS[tam];
    if (!lado) return jsonError(400, 'Tamanho inválido.');
    const r = await miniatura(foto.fileId, lado);
    return new Response(r.body, {
      headers: {
        'Content-Type': r.headers.get('content-type') ?? 'image/jpeg',
        // O endereço muda (?v=) quando a foto é trocada.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;
    const { recordId, numero } = await params;
    return (await removerFoto(recordId, numeroFoto(numero)))
      ? NextResponse.json({ ok: true })
      : jsonError(404, 'Foto não encontrada.');
  } catch (err) {
    return handleRouteError(err);
  }
}
