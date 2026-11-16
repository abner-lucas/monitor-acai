import { NextResponse, type NextRequest } from 'next/server';
import { bloqueioDeSenha, findUserByEmail, limparFalhas, registrarFalha, senhaConfere, toAuthUser } from '@/lib/server/auth';
import { handleRouteError, ipDaRequisicao, jsonError, origemInvalida, readJsonBody } from '@/lib/server/http';
import { setSessionCookie } from '@/lib/server/session';

/** Mesma resposta para email desconhecido e senha errada: não revela quem tem acesso. */
const CREDENCIAIS_INVALIDAS =
  'Email ou senha incorretos. Se esqueceu a senha, peça ao coordenador Ábner Lucas (abner.lucas@ifpa.edu.br) para redefinir.';

export async function POST(request: NextRequest) {
  try {
    const recusa = origemInvalida(request);
    if (recusa) return recusa;

    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 255) : '';
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
    if (!email || !password) {
      return jsonError(400, 'Por favor, informe o email e a senha de acesso.');
    }

    const ip = ipDaRequisicao(request);
    const espera = bloqueioDeSenha(ip, email);
    if (espera > 0) {
      return jsonError(429, `Muitas tentativas de senha. Tente de novo em ${espera} min.`);
    }

    const user = await findUserByEmail(email);
    if (!(await senhaConfere(password, user))) {
      registrarFalha(ip, email);
      return jsonError(401, CREDENCIAIS_INVALIDAS);
    }
    // Só depois da senha certa: não revela se o email existe.
    if (!user!.is_active) {
      return jsonError(403, 'Acesso suspenso: este usuário foi desativado pelo coordenador do projeto.');
    }

    limparFalhas(email);
    const response = NextResponse.json({ user: toAuthUser(user!) });
    setSessionCookie(response, user!.id, user!.session_version);
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
