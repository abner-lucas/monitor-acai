import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, requireUser, unidadeDaRequisicao } from '@/lib/server/http';
import { listReports } from '@/lib/server/reports';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ reports: await listReports(unidadeDaRequisicao(request)) });
  } catch (err) {
    return handleRouteError(err);
  }
}
