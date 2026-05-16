'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type GameOption = { id: string; name: string };

export default function NewServerForm({ games }: { games: GameOption[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const body = {
      name: data.get('name') as string,
      host: data.get('host') as string,
      port: Number(data.get('port')),
      game_id: data.get('game_id') as string,
    };

    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? 'Request failed');
        setSubmitting(false);
        return;
      }

      router.push('/admin/servers');
      router.refresh();
    } catch {
      setError('Network error — check connection');
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 12,
    letterSpacing: '0.08em',
    color: 'var(--ink)',
    background: 'rgba(7,6,12,0.8)',
    border: '1px solid var(--hair)',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '0.24em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-faint)',
  };

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>SERVER REGISTRY / NEW</div>
        <h1 className="display" style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}>
          ADD SERVER
        </h1>
      </div>

      <div style={{ maxWidth: 540, border: '1px solid var(--hair)', background: 'rgba(7,6,12,0.6)', padding: '32px' }}>
        <div style={{ borderBottom: '1px solid var(--hair)', paddingBottom: 16, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--royal-green-neon)', boxShadow: '0 0 6px var(--royal-green-neon)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>ENTRY TERMINAL</span>
        </div>

        {error && (
          <div role="alert" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: '#ef4444', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', marginBottom: 24 }}>
            ERROR: {error.toUpperCase()}
          </div>
        )}

        {games.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f59e0b', letterSpacing: '0.12em', padding: '10px 14px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', marginBottom: 24 }}>
            NO GAMES CONFIGURED —{' '}
            <a href="/admin/games/new" style={{ color: 'var(--royal-green-neon)', textDecoration: 'none' }}>
              ADD A GAME FIRST
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="name" style={labelStyle}>NAME</label>
            <input id="name" name="name" type="text" placeholder="e.g. Tactical Server 01" required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="host" style={labelStyle}>HOST</label>
            <input id="host" name="host" type="text" placeholder="e.g. 192.168.1.100" required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="port" style={labelStyle}>PORT</label>
            <input id="port" name="port" type="number" defaultValue="27015" min={1} max={65535} required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="game_id" style={labelStyle}>GAME</label>
            <select
              id="game_id"
              name="game_id"
              required
              disabled={games.length === 0}
              style={{ ...fieldStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {games.length === 0
                ? <option value="">— no games —</option>
                : games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
              }
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--hair)' }}>
            <button type="submit" disabled={submitting || games.length === 0} className="hud-btn" style={{ opacity: submitting || games.length === 0 ? 0.5 : 1 }}>
              {submitting ? 'SAVING...' : '+ CREATE SERVER'}
            </button>
            <a href="/admin/servers" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textDecoration: 'none', padding: '8px 14px', border: '1px solid transparent', display: 'inline-flex', alignItems: 'center' }}>
              CANCEL
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
