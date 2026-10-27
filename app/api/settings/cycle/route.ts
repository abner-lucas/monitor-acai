import { NextResponse, type NextRequest } from 'next/server';
import { handleRouteError, readJsonBody, requireUser } from '@/lib/server/http';
import { getCurrentCycle, setCurrentCycle } from '@/lib/server/records';

export async function GET(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    return NextResponse.json({ cycle: await getCurrentCycle() });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireUser(request);
    if (guard.response) return guard.response;

    const body = await readJsonBody(request);
    return NextResponse.json({ cycle: await setCurrentCycle(body.cycle) });
  } catch (err) {
    return handleRouteError(err);
  }
}
