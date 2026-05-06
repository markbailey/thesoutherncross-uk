'use client';

export default function DeleteServerButton({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Delete server "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/admin/servers';
      } else {
        const j = await res.json().catch(() => ({}));
        alert((j as { error?: string }).error ?? 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
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
