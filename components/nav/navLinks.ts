/** Shared nav link definitions — imported by NavBar and NavDrawer. */
export const SECTION_IDS = ['hero', 'about', 'system', 'members', 'join'] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const NAV_LINKS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'hero', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'members', label: 'MEMBERS' },
  { id: 'join', label: 'JOIN' },
];
