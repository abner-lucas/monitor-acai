import { NextResponse, type NextRequest } from 'next/server';
import { urlAutorizacao } from '@/lib/server/drive';
import { ESTADO_COOKIE, novoEstado } from '@/lib/server/driveEstado';
import { handleRouteError, origemPublica, requireSuperuser } from '@/lib/server/http';

/** Leva o coordenador à tela de consentimento do Google. */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const voltar = request.nextUrl.searchParams.get('voltar');
    const destino = voltar && /^\/[\w/-]*$/.test(voltar) ? voltar : '/breves';
    const { nonce, state } = novoEstado();

    const response = NextResponse.redirect(urlAutorizacao(`${origemPublica(request)}/api/drive/callback`, state));
    response.cookies.set(ESTADO_COOKIE, JSON.stringify({ nonce, destino }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/drive',
      maxAge: 600,
    });
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
