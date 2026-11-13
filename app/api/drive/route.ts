import { NextResponse, type NextRequest } from 'next/server';
import { desconectar, estadoDrive } from '@/lib/server/drive';
import { handleRouteError, requireSuperuser, requireUser } from '@/lib/server/http';

/** Situação da conexão com o Google Drive (onde ficam as fotos dos relatórios). */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;
    return NextResponse.json({ drive: await estadoDrive() });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Desconecta a conta (as fotos continuam no Drive). */
export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireSuperuser(request);
    if (guard.response) return guard.response;
    await desconectar();
    return NextResponse.json({ drive: await estadoDrive() });
  } catch (err) {
    return handleRouteError(err);
  }
}
