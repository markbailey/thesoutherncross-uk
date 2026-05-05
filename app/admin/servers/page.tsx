import Link from 'next/link';
import { listAll } from '../../../lib/repos/servers';
import { getDb } from '../../../lib/db';
import DeleteServerButton from './DeleteServerButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StatusRow = {
  online: number;
  players: number | null;
};

export default function AdminServersPage() {
  const servers = listAll();
  const db = getDb();

  const statusById = new Map<string, StatusRow>();
  for (const srv of servers) {
    const row = db
      .prepare('SELECT online, players FROM server_status WHERE id = ?')
      .get(srv.id) as StatusRow | undefined;
    if (row) statusById.set(srv.id, row);
  }

  return (
    <>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          gap: 16,
        }}
      >
        <div>
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
            SERVER REGISTRY
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
            GAME SERVERS
            <span
              style={{
                marginLeft: 12,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--ink-faint)',
                fontWeight: 400,
              }}
            >
              [{servers.length}]
            </span>
          </h1>
        </div>

        <Link
          href="/admin/servers/new"
          className="hud-btn"
          style={{ textDecoration: 'none' }}
        >
          + ADD SERVER
        </Link>
      </div>

      {/* Server table */}
      {servers.length === 0 ? (
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            border: '1px solid var(--hair)',
            background: 'rgba(7,6,12,0.5)',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            letterSpacing: '0.16em',
            color: 'var(--ink-faint)',
          }}
        >
          NO SERVERS CONFIGURED — ADD ONE TO BEGIN
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--hair)',
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px 100px 90px 80px auto',
              gap: 0,
              padding: '10px 20px',
              background: 'rgba(0,168,107,0.06)',
              borderBottom: '1px solid var(--hair)',
            }}
          >
            {['NAME', 'HOST:PORT', 'PROTOCOL', 'STATUS', 'HIDDEN', 'ACTIONS'].map((col) => (
              <span
                key={col}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-faint)',
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {servers.map((srv) => {
            const status = statusById.get(srv.id);
            const isOnline = status ? Boolean(status.online) : null;

            return (
              <div
                key={srv.id}
                className="admin-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px 100px 90px 80px auto',
                  gap: 0,
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(0,168,107,0.1)',
                  alignItems: 'center',
                }}
              >
                {/* Name */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 12,
                      color: 'var(--ink)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {srv.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.12em',
                      marginTop: 2,
                    }}
                  >
                    {srv.id}
                  </div>
                </div>

                {/* Host:Port */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {srv.host}
                  <span style={{ color: 'var(--ink-faint)' }}>:</span>
                  {srv.port}
                </div>

                {/* Protocol */}
                <div>
                  {srv.protocol ? (
                    <span
                      className={`pill ${srv.protocol === 'source' ? 'green' : 'purple'}`}
                      style={{ fontSize: 9, letterSpacing: '0.16em' }}
                    >
                      {srv.protocol.toUpperCase()}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</span>
                  )}
                </div>

                {/* Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                  }}
                >
                  {isOnline === null ? (
                    <span style={{ color: 'var(--ink-faint)' }}>—</span>
                  ) : isOnline ? (
                    <>
                      <span className="dot on" />
                      <span style={{ color: 'var(--royal-green-neon)' }}>
                        {status?.players ?? 0}P
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="dot off" />
                      <span style={{ color: 'var(--status-down)' }}>OFFLINE</span>
                    </>
                  )}
                </div>

                {/* Hidden */}
                <div>
                  {srv.hidden ? (
                    <span
                      className="pill warn"
                      style={{ fontSize: 9, letterSpacing: '0.14em' }}
                    >
                      HIDDEN
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        color: 'var(--ink-faint)',
                      }}
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link
                    href={`/admin/servers/${srv.id}`}
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      color: 'var(--ink-dim)',
                      textDecoration: 'none',
                      padding: '4px 10px',
                      border: '1px solid var(--hair)',
                      transition: 'color .12s, border-color .12s',
                    }}
                  >
                    EDIT
                  </Link>

                  <form action={`/api/admin/servers/${srv.id}`} method="POST" style={{ margin: 0 }}>
                    <input type="hidden" name="_method" value="PATCH" />
                    <input type="hidden" name="hidden" value={srv.hidden ? 'false' : 'true'} />
                    <button
                      type="submit"
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        color: srv.hidden ? 'var(--royal-green-neon)' : '#f59e0b',
                        background: 'transparent',
                        border: `1px solid ${srv.hidden ? 'var(--hair)' : 'rgba(245,158,11,0.3)'}`,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'color .12s, border-color .12s',
                      }}
                    >
                      {srv.hidden ? 'SHOW' : 'HIDE'}
                    </button>
                  </form>

                  <DeleteServerButton id={srv.id} name={srv.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .admin-row:last-child { border-bottom: none !important; }
        .admin-row:hover { background: rgba(57,255,136,0.03); }
      `}</style>
    </>
  );
}
