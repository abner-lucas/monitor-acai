import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, jsonError, readJsonBody, requireUser } from '@/lib/server/http';
import { getReport, saveReport } from '@/lib/server/reports';

type RouteContext = { params: Promise<{ recordId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ report: await getReport((await params).recordId) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const autor = guard.user.fullName || guard.user.email;
    const report = await saveReport((await params).recordId, await readJsonBody(request), autor);
    return report ? NextResponse.json({ report }) : jsonError(404, 'Rodízio não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}
