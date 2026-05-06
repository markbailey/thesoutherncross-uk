import { NextRequest, NextResponse } from 'next/server';
import { buildLoginUrl } from '../../../../../lib/auth/steam-openid';

export const runtime = 'nodejs';

function safeReturnTo(value: string | null, siteBase: string): string {
  if (!value) return '/';
  try {
    const resolved = new URL(value, siteBase);
    const base = new URL(siteBase);
    if (resolved.origin === base.origin) return resolved.pathname + resolved.search;
  } catch { /* fall through */ }
  return '/';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteBase = process.env['SITE_BASE_URL'] ?? 'http://localhost:3000';
  const returnTo = safeReturnTo(searchParams.get('returnTo'), siteBase);
  const callbackUrl = `${siteBase}/api/auth/steam/callback?returnTo=${encodeURIComponent(returnTo)}`;

  try {
    const loginUrl = await buildLoginUrl(callbackUrl);
    return NextResponse.redirect(loginUrl);
  } catch {
    return NextResponse.redirect(new URL('/?login=error', request.url));
  }
}
