import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";

export const metadata = { title: "Versand & Zahlung (Entwurf)" };

// PLATZHALTER: Es stehen bewusst keine Rechtstexte oder Preise hier. Inhalt liefert Dr. Justus, Werte Alex.
export default function VersandPlatzhalter() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Versand &amp; Zahlung</h1>
          <p>Hier stehen später Versandkosten, Lieferzeit und Zahlungsarten. Diese Seite ist ein Platzhalter.</p>
          <h2 style={{ fontSize: "1.25rem" }}>Vorgesehene Abschnitte</h2>
          <ul>
            <li>Lieferung (nur innerhalb Deutschlands)</li><li>Versandkosten</li><li>Lieferzeit</li><li>Zahlungsarten</li>
          </ul>
        </article>
      </div>
    </ShopShell>
  );
}
