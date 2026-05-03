import { VERSION } from '../../config/site';

export function Footer() {
  return (
    <footer
      className="site-foot"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        padding: '22px 32px',
        borderTop: '1px solid var(--hair)',
        background: 'rgba(7, 6, 12, 0.75)',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color: 'var(--ink-faint)',
      }}
    >
      <span>THESOUTHERNCROSS.UK · v{VERSION}</span>
      <span className="credit" style={{ color: 'var(--ink-dim)' }}>
        CREATED BY{' '}
        <b style={{ color: 'var(--royal-green-neon)', fontWeight: 500, letterSpacing: '0.2em' }}>
          MARK BAILEY
        </b>
      </span>
    </footer>
  );
}

export default Footer;
