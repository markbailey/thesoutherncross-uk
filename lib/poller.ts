// Orchestrates periodic game-server polls + Steam roster refresh.
// Everything is wrapped in try/catch so one bad server can't starve the rest,
// and the Steam side falls back to a stale flag rather than erroring out.

import type { GameConfig, ServerConfig } from '../config/servers';
import { GAMES } from '../config/servers';
import {
  getDb,
  pruneStatusHistory,
  setLastPollAt,
  setMetaFlag,
  withTransaction,
} from './db';
import { childLogger } from './logger';
import { queryServer, type QueryResult } from './query';
import { fetchGroupMembers, fetchPlayerSummaries } from './steam';

const SERVER_POLL_INTERVAL_MS = 60_000;
const MEMBER_POLL_INTERVAL_MS = 300_000;
const STATUS_HISTORY_HOURS = 72;

const log = childLogger({ mod: 'poller' });

export type PollerOptions = {
  steamApiKey: string;
  steamGroupId: string;
  games?: GameConfig[];
};

export type Poller = {
  start: () => void;
  stop: () => void;
  triggerOneShot: () => Promise<void>;
  refreshMembersOnce: () => Promise<void>;
  isRunning: () => boolean;
};

function writeStatusRow(serverId: string, result: QueryResult, now: number): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO server_status (id, online, players, max_players, map, ping, raw_json, updated_at)
    VALUES (@id, @online, @players, @max_players, @map, @ping, @raw_json, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      online = excluded.online,
      players = excluded.players,
      max_players = excluded.max_players,
      map = excluded.map,
      ping = excluded.ping,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `);
  const history = db.prepare(`
    INSERT INTO status_history (server_id, online, players, captured_at)
    VALUES (?, ?, ?, ?)
  `);

  withTransaction(() => {
    if (result.online) {
      upsert.run({
        id: serverId,
        online: 1,
        players: result.players,
        max_players: result.maxPlayers,
        map: result.map ?? null,
        ping: result.ping ?? null,
        raw_json: JSON.stringify(result.raw ?? {}),
        updated_at: now,
      });
      history.run(serverId, 1, result.players, now);
    } else {
      upsert.run({
        id: serverId,
        online: 0,
        players: null,
        max_players: null,
        map: null,
        ping: null,
        raw_json: JSON.stringify({ reason: result.reason }),
        updated_at: now,
      });
      history.run(serverId, 0, null, now);
    }
  });
}

function writeMembers(summaries: Array<{
  steamid: string;
  personaname: string;
  avatarfull: string;
  personastate: number;
  gameid?: string;
  gameextrainfo?: string;
  lastlogoff?: number;
}>, now: number): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO members (steamid, persona, avatar, state, game_id, game_name, last_logoff, updated_at)
    VALUES (@steamid, @persona, @avatar, @state, @game_id, @game_name, @last_logoff, @updated_at)
    ON CONFLICT(steamid) DO UPDATE SET
      persona = excluded.persona,
      avatar = excluded.avatar,
      state = excluded.state,
      game_id = excluded.game_id,
      game_name = excluded.game_name,
      last_logoff = excluded.last_logoff,
      updated_at = excluded.updated_at
  `);

  withTransaction(() => {
    for (const s of summaries) {
      upsert.run({
        steamid: s.steamid,
        persona: s.personaname,
        avatar: s.avatarfull,
        state: s.personastate,
        game_id: s.gameid ?? null,
        game_name: s.gameextrainfo ?? null,
        last_logoff: s.lastlogoff ?? null,
        updated_at: now,
      });
    }
  });
}

export function createPoller(options: PollerOptions): Poller {
  const gamesList = options.games ?? GAMES;
  let serverTimer: NodeJS.Timeout | null = null;
  let memberTimer: NodeJS.Timeout | null = null;
  let running = false;

  async function pollAllServers(): Promise<void> {
    const now = Date.now();
    const servers: ServerConfig[] = gamesList.flatMap((g) =>
      g.servers.filter((s) => !s.hidden),
    );

    for (const server of servers) {
      try {
        const result = await queryServer(server);
        writeStatusRow(server.id, result, now);
        if (result.online) {
          log.debug({ serverId: server.id, players: result.players }, 'server online');
        } else {
          log.info({ serverId: server.id, reason: result.reason }, 'server offline');
        }
      } catch (err) {
        log.error({ serverId: server.id, err }, 'server poll crashed');
      }
    }

    try {
      const deleted = pruneStatusHistory(STATUS_HISTORY_HOURS);
      if (deleted > 0) log.debug({ deleted }, 'pruned status history');
    } catch (err) {
      log.error({ err }, 'status history prune failed');
    }

    try {
      setLastPollAt(Date.now());
    } catch (err) {
      log.error({ err }, 'failed to record lastPollAt');
    }
  }

  async function refreshMembersOnce(): Promise<void> {
    if (!options.steamApiKey || !options.steamGroupId) {
      log.debug('skipping member refresh: steam credentials not configured');
      return;
    }
    try {
      const ids = await fetchGroupMembers(options.steamGroupId);
      const summaries = await fetchPlayerSummaries(ids, options.steamApiKey);
      writeMembers(summaries, Date.now());
      setMetaFlag('members.stale', false);
      log.info({ count: summaries.length }, 'members refreshed');
    } catch (err) {
      log.error({ err }, 'member refresh failed; leaving stale cache');
      try {
        setMetaFlag('members.stale', true);
      } catch (flagErr) {
        log.error({ err: flagErr }, 'failed to set members.stale flag');
      }
    }
  }

  function start(): void {
    if (running) {
      log.warn('poller.start called twice; ignoring');
      return;
    }
    running = true;
    log.info('poller starting');

    // immediate first tick, fire-and-forget; errors are already swallowed internally
    void pollAllServers();
    void refreshMembersOnce();

    serverTimer = setInterval(() => {
      void pollAllServers();
    }, SERVER_POLL_INTERVAL_MS);
    memberTimer = setInterval(() => {
      void refreshMembersOnce();
    }, MEMBER_POLL_INTERVAL_MS);
  }

  function stop(): void {
    if (!running) return;
    running = false;
    if (serverTimer) {
      clearInterval(serverTimer);
      serverTimer = null;
    }
    if (memberTimer) {
      clearInterval(memberTimer);
      memberTimer = null;
    }
    log.info('poller stopped');
  }

  async function triggerOneShot(): Promise<void> {
    log.info('triggerOneShot: running one server poll cycle');
    await pollAllServers();
  }

  return {
    start,
    stop,
    triggerOneShot,
    refreshMembersOnce,
    isRunning: () => running,
  };
}

// Shared default instance wired to process env.
// server.ts imports these exports; API routes call triggerOneShot via this singleton.
const defaultPoller = createPoller({
  steamApiKey: process.env['STEAM_API_KEY'] ?? '',
  steamGroupId: process.env['STEAM_GROUP_ID'] ?? '',
});

export function start(): void {
  defaultPoller.start();
}
export function stop(): void {
  defaultPoller.stop();
}
export function triggerOneShot(): Promise<void> {
  return defaultPoller.triggerOneShot();
}
export function isRunning(): boolean {
  return defaultPoller.isRunning();
}
