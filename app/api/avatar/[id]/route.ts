import { type NextRequest } from 'next/server';
import { buscarFoto } from '@/lib/server/auth';
import { handleRouteError, jsonError, requireUser } from '@/lib/server/http';

type RouteContext = { params: Promise<{ id: string }> };

/** Foto de um usuário da equipe (só para quem está logado). */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const foto = await buscarFoto((await params).id);
    if (!foto) return jsonError(404, 'Sem foto.');

    return new Response(new Uint8Array(foto.bytes), {
      headers: {
        'Content-Type': foto.tipo,
        // O endereço muda (?v=) a cada nova foto, então pode ficar em cache por muito tempo.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
