import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GameConfig } from '../config/servers';

const queryServerMock = vi.fn();
const fetchGroupMembersMock = vi.fn();
const fetchPlayerSummariesMock = vi.fn();
const pruneStatusHistoryMock = vi.fn();
const setLastPollAtMock = vi.fn();
const setMetaFlagMock = vi.fn();

const dbRun = vi.fn();
const dbPrepare = vi.fn(() => ({ run: dbRun }));
const dbTransaction = vi.fn((fn: () => unknown) => fn);

vi.mock('./query', () => ({
  queryServer: (...args: unknown[]) => queryServerMock(...args),
}));

vi.mock('./steam', () => ({
  fetchGroupMembers: (...args: unknown[]) => fetchGroupMembersMock(...args),
  fetchPlayerSummaries: (...args: unknown[]) => fetchPlayerSummariesMock(...args),
  SteamError: class SteamError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('./db', () => ({
  getDb: () => ({
    prepare: dbPrepare,
    transaction: dbTransaction,
  }),
  pruneStatusHistory: (...args: unknown[]) => pruneStatusHistoryMock(...args),
  setLastPollAt: (...args: unknown[]) => setLastPollAtMock(...args),
  setMetaFlag: (...args: unknown[]) => setMetaFlagMock(...args),
  withTransaction: (fn: () => unknown) => fn(),
}));

import { createPoller } from './poller';

const games: GameConfig[] = [
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    planet: { color: '#ff8800', size: 0.8, orbitRadius: 14, orbitSpeed: 0.03 },
    servers: [
      { id: 's1', name: 'Alpha', host: '1.1.1.1', port: 27015, protocol: 'source' },
      { id: 's2', name: 'Beta', host: '1.1.1.2', port: 27015, protocol: 'source' },
    ],
  },
  {
    id: 'mc',
    name: 'Minecraft',
    planet: { color: '#6ab04c', size: 1, orbitRadius: 8, orbitSpeed: 0.05 },
    servers: [{ id: 's3', name: 'Vanilla', host: 'mc', port: 25565, protocol: 'minecraft' }],
  },
];

describe('poller', () => {
  beforeEach(() => {
    queryServerMock.mockReset();
    fetchGroupMembersMock.mockReset();
    fetchPlayerSummariesMock.mockReset();
    pruneStatusHistoryMock.mockReset();
    setLastPollAtMock.mockReset();
    setMetaFlagMock.mockReset();
    dbRun.mockReset();
    dbPrepare.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggerOneShot queries every configured server exactly once', async () => {
    queryServerMock.mockResolvedValue({ online: true, players: 1, maxPlayers: 2, raw: {} });
    const p = createPoller({ steamApiKey: '', steamGroupId: '', games });
    await p.triggerOneShot();
    expect(queryServerMock).toHaveBeenCalledTimes(3);
  });

  it('one failing server does not stop the rest', async () => {
    queryServerMock.mockImplementation(async (server: { id: string }) => {
      if (server.id === 's1') throw new Error('boom');
      return { online: true, players: 0, maxPlayers: 0, raw: {} };
    });
    const p = createPoller({ steamApiKey: '', steamGroupId: '', games });
    await p.triggerOneShot();
    expect(queryServerMock).toHaveBeenCalledTimes(3);
  });

  it('prunes status_history and records lastPollAt after a tick', async () => {
    queryServerMock.mockResolvedValue({ online: true, players: 0, maxPlayers: 0, raw: {} });
    const p = createPoller({ steamApiKey: '', steamGroupId: '', games });
    await p.triggerOneShot();
    expect(pruneStatusHistoryMock).toHaveBeenCalledTimes(1);
    expect(setLastPollAtMock).toHaveBeenCalledTimes(1);
  });

  it('skips member refresh when steamApiKey or steamGroupId is empty', async () => {
    queryServerMock.mockResolvedValue({ online: true, players: 0, maxPlayers: 0, raw: {} });
    const p = createPoller({ steamApiKey: '', steamGroupId: '', games });
    await p.refreshMembersOnce();
    expect(fetchGroupMembersMock).not.toHaveBeenCalled();
    expect(fetchPlayerSummariesMock).not.toHaveBeenCalled();
  });

  it('member refresh success clears the stale flag', async () => {
    fetchGroupMembersMock.mockResolvedValue(['76561198000000001']);
    fetchPlayerSummariesMock.mockResolvedValue([
      {
        steamid: '76561198000000001',
        personaname: 'alice',
        avatarfull: 'http://a',
        personastate: 1,
      },
    ]);
    const p = createPoller({ steamApiKey: 'KEY', steamGroupId: 'G', games });
    await p.refreshMembersOnce();
    expect(setMetaFlagMock).toHaveBeenCalledWith('members.stale', false);
  });

  it('member refresh failure sets the stale flag and does not throw', async () => {
    fetchGroupMembersMock.mockRejectedValue(new Error('upstream down'));
    const p = createPoller({ steamApiKey: 'KEY', steamGroupId: 'G', games });
    await expect(p.refreshMembersOnce()).resolves.toBeUndefined();
    expect(setMetaFlagMock).toHaveBeenCalledWith('members.stale', true);
  });

  it('start() is idempotent (double-start is a no-op)', async () => {
    queryServerMock.mockResolvedValue({ online: true, players: 0, maxPlayers: 0, raw: {} });
    vi.useFakeTimers();
    const p = createPoller({ steamApiKey: '', steamGroupId: '', games });
    p.start();
    p.start(); // second call should be ignored
    expect(p.isRunning()).toBe(true);
    p.stop();
    expect(p.isRunning()).toBe(false);
  });
});
