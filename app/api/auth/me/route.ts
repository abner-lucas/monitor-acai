import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { handleRouteError } from '@/lib/server/http';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ user: await getSessionUser(request) });
  } catch (err) {
    return handleRouteError(err);
  }
}
