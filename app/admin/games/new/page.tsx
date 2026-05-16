'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
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
      protocol: data.get('protocol') as string,
    };

    try {
      const res = await fetch('/api/admin/games', {
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

      router.push('/admin/games');
      router.refresh();
    } catch {
      setError('Network error — check connection');
      setSubmitting(false);
    }
  }

  return (
    <>
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
          GAME REGISTRY / NEW
        </div>
        <h1
          className="display"
          style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}
        >
          ADD GAME
        </h1>
      </div>

      <div
        style={{
          maxWidth: 540,
          border: '1px solid var(--hair)',
          background: 'rgba(7,6,12,0.6)',
          padding: '32px',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid var(--hair)',
            paddingBottom: 16,
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--royal-green-neon)',
              boxShadow: '0 0 6px var(--royal-green-neon)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            ENTRY TERMINAL
          </span>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: '#ef4444',
              padding: '10px 14px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.05)',
              marginBottom: 24,
            }}
          >
            ERROR: {error.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* NAME */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="name"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              NAME
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Enshrouded"
              required
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--ink)',
                background: 'rgba(7,6,12,0.8)',
                border: '1px solid var(--hair)',
                padding: '10px 14px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* PROTOCOL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="protocol"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              PROTOCOL
            </label>
            <select
              id="protocol"
              name="protocol"
              defaultValue="source"
              required
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--ink)',
                background: 'rgba(7,6,12,0.8)',
                border: '1px solid var(--hair)',
                padding: '10px 14px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="source">SOURCE (Enshrouded, CS2, TF2, Valheim...)</option>
              <option value="minecraft">MINECRAFT</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 8,
              paddingTop: 20,
              borderTop: '1px solid var(--hair)',
            }}
          >
            <button
              type="submit"
              disabled={submitting}
              className="hud-btn"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? 'SAVING...' : '+ CREATE GAME'}
            </button>
            <a
              href="/admin/games"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
                textDecoration: 'none',
                padding: '8px 14px',
                border: '1px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color .12s',
              }}
            >
              CANCEL
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
