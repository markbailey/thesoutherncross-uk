'use client';

import { useState } from 'react';

export default function HideToggleButton({ id, hidden }: { id: string; hidden: boolean }) {
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(hidden);

  async function handleToggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/servers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !current }),
      });
      if (res.ok) {
        setCurrent((v) => !v);
      } else {
        const j = await res.json().catch(() => ({}));
        alert((j as { error?: string }).error ?? 'Update failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: current ? 'var(--royal-green-neon)' : '#f59e0b',
        background: 'transparent',
        border: `1px solid ${current ? 'var(--hair)' : 'rgba(245,158,11,0.3)'}`,
        padding: '4px 10px',
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.5 : 1,
        transition: 'color .12s, border-color .12s',
      }}
    >
      {current ? 'SHOW' : 'HIDE'}
    </button>
  );
}
