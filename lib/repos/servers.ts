import { getDb } from '../db.js';
import type { Protocol, ServerConfig } from '../types/servers.js';

export type ServerRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
  hidden: number;
  created_at: number;
  updated_at: number;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(name: string): string {
  const db = getDb();
  const base = slugify(name);
  const existing = db
    .prepare(`SELECT id FROM servers WHERE id = ? OR id LIKE ?`)
    .all(base, `${base}-%`) as { id: string }[];

  if (existing.length === 0) return base;

  const ids = new Set(existing.map((r) => r.id));
  if (!ids.has(base)) return base;

  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function listAll(): ServerRow[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM servers ORDER BY created_at ASC`).all() as ServerRow[];
}

export function listEnabled(): ServerRow[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM servers WHERE hidden = 0 ORDER BY created_at ASC`)
    .all() as ServerRow[];
}

export function getById(id: string): ServerRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM servers WHERE id = ?`).get(id) as ServerRow | undefined;
}

export function createServer(input: {
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
}): string {
  const db = getDb();
  const id = generateId(input.name);
  const now = Date.now();
  db.prepare(
    `INSERT INTO servers (id, name, host, port, protocol, hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, input.name, input.host, input.port, input.protocol, now, now);
  return id;
}

export function updateServer(
  id: string,
  patch: Partial<Pick<ServerConfig, 'name' | 'host' | 'port' | 'protocol'>>,
): void {
  const db = getDb();
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length === 0) return;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => patch[f]);
  values.push(Date.now() as never);

  db.prepare(`UPDATE servers SET ${setClauses}, updated_at = ? WHERE id = ?`).run(
    ...values,
    id,
  );
}

export function setHidden(id: string, hidden: boolean): void {
  const db = getDb();
  db.prepare(`UPDATE servers SET hidden = ?, updated_at = ? WHERE id = ?`).run(
    hidden ? 1 : 0,
    Date.now(),
    id,
  );
}

export function deleteServer(id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM status_history WHERE server_id = ?`).run(id);
  db.prepare(`DELETE FROM server_status WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM servers WHERE id = ?`).run(id);
}
