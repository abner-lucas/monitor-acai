import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { findUserByEmail, toAuthUser } from '@/lib/server/auth';
import { handleRouteError, jsonError, readJsonBody } from '@/lib/server/http';
import { setSessionCookie } from '@/lib/server/session';

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return jsonError(400, 'Por favor, informe o email e a senha de acesso.');
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return jsonError(
        401,
        'Acesso negado: Este email não está na lista de pesquisadores autorizados. Solicite liberação ao coordenador Ábner Lucas (abner.lucas@ifpa.edu.br).'
      );
    }

    if (!user.is_active) {
      return jsonError(403, 'Acesso suspenso: Este usuário foi desativado temporariamente pelo coordenador do projeto.');
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      return jsonError(401, 'Senha incorreta. Verifique os caracteres digitados ou solicite redefinição ao coordenador.');
    }

    const response = NextResponse.json({ user: toAuthUser(user) });
    setSessionCookie(response, user.id);
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
