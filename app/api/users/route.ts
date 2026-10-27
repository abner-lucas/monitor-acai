import bcrypt from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { BCRYPT_ROUNDS, findUserByEmail, listUsers, toAuthorizedUser } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { handleRouteError, jsonError, readJsonBody, requireSuperuser } from '@/lib/server/http';
import { SUPERUSER_EMAIL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ users: await listUsers() });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role === 'superuser' ? 'superuser' : 'pesquisador';

    if (!email || !email.includes('@')) return jsonError(400, 'Informe um endereço de email válido.');
    if (!fullName) return jsonError(400, 'Informe o nome completo do pesquisador.');
    if (password.length < 6) return jsonError(400, 'A senha deve conter no mínimo 6 caracteres.');

    if (await findUserByEmail(email)) {
      return jsonError(409, 'Este email já está cadastrado na lista de autorizados.');
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const db = await getDb();
    await db.query('INSERT INTO authorized_users SET ?', [
      {
        id,
        email,
        full_name: fullName,
        role,
        password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        is_active: 1,
        created_at: new Date(),
      },
    ]);

    const created = await findUserByEmail(email);
    return NextResponse.json({ user: created ? toAuthorizedUser(created) : null }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;

    const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return jsonError(400, 'Informe o email do pesquisador.');

    const target = await findUserByEmail(email);
    if (target && (email === SUPERUSER_EMAIL || target.role === 'superuser' || target.id === guard.user.id)) {
      return jsonError(403, `O coordenador superusuário (${SUPERUSER_EMAIL}) não pode ser removido.`);
    }

    const db = await getDb();
    await db.query('DELETE FROM authorized_users WHERE email = ?', [email]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
