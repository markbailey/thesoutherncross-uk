// Edge-Runtime-safe admin check — no DB import.
// Middleware uses this; server-side code uses the full lib/auth/roles.ts.
import { GUILD } from '../../config/guild';

export function isAdmin(steamid: string | undefined): boolean {
  if (!steamid) return false;
  return (
    (GUILD.roles.founders as readonly string[]).includes(steamid) ||
    (GUILD.roles.officers as readonly string[]).includes(steamid)
  );
}
