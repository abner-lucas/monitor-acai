import { NextResponse, type NextRequest } from 'next/server';
import {
  bloqueioDeSenha,
  findUserById,
  getSessionUser,
  gravarSenha,
  limparFalhas,
  registrarFalha,
  senhaConfere,
  toAuthUser,
} from '@/lib/server/auth';
import { handleRouteError, ipDaRequisicao, jsonError, origemInvalida, readJsonBody } from '@/lib/server/http';
import { setSessionCookie } from '@/lib/server/session';
import { problemaSenha } from '@/lib/papeis';

/**
 * Troca da própria senha. Também é o caminho obrigatório de quem entrou com senha provisória,
 * por isso usa a sessão direto (requireUser bloquearia esse usuário).
 */
export async function POST(request: NextRequest) {
  try {
    const recusa = origemInvalida(request);
    if (recusa) return recusa;
    const sessao = await getSessionUser(request);
    if (!sessao) return jsonError(401, 'Sessão expirada. Entre novamente para continuar.');

    const body = await readJsonBody(request);
    const atual = typeof body.atual === 'string' ? body.atual.slice(0, 200) : '';
    const nova = typeof body.nova === 'string' ? body.nova : '';

    const ip = ipDaRequisicao(request);
    const espera = bloqueioDeSenha(ip, sessao.email);
    if (espera > 0) return jsonError(429, `Muitas tentativas de senha. Tente de novo em ${espera} min.`);

    const row = await findUserById(sessao.id);
    if (!(await senhaConfere(atual, row))) {
      registrarFalha(ip, sessao.email);
      return jsonError(400, 'A senha atual não confere.');
    }
    const problema = problemaSenha(nova, sessao.email);
    if (problema) return jsonError(400, problema);
    if (nova === atual) return jsonError(400, 'A nova senha deve ser diferente da atual.');

    limparFalhas(sessao.email);
    const atualizado = await gravarSenha(sessao.id, nova, false);
    if (!atualizado) return jsonError(401, 'Sessão expirada. Entre novamente para continuar.');

    // A troca derruba as outras sessões; esta continua com um cookie novo.
    const response = NextResponse.json({ user: toAuthUser(atualizado) });
    setSessionCookie(response, atualizado.id, atualizado.session_version);
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
