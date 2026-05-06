import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from './session';
import { isAdmin } from './roles';

export async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}
