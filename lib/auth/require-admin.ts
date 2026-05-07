import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getSessionOptions, type SessionData } from './session';
import { isAdmin } from './roles';

export async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}
