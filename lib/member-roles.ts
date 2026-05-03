import { GUILD } from '../config/guild';

export type MemberRole = 'founder' | 'officer' | 'moderator' | 'member';

export function roleFor(steamid: string): MemberRole {
  const { founders, officers, moderators } = GUILD.roles;
  if (founders.includes(steamid)) return 'founder';
  if (officers.includes(steamid)) return 'officer';
  if (moderators.includes(steamid)) return 'moderator';
  return 'member';
}
