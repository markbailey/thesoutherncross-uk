# Games Table Design

**Date:** 2026-05-05  
**Branch:** claude_GH-5_server-registry-steam-signin_feature  
**Status:** Approved

## Problem

DB-registered servers never appear in the planet view. `SystemSection` builds `sceneGames` from `data.games` (demo-mode shape only); live DB mode returns `{ servers }` with no game grouping or planet config, so the 3D scene gets an empty list.

## Solution

Introduce a `games` table. Each server belongs to a game. The API always returns `{ games }` shape. Planet visuals are computed deterministically — never stored.

---

## Data Model

### New: `games` table

```sql
CREATE TABLE games (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  protocol    TEXT    NOT NULL,
  orbit_index INTEGER NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);
```

- `id` — slugified from name (same collision-avoidance logic as servers)
- `orbit_index` — auto-assigned as `MAX(orbit_index) + 1` on insert, starts at 0
- Never reclaimed on delete — orbits don't shift when a game is removed
- `protocol` — moves here from `servers` (all servers under a game share protocol)

### Updated: `servers` table

- Add `game_id TEXT NOT NULL REFERENCES games(id)`
- Remove `protocol` column

Migration on dev branch: drop and recreate (no production data to preserve).

### Visual config — computed, never stored

```
color       = hsl(hash(game.id) % 360, 70%, 60%)
size        = 1.0 + (orbit_index % 3) * 0.15
orbitRadius = 80 + orbit_index * 70
orbitSpeed  = 0.4 / (1 + orbit_index * 0.25)   // outer orbits slower
```

Moon (server) colour: fixed `#8a8fa8` (gray), applied in the Scene component.

Pure function `computePlanet(game)` in `lib/repos/games.ts` owns this logic.

---

## Repos

### New: `lib/repos/games.ts`

- `listAll()` — all games ordered by `orbit_index`
- `getById(id)` — single game or undefined
- `create(input: { name, protocol })` — auto-assigns `orbit_index`, slugifies name for `id`
- `deleteGame(id)` — throws if any server references this game
- `computePlanet(game)` — pure function, returns `{ color, size, orbitRadius, orbitSpeed }`

### Updated: `lib/repos/servers.ts`

- `listEnabled()` — joins `games` to include `protocol` (poller needs it)
- `listAll()` — joins `games` to include `game_name` and `game_id` (admin table)
- `createServer` / `updateServer` — swap `protocol` param for `game_id`

---

## API

### `GET /api/servers` — updated

DB mode now returns `{ games: ApiGame[], updatedAt }` — same shape as demo mode.  
Demo mode (`buildDemoServersResponse`) also updated to include `host`/`port` per server so connect string logic is consistent across both modes.

Each `ApiGame`:
```ts
{
  id: string
  name: string
  planet: { color, size, orbitRadius, orbitSpeed }  // from computePlanet
  servers: Array<{
    id, name, online, players, maxPlayers, map, ping, updatedAt,
    host, port   // added — needed for connect strings in HUD (static GAMES is now empty)
  }>
}
```

### `POST /api/admin/games` — new

Creates a game. Body: `{ name, protocol }`.

### `PATCH /api/admin/servers/[id]` — updated

Accepts `game_id` instead of `protocol`.

---

## Admin UI

### `app/admin/layout.tsx` — updated

Add **GAMES** tab to sub-nav alongside SERVERS.

### New: `app/admin/games/page.tsx`

Table matching servers page style:

| NAME | PROTOCOL | ORBIT | SERVERS | ACTIONS |
|------|----------|-------|---------|---------|
| Enshrouded | SOURCE | 0 | 1 | DEL |

DEL is blocked (disabled + tooltip) if servers reference the game.

### New: `app/admin/games/new/page.tsx`

Form: name (text) + protocol dropdown (`source` / `minecraft`). Submits to `POST /api/admin/games`.

### Updated: `app/admin/servers/new` and edit pages

- Game dropdown (required) replaces protocol field
- Game list fetched server-side via `listAll()` from `lib/repos/games`

---

## SystemSection

- `CONNECT_STRINGS` map — replaced: built from `host:port` in API response instead of static `GAMES` config (which is now empty)
- `sceneGames` memo — simplified: `data.games` is now the only shape in both demo and DB modes
- Moon colour — Scene component sets server dots to `#8a8fa8`

---

## Error Handling

- Poller: `listEnabled()` join fails gracefully — existing try/catch per server in `pollAllServers`
- API: game not found on server create → 422 with message
- Admin: delete blocked at DB level (FK constraint) + UI disables button when servers exist

---

## Testing

- `computePlanet` — unit test: same id always produces same color; orbit formulas increase with index
- `create` — assigns sequential orbit_index even under concurrent inserts (SQLite serialises writes)
- `/api/servers` — returns `{ games }` shape with correct planet config when DB has data
- Admin forms — game dropdown populated; server create fails gracefully if no games exist yet
