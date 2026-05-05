'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewServerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      name: data.get('name') as string,
      host: data.get('host') as string,
      port: Number(data.get('port')),
      protocol: data.get('protocol') as string,
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
          SERVER REGISTRY / NEW
        </div>
        <h1
          className="display"
          style={{
            margin: 0,
            fontSize: 18,
            letterSpacing: '0.18em',
            color: 'var(--ink)',
          }}
        >
          ADD SERVER
        </h1>
      </div>

      {/* Terminal form panel */}
      <div
        style={{
          maxWidth: 540,
          border: '1px solid var(--hair)',
          background: 'rgba(7,6,12,0.6)',
          padding: '32px',
        }}
      >
        {/* Panel header */}
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
          <TermField
            id="name"
            name="name"
            label="NAME"
            type="text"
            placeholder="e.g. Tactical Server 01"
            required
          />

          {/* HOST */}
          <TermField
            id="host"
            name="host"
            label="HOST"
            type="text"
            placeholder="e.g. 192.168.1.100"
            required
          />

          {/* PORT */}
          <TermField
            id="port"
            name="port"
            label="PORT"
            type="number"
            defaultValue="27015"
            min={1}
            max={65535}
            required
          />

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
              <option value="source">SOURCE</option>
              <option value="minecraft">MINECRAFT</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--hair)' }}>
            <button
              type="submit"
              disabled={submitting}
              className="hud-btn"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? 'SAVING...' : '+ CREATE SERVER'}
            </button>
            <a
              href="/admin/servers"
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

type TermFieldProps = {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
};

function TermField({ id, name, label, type, placeholder, required, defaultValue, min, max }: TermFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
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
  );
}
