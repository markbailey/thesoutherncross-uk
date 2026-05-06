'use client';

export default function DeleteGameButton({
  id,
  name,
  hasServers,
}: {
  id: string;
  name: string;
  hasServers: boolean;
}) {
  async function handleDelete() {
    if (!confirm(`Delete game "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/admin/games';
      } else {
        const j = await res.json().catch(() => ({}));
        alert((j as { error?: string }).error ?? 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
  }

  if (hasServers) {
    return (
      <span
        title="Reassign or delete servers first"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--ink-faint)',
          padding: '4px 10px',
          border: '1px solid var(--hair)',
          opacity: 0.4,
          cursor: 'not-allowed',
        }}
      >
        DEL
      </span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: '#ef4444',
        background: 'transparent',
        border: '1px solid rgba(239,68,68,0.3)',
        padding: '4px 10px',
        cursor: 'pointer',
        transition: 'color .12s, border-color .12s',
      }}
    >
      DEL
    </button>
  );
}
