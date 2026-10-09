import Link from "next/link";
import WarenkorbLink from "./WarenkorbLink";

// Shell: Kopf, Inhalt, Fuß. Theme ("halloween") per data-theme am Wrapper (Token-Austausch).
export default function ShopShell({
  children, theme, banner,
}: { children: React.ReactNode; theme?: "halloween"; banner?: React.ReactNode }) {
  return (
    <div className="shop" data-theme={theme}>
      <a className="shop-skip" href="#inhalt">Zum Inhalt springen</a>
      {banner}
      <div className="shop-wrap">
        <header className="shop-head">
          <a href="/">← PixlDrop</a>
          <span className="shop-head-r">
            <Link className="shop-widerruf-btn" href="/3d-druck/widerruf#widerrufsfunktion">Vertrag widerrufen</Link>
            <WarenkorbLink />
          </span>
        </header>
      </div>
      <main id="inhalt" tabIndex={-1} style={{ outline: "none" }}>{children}</main>
      <div className="shop-wrap">
        <footer className="shop-foot">
          <nav aria-label="Rechtliches und Service">
            <ul>
              <li><a href="/impressum">Impressum</a></li>
              <li><a href="/datenschutz">Datenschutz</a></li>
              <li><Link href="/3d-druck/agb">AGB</Link></li>
              <li><Link href="/3d-druck/widerruf">Widerrufsbelehrung</Link></li>
              <li><Link className="shop-widerruf-btn" href="/3d-druck/widerruf#widerrufsfunktion">Vertrag widerrufen</Link></li>
              <li><Link href="/3d-druck/versand-zahlung">Versand &amp; Zahlung</Link></li>
              <li><Link href="/3d-druck/anfrage">Individueller Druck</Link></li>
            </ul>
          </nav>
          <p className="shop-foot-kontakt">
            Hersteller und Verkäufer: Alexander Sitek · <a href="mailto:as@sitekx.de">as@sitekx.de</a> · Anschrift siehe <a href="/impressum">Impressum</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
