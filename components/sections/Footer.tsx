import { VERSION } from '../../config/site';

export function Footer() {
  return (
    <footer className="site-foot">
      <span>THESOUTHERNCROSS.UK · v{VERSION}</span>
      <span className="credit">
        CREATED BY <b>MARK BAILEY</b>
      </span>
    </footer>
  );
}

export default Footer;
