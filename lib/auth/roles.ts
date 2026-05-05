import { GUILD } from '../../config/guild';
import { getDb, getMetaFlag } from '../db';

export function isAdmin(steamid: string | undefined): boolean {
  if (!steamid) return false;
  return (
    (GUILD.roles.founders as readonly string[]).includes(steamid) ||
    (GUILD.roles.officers as readonly string[]).includes(steamid)
  );
}

export function isMember(steamid: string): boolean {
  const stale = getMetaFlag('members.stale');
  if (stale) return true; // skip DB check if cache is stale to avoid false-rejects
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM members WHERE steamid = ?').get(steamid);
  return row !== undefined;
}
