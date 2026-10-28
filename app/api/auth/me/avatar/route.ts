import { NextResponse, type NextRequest } from 'next/server';
import { lerFoto, salvarFoto, toAuthUser } from '@/lib/server/auth';
import { handleRouteError, jsonError, readJsonBody, requireUser } from '@/lib/server/http';

/** Troca a foto do próprio usuário: { imagem: "data:image/webp;base64,..." }. */
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const body = await readJsonBody(request);
    if (!lerFoto(body.imagem)) {
      return jsonError(400, 'Imagem inválida. Use uma foto JPG, PNG ou WebP de até 300 KB.');
    }
    const row = await salvarFoto(guard.user.id, body.imagem as string);
    return row ? NextResponse.json({ user: toAuthUser(row) }) : jsonError(404, 'Usuário não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Remove a foto do próprio usuário (volta a mostrar a inicial do nome). */
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const row = await salvarFoto(guard.user.id, null);
    return row ? NextResponse.json({ user: toAuthUser(row) }) : jsonError(404, 'Usuário não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}
