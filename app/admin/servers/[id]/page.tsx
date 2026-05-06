'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

type ServerData = {
  id: string;
  name: string;
  host: string;
  port: number;
  game_id: string | null;
  hidden: boolean;
};

export default function EditServerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [server, setServer] = useState<ServerData | null>(null);
  const [games, setGames] = useState<{ id: string; name: string }[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/servers/${id}/data`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data) {
          const s = data as ServerData;
          setServer(s);
          setSelectedGameId(s.game_id ?? '');
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load server');
        setLoading(false);
      });

    fetch('/api/admin/games')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setGames((d as { games: { id: string; name: string }[] }).games ?? []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load games');
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!server) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      name: data.get('name') as string,
      host: data.get('host') as string,
      port: Number(data.get('port')),
      game_id: data.get('game_id') as string,
    };

    try {
      const res = await fetch(`/api/admin/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? 'Request failed');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  }

  async function handleToggleHidden() {
    if (!server) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/servers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !server.hidden }),
      });

      if (!res.ok) {
        setError('Failed to update visibility');
        setSubmitting(false);
        return;
      }

      setServer((prev) => prev ? { ...prev, hidden: !prev.hidden } : prev);
      setSubmitting(false);
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!server) return;
    if (!confirm(`Delete server "${server.name}"? This cannot be undone.`)) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/servers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Delete failed');
        setSubmitting(false);
        return;
      }
      router.push('/admin/servers');
      router.refresh();
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}>
        LOADING...
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#ef4444', letterSpacing: '0.16em' }}>
        SERVER NOT FOUND
      </div>
    );
  }

  if (!server) return null;

  return (
    <>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            marginBottom: 6,
          }}
        >
          SERVER REGISTRY / {server.id}
        </div>
        <h1
          className="display"
          style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}
        >
          EDIT SERVER
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        {/* Edit form */}
        <div
          style={{
            border: '1px solid var(--hair)',
            background: 'rgba(7,6,12,0.6)',
            padding: '28px',
          }}
        >
          <div
            style={{
              borderBottom: '1px solid var(--hair)',
              paddingBottom: 14,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--royal-green-neon)',
                boxShadow: '0 0 6px var(--royal-green-neon)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
              CONFIGURATION
            </span>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em',
                color: '#ef4444', padding: '10px 14px',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.05)', marginBottom: 20,
              }}
            >
              ERROR: {error.toUpperCase()}
            </div>
          )}

          {success && (
            <div
              role="status"
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em',
                color: 'var(--royal-green-neon)', padding: '10px 14px',
                border: '1px solid rgba(57,255,136,0.3)',
                background: 'rgba(57,255,136,0.05)', marginBottom: 20,
              }}
            >
              SAVED SUCCESSFULLY
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <EditField id="name" name="name" label="NAME" type="text" defaultValue={server.name} required />
            <EditField id="host" name="host" label="HOST" type="text" defaultValue={server.host} required />
            <EditField id="port" name="port" label="PORT" type="number" defaultValue={String(server.port)} min={1} max={65535} required />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="game_id" style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                GAME
              </label>
              <select
                id="game_id"
                name="game_id"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                required
                style={{
                  fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.08em',
                  color: 'var(--ink)', background: 'rgba(7,6,12,0.8)',
                  border: '1px solid var(--hair)', padding: '10px 14px',
                  outline: 'none', cursor: 'pointer',
                  appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--hair)' }}>
              <button type="submit" disabled={submitting} className="hud-btn" style={{ opacity: submitting ? 0.5 : 1 }}>
                {submitting ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger zone */}
        <div
          style={{
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(7,6,12,0.6)',
            padding: '28px',
          }}
        >
          <div
            style={{
              borderBottom: '1px solid rgba(239,68,68,0.2)',
              paddingBottom: 14,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.7)' }}>
              DANGER ZONE
            </span>
          </div>

          {/* Visibility toggle */}
          <div
            style={{
              padding: '16px',
              border: '1px solid rgba(245,158,11,0.2)',
              background: 'rgba(245,158,11,0.03)',
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink)', marginBottom: 6 }}>
              {server.hidden ? 'SERVER IS HIDDEN' : 'SERVER IS VISIBLE'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 14 }}>
              {server.hidden
                ? 'Hidden servers are excluded from the public server list.'
                : 'Server is currently visible in the public server list.'}
            </div>
            <button
              onClick={handleToggleHidden}
              disabled={submitting}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: server.hidden ? 'var(--royal-green-neon)' : '#f59e0b',
                background: 'transparent',
                border: `1px solid ${server.hidden ? 'var(--hair)' : 'rgba(245,158,11,0.3)'}`,
                padding: '8px 14px',
                cursor: 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              {server.hidden ? 'MAKE VISIBLE' : 'HIDE SERVER'}
            </button>
          </div>

          {/* Delete */}
          <div
            style={{
              padding: '16px',
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.03)',
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink)', marginBottom: 6 }}>
              DELETE SERVER
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-faint)', marginBottom: 14 }}>
              Permanently removes server and all associated status history. Irreversible.
            </div>
            <button
              onClick={handleDelete}
              disabled={submitting}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#ef4444',
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.4)',
                padding: '8px 14px',
                cursor: 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              DELETE SERVER
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type EditFieldProps = {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number';
  defaultValue?: string;
  required?: boolean;
  min?: number;
  max?: number;
};

function EditField({ id, name, label, type, defaultValue, required, min, max }: EditFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        style={{
          fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.08em',
          color: 'var(--ink)', background: 'rgba(7,6,12,0.8)',
          border: '1px solid var(--hair)', padding: '10px 14px',
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
