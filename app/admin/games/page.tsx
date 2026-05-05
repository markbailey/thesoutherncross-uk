import Link from 'next/link';
import { listAllGames, computePlanet } from '../../../lib/repos/games';
import { getDb } from '../../../lib/db';
import DeleteGameButton from './DeleteGameButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminGamesPage() {
  const games = listAllGames();
  const db = getDb();

  const serverCountById = new Map<string, number>();
  for (const g of games) {
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM servers WHERE game_id = ?')
      .get(g.id) as { n: number };
    serverCountById.set(g.id, row.n);
  }

  return (
    <>
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
            GAME REGISTRY
          </div>
          <h1
            className="display"
            style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}
          >
            GAMES
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
              [{games.length}]
            </span>
          </h1>
        </div>
        <Link href="/admin/games/new" className="hud-btn" style={{ textDecoration: 'none' }}>
          + ADD GAME
        </Link>
      </div>

      {games.length === 0 ? (
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
          NO GAMES CONFIGURED — ADD ONE TO BEGIN
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hair)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 80px 100px auto',
              gap: 0,
              padding: '10px 20px',
              background: 'rgba(0,168,107,0.06)',
              borderBottom: '1px solid var(--hair)',
            }}
          >
            {['NAME', 'PROTOCOL', 'ORBIT', 'SERVERS', 'ACTIONS'].map((col) => (
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

          {games.map((g) => {
            const planet = computePlanet(g);
            const serverCount = serverCountById.get(g.id) ?? 0;
            return (
              <div
                key={g.id}
                className="admin-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 80px 100px auto',
                  gap: 0,
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(0,168,107,0.1)',
                  alignItems: 'center',
                }}
              >
                {/* Name + color swatch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: planet.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${planet.color}`,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--ink)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {g.name}
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
                      {g.id}
                    </div>
                  </div>
                </div>

                {/* Protocol */}
                <div>
                  <span
                    className={`pill ${g.protocol === 'source' ? 'green' : 'purple'}`}
                    style={{ fontSize: 9, letterSpacing: '0.16em' }}
                  >
                    {g.protocol.toUpperCase()}
                  </span>
                </div>

                {/* Orbit */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {g.orbit_index}
                </div>

                {/* Server count */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: serverCount > 0 ? 'var(--royal-green-neon)' : 'var(--ink-faint)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {serverCount}
                </div>

                {/* Actions */}
                <div>
                  <DeleteGameButton id={g.id} name={g.name} hasServers={serverCount > 0} />
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
