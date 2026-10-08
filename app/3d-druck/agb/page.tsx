import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";

export const metadata = { title: "AGB (Entwurf)" };

// PLATZHALTER: Es stehen bewusst keine Rechtstexte hier. Inhalt liefert Dr. Justus.
export default function AgbPlatzhalter() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Allgemeine Geschäftsbedingungen</h1>
          <p>Hier steht später der Text der AGB für den 3D-Druck-Shop. Diese Seite ist ein Platzhalter.</p>
          <h2 style={{ fontSize: "1.25rem" }}>Vorgesehene Abschnitte</h2>
          <ul>
            <li>Anbieter und Geltungsbereich</li><li>Vertragsschluss (Shop und individuelle Anfrage)</li>
            <li>Preise und Zahlung</li><li>Lieferung und Lieferzeit</li><li>Widerruf</li><li>Gewährleistung</li>
            <li>Haftung</li><li>Texte und Bilder des Kunden</li><li>Schlussbestimmungen</li>
          </ul>
          <p>Impressum und Datenschutzerklärung findest du im Fuß der Seite.</p>
        </article>
      </div>
    </ShopShell>
  );
}
