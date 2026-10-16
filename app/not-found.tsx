import Link from "next/link";
import "./3d-druck/shop.css";
import { fontVariablen } from "./3d-druck/fonts";
import EddieSchnitt from "@/components/shop/EddieSchnitt";

export const metadata = { title: "Nicht gefunden — PixlDrop", robots: { index: false, follow: false } };

// Root-404 (Seiten außerhalb des Shops): gleicher Look wie die Shop-404, Rücklink zur Startseite.
export default function NichtGefunden() {
  return (
    <div className={fontVariablen}>
      <div className="shop">
        <main id="inhalt">
          <div className="shop-wrap">
            <div className="shop-empty" role="status">
              <EddieSchnitt className="shop-eddie-mini" />
              <h1 style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)" }}>Hier ist&rsquo;s so leer wie Eddies Tasse um 7:55.</h1>
              <p>Diese Seite gibt es nicht (mehr).</p>
              <Link className="shop-btn" href="/">Zur Startseite</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
