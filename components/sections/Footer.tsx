import { GUILD } from '../../config/guild';
import { BUILD_SHA, BUILD_DATE } from '../../config/site';

function formatBuildDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'dev';
    return d.toISOString().slice(0, 10);
  } catch {
    return 'dev';
  }
}

export function Footer() {
  const date = formatBuildDate(BUILD_DATE);
  return (
    <footer
      className="site-foot"
      style={{
        padding: '36px 32px 40px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space-deep)',
        textAlign: 'center',
      }}
    >
      <div
        className="eyebrow"
        style={{ color: 'var(--ink-dim)', fontSize: 10, letterSpacing: '0.22em' }}
      >
        {GUILD.footer.coords} · {GUILD.name.toUpperCase()} · EST. {GUILD.established}
      </div>
      <div
        className="eyebrow"
        style={{ color: 'var(--ink-faint)', fontSize: 9, letterSpacing: '0.22em', marginTop: 8 }}
      >
        BUILD {BUILD_SHA} · {date}
      </div>
    </footer>
  );
}

export default Footer;
