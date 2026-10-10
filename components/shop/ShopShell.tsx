import Link from "next/link";
import Image from "next/image";
import { KONTAKT_MIT_ANSCHRIFT } from "@/lib/shop/config";
import WarenkorbLink from "./WarenkorbLink";
import HalloweenHintergrund from "./HalloweenHintergrund";

// Shell: Kopf (Zurück-Link: Shop-Startseite → PixlDrop, alle anderen Seiten → Shop), Inhalt, Fuß. Theme ("halloween") per data-theme am Wrapper (Token-Austausch).
export default function ShopShell({
  children, theme, banner, zurueck = "shop",
}: { children: React.ReactNode; theme?: "halloween"; banner?: React.ReactNode; zurueck?: "shop" | "pixldrop" }) {
  return (
    <div className="shop" data-theme={theme}>
      {theme === "halloween" && <HalloweenHintergrund />}
      <a className="shop-skip" href="#inhalt">Zum Inhalt springen</a>
      {banner}
      <div className="shop-wrap">
        <header className="shop-head">
          {zurueck === "pixldrop" ? <a href="/">← PixlDrop</a> : <Link href="/3d-druck#stuecke">← 3D-Druck-Shop</Link>}
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
            <ul className="shop-foot-links">
              <li><a href="/impressum">Impressum</a></li>
              <li><a href="/datenschutz">Datenschutz</a></li>
              <li><Link href="/3d-druck/agb">AGB</Link></li>
              <li className="shop-foot-mitte"><Link className="shop-widerruf-btn" href="/3d-druck/widerruf#widerrufsfunktion">Vertrag widerrufen</Link></li>
              <li><Link href="/3d-druck/widerruf">Widerrufsbelehrung</Link></li>
              <li><Link href="/3d-druck/versand-zahlung">Versand &amp; Zahlung</Link></li>
              <li><Link href="/3d-druck/anfrage">Individueller Druck</Link></li>
            </ul>
          </nav>
          <section className="shop-kontakt" aria-labelledby="shop-kontakt-h">
            <Image className="shop-kontakt-logo" src="/shop/sitekx-logo.png" alt="SitekX" width={400} height={156} />
            <h2 id="shop-kontakt-h">Hersteller und Verkäufer / Kontakt</h2>
            <p>
              Alexander Sitek
              {KONTAKT_MIT_ANSCHRIFT ? (
                <><br />Richard-Strauss-Straße 4<br />86663 Asbach-Bäumenheim</>
              ) : (
                <><br />Anschrift siehe Impressum</>
              )}
            </p>
            <p><a href="mailto:as@sitekx.de">as@sitekx.de</a> · <a href="/impressum">Impressum</a></p>
          </section>
        </footer>
      </div>
    </div>
  );
}
