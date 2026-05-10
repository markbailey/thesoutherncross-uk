import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getSessionOptions, type SessionData } from '../../lib/auth/session';
import { isAdmin } from '../../lib/auth/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());

  if (!session.steamid || !isAdmin(session.steamid)) {
    redirect('/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--space)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Admin top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          background: 'rgba(7,6,12,0.92)',
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          borderBottom: '1px solid rgba(57,255,136,0.25)',
          gap: 20,
        }}
      >
        {/* Back link */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color .12s',
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>◂</span>
          BACK
        </Link>

        {/* Vertical divider */}
        <span
          style={{
            width: 1,
            height: 24,
            background: 'var(--hair)',
          }}
        />

        {/* Console label */}
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--royal-green-neon)',
            textShadow: '0 0 10px rgba(57,255,136,0.5)',
          }}
        >
          ADMIN CONSOLE
        </span>

        {/* Status indicator */}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--ink-dim)',
          }}
        >
          <span className="dot on" />
          AUTHORIZED
        </span>
      </header>

      {/* Admin sub-nav */}
      <nav
        aria-label="Admin navigation"
        style={{
          borderBottom: '1px solid var(--hair)',
          background: 'rgba(7,6,12,0.6)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <Link
          href="/admin/games"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
            textDecoration: 'none',
            padding: '12px 16px',
            borderBottom: '2px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color .12s',
          }}
        >
          <span style={{ fontSize: 9, opacity: 0.7 }}>▸</span>
          GAMES
        </Link>
        <Link
          href="/admin/servers"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'var(--ink-dim)',
            textDecoration: 'none',
            padding: '12px 16px',
            borderBottom: '2px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color .12s',
          }}
        >
          <span style={{ fontSize: 9, opacity: 0.7 }}>▸</span>
          SERVERS
        </Link>
      </nav>

      {/* Page content */}
      <main
        style={{
          flex: 1,
          padding: '32px',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

      <style>{`
        .admin-back-link:hover { color: var(--ink) !important; }
      `}</style>
    </div>
  );
}
