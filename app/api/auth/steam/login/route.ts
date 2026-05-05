import { NextRequest, NextResponse } from 'next/server';
import { buildLoginUrl } from '../../../../../lib/auth/steam-openid';

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
  const callbackUrl = `${siteBase}/api/auth/steam/callback?returnTo=${encodeURIComponent(returnTo)}`;

  try {
    const loginUrl = await buildLoginUrl(callbackUrl);
    return NextResponse.redirect(loginUrl);
  } catch {
    return NextResponse.redirect(new URL('/?login=error', request.url));
  }
}
