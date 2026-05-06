import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { verifyAssertion } from '../../../../../lib/auth/steam-openid';
import { sessionOptions, type SessionData } from '../../../../../lib/auth/session';
import { isMember, isAdmin } from '../../../../../lib/auth/roles';

export const runtime = 'nodejs';

function safeReturnTo(value: string | null): string {
  // Accept only relative paths that start with '/' but not '//' (protocol-relative URLs)
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const siteBase = process.env['SITE_BASE_URL'] ?? 'http://localhost:3000';
  const cbBase = `${siteBase}/api/auth/steam/callback?returnTo=${encodeURIComponent(returnTo)}`;

  try {
    const steamid = await verifyAssertion(request.url, cbBase);

    if (!isMember(steamid)) {
      const deniedResponse = NextResponse.redirect(new URL('/?login=denied', siteBase));
      const session = await getIronSession<SessionData>(request, deniedResponse, sessionOptions);
      session.destroy();
      return deniedResponse;
    }

    const db = (await import('../../../../../lib/db')).getDb();
    const member = db.prepare('SELECT persona, avatar FROM members WHERE steamid = ?').get(steamid) as
      | { persona: string; avatar: string }
      | undefined;

    const response = NextResponse.redirect(new URL(returnTo, siteBase));
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.steamid = steamid;
    session.persona = member?.persona ?? steamid;
    session.avatar = member?.avatar ?? '';
    session.isAdmin = isAdmin(steamid);
    await session.save();

    return response;
  } catch {
    return NextResponse.redirect(new URL('/?login=error', siteBase));
  }
}
