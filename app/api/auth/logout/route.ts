import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { getSessionOptions, type SessionData } from '../../../../lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL('/', process.env['SITE_BASE_URL'] ?? 'http://localhost:3000'),
    303,
  );
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());
  await session.destroy();
  return response;
}
