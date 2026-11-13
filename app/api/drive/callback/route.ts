import { NextResponse, type NextRequest } from 'next/server';
import { concluirConexao } from '@/lib/server/drive';
import { ESTADO_COOKIE, estadoValido } from '@/lib/server/driveEstado';
import { origemPublica, requireSuperuser } from '@/lib/server/http';

/** Volta da tela de consentimento do Google: guarda o acesso e cria a pasta do projeto. */
export async function GET(request: NextRequest) {
  const origem = origemPublica(request);
  let destino = '/breves';
  const voltar = (resultado: string) => {
    const r = NextResponse.redirect(`${origem}${destino}?drive=${resultado}`);
    r.cookies.set(ESTADO_COOKIE, '', { path: '/api/drive', maxAge: 0 });
    return r;
  };

  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return voltar('negado');

    let salvo: { nonce?: string; destino?: string } = {};
    try {
      salvo = JSON.parse(request.cookies.get(ESTADO_COOKIE)?.value ?? '{}');
    } catch {
      // Cookie adulterado: cai na validação abaixo.
    }
    if (salvo.destino && /^\/[\w/-]*$/.test(salvo.destino)) destino = salvo.destino;
    if (!estadoValido(request.nextUrl.searchParams.get('state'), salvo.nonce)) return voltar('erro');

    const code = request.nextUrl.searchParams.get('code');
    if (!code) return voltar('cancelado');
    await concluirConexao(code, `${origem}/api/drive/callback`);
    return voltar('conectado');
  } catch (err) {
    console.error('[drive] falha ao conectar', err);
    return voltar('erro');
  }
}
