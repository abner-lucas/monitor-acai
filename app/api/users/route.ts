import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { BCRYPT_ROUNDS, findUserByEmail, gravarSenha, listUsers, toAuthorizedUser } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { handleRouteError, jsonError, readJsonBody, requireSuperuser } from '@/lib/server/http';
import { SUPERUSER_EMAIL } from '@/lib/constants';
import { isPapel, problemaSenha } from '@/lib/papeis';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ users: await listUsers() });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Novo usuário com senha provisória: ele é obrigado a trocar no primeiro acesso. */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!EMAIL.test(email) || email.length > 255) return jsonError(400, 'Informe um endereço de email válido.');
    if (!fullName || fullName.length > 255) return jsonError(400, 'Informe o nome completo.');
    if (!isPapel(body.role)) return jsonError(400, 'Escolha o nível de acesso.');
    const problema = problemaSenha(password, email);
    if (problema) return jsonError(400, problema);

    if (await findUserByEmail(email)) {
      return jsonError(409, 'Este email já está cadastrado na equipe.');
    }

    const db = await getDb();
    await db.query('INSERT INTO authorized_users SET ?', [
      {
        id: `usr_${randomBytes(9).toString('base64url')}`,
        email,
        full_name: fullName,
        role: body.role,
        password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        is_active: 1,
        must_change_password: 1,
        created_at: new Date(),
      },
    ]);

    const created = await findUserByEmail(email);
    return NextResponse.json({ user: created ? toAuthorizedUser(created) : null }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Alterações feitas pelo administrador: nível de acesso, suspensão e nova senha provisória.
 * O coordenador do projeto e o próprio administrador logado não podem ser rebaixados nem suspensos.
 */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const alvo = email ? await findUserByEmail(email) : null;
    if (!alvo) return jsonError(404, 'Usuário não encontrado.');

    const protegido = email === SUPERUSER_EMAIL || alvo.id === guard.user.id;
    const db = await getDb();

    if (body.role !== undefined) {
      if (!isPapel(body.role)) return jsonError(400, 'Nível de acesso inválido.');
      if (protegido && body.role !== 'superuser') {
        return jsonError(403, 'O coordenador do projeto e você mesmo continuam como administradores.');
      }
      await db.query('UPDATE authorized_users SET role = ? WHERE id = ?', [body.role, alvo.id]);
    }

    if (body.ativo !== undefined) {
      if (typeof body.ativo !== 'boolean') return jsonError(400, 'Valor inválido.');
      if (protegido && !body.ativo) return jsonError(403, 'O coordenador do projeto e você mesmo não podem ser suspensos.');
      await db.query('UPDATE authorized_users SET is_active = ? WHERE id = ?', [body.ativo ? 1 : 0, alvo.id]);
    }

    if (body.novaSenha !== undefined) {
      const senha = typeof body.novaSenha === 'string' ? body.novaSenha : '';
      const problema = problemaSenha(senha, email);
      if (problema) return jsonError(400, problema);
      if (alvo.id === guard.user.id) return jsonError(400, 'Para trocar a sua própria senha, use Minha conta.');
      await gravarSenha(alvo.id, senha, true);
    }

    const atualizado = await findUserByEmail(email);
    return NextResponse.json({ user: atualizado ? toAuthorizedUser(atualizado) : null });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return jsonError(400, 'Informe o email do usuário.');

    const target = await findUserByEmail(email);
    if (!target) return jsonError(404, 'Usuário não encontrado.');
    if (email === SUPERUSER_EMAIL || target.id === guard.user.id) {
      return jsonError(403, 'O coordenador do projeto e você mesmo não podem ser removidos.');
    }

    const db = await getDb();
    await db.query('DELETE FROM authorized_users WHERE id = ?', [target.id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
