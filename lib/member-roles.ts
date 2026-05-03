import { GUILD } from '../config/guild';

export type MemberRole = 'founder' | 'officer' | 'moderator' | 'member';

export function roleFor(steamid: string): MemberRole {
  const { founder, officers, moderators } = GUILD.roles;
  if (steamid === founder) return 'founder';
  if (officers.includes(steamid)) return 'officer';
  if (moderators.includes(steamid)) return 'moderator';
  return 'member';
}
