import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdmin, isMember } from './roles';
import { getDb, closeDb } from '../db';

describe('isAdmin', () => {
  it('returns true for founders', () => {
    expect(isAdmin('76561198051971258')).toBe(true);
    expect(isAdmin('76561198010234134')).toBe(true);
  });

  it('returns true for officers', () => {
    expect(isAdmin('76561198077248762')).toBe(true);
  });

  it('returns false for random IDs and undefined', () => {
    expect(isAdmin('12345')).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('isMember', () => {
  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
  });

  afterEach(() => closeDb());

  it('returns false when steamid not in members table', () => {
    expect(isMember('99999')).toBe(false);
  });

  it('returns true when steamid is in members table', () => {
    const db = getDb();
    db.prepare(
      'INSERT INTO members (steamid, persona, avatar, state, updated_at) VALUES (?,?,?,?,?)',
    ).run('12345', 'Test', '', 0, Date.now());
    expect(isMember('12345')).toBe(true);
  });
});
