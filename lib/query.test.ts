import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServerConfig } from '../config/servers';

const queryMock = vi.fn();

vi.mock('gamedig', () => ({
  GameDig: { query: (...args: unknown[]) => queryMock(...args) },
  default: { query: (...args: unknown[]) => queryMock(...args) },
}));

import { queryServer } from './query';

const sourceServer: ServerConfig = {
  id: 'cs',
  name: 'Dust2',
  host: '1.2.3.4',
  port: 27015,
  protocol: 'source',
};
const minecraftServer: ServerConfig = {
  id: 'mc',
  name: 'Vanilla',
  host: 'mc.example',
  port: 25565,
  protocol: 'minecraft',
};

describe('queryServer', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('maps a successful source query into the online shape', async () => {
    queryMock.mockResolvedValueOnce({
      players: [{ name: 'alice' }, { name: 'bob' }],
      maxplayers: 16,
      map: 'de_dust2',
      ping: 42,
      raw: { ok: true },
    });
    const result = await queryServer(sourceServer, { retries: 0 });
    expect(result.online).toBe(true);
    if (result.online) {
      expect(result.players).toBe(2);
      expect(result.maxPlayers).toBe(16);
      expect(result.map).toBe('de_dust2');
      expect(result.ping).toBe(42);
    }
  });

  it('maps protocol:source to gamedig type protocol-valve', async () => {
    queryMock.mockResolvedValueOnce({ players: [], maxplayers: 0 });
    await queryServer(sourceServer, { retries: 0 });
    expect(queryMock).toHaveBeenCalledTimes(1);
    const arg = queryMock.mock.calls[0]?.[0] as { type: string };
    expect(arg.type).toBe('protocol-valve');
  });

  it('maps protocol:minecraft to gamedig type minecraft', async () => {
    queryMock.mockResolvedValueOnce({ players: [], maxplayers: 0 });
    await queryServer(minecraftServer, { retries: 0 });
    const arg = queryMock.mock.calls[0]?.[0] as { type: string };
    expect(arg.type).toBe('minecraft');
  });

  it('returns offline with the error message on thrown error', async () => {
    queryMock.mockRejectedValue(new Error('connection refused'));
    const result = await queryServer(sourceServer, { retries: 1 });
    expect(result.online).toBe(false);
    if (!result.online) {
      expect(result.reason).toContain('connection refused');
    }
    // initial try + 1 retry = 2 calls
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('returns offline on timeout', async () => {
    queryMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('unreachable')), 50);
        }),
    );
    const result = await queryServer(sourceServer, { timeoutMs: 10, retries: 0 });
    expect(result.online).toBe(false);
    if (!result.online) {
      expect(result.reason).toMatch(/timeout|unreachable/i);
    }
  });

  it('retries once on failure then succeeds', async () => {
    queryMock
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ players: [{ name: 'x' }], maxplayers: 4 });
    const result = await queryServer(sourceServer, { retries: 1 });
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(result.online).toBe(true);
  });

  it('handles player count reported as a number rather than an array', async () => {
    queryMock.mockResolvedValueOnce({ players: 5, maxplayers: 10 });
    const result = await queryServer(minecraftServer, { retries: 0 });
    expect(result.online).toBe(true);
    if (result.online) {
      expect(result.players).toBe(5);
    }
  });
});
