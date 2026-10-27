import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, jsonError, readJsonBody, requireUser } from '@/lib/server/http';
import { deleteRecord, getRecord, updateRecord } from '@/lib/server/records';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const record = await getRecord((await params).id);
    return record ? NextResponse.json({ record }) : jsonError(404, 'Registro não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const record = await updateRecord((await params).id, await readJsonBody(request));
    return record ? NextResponse.json({ record }) : jsonError(404, 'Registro não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const deleted = await deleteRecord((await params).id);
    return deleted ? NextResponse.json({ success: true }) : jsonError(404, 'Registro não encontrado.');
  } catch (err) {
    return handleRouteError(err);
  }
}
