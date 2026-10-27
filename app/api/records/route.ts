import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, readJsonBody, requireUser } from '@/lib/server/http';
import { createRecord, listRecords } from '@/lib/server/records';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ records: await listRecords() });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const record = await createRecord(await readJsonBody(request));
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
