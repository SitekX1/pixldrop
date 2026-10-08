import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt, T } from "@/components/shop/RechtText";

export const metadata = { title: "Widerrufsbelehrung (Entwurf)" };

// ENTWURF (recht-texte/widerrufsbelehrung-struktur.md, Variante B, 2026-10-08).
// Der amtliche Wortlaut (Anlage 1/2 zum EGBGB) ist NOCH NICHT eingefügt und darf nicht
// aus dem Gedächtnis ergänzt werden: Copy & Paste von
//   https://www.gesetze-im-internet.de/bgbeg/art_253anlage_1.html (Belehrung)
//   https://www.gesetze-im-internet.de/bgbeg/art_253anlage_2.html (Formular)
// Widerrufsfunktion § 356a BGB: nur Platzhalter-Hinweis, Umsetzung offen (Ben/Pia, Anwendungszeitpunkt prüfen).
export default function Widerruf() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Widerrufsbelehrung</h1>
          <p className="muted">Entwurf, noch nicht rechtsverbindlich.</p>

          <Abschnitt titel="A. Widerrufsbelehrung (Standardartikel aus dem Shop)">
            <div className="shop-marker" role="note">
              <strong>NOCH NICHT WÖRTLICH EINGEFÜGT</strong>
              <span>Hier folgt der amtliche Wortlaut des Musters für die Widerrufsbelehrung (Anlage 1 zum EGBGB), Variante Kaufvertrag über Waren. Er wird unverändert aus dem Gesetzestext übernommen, nicht umformuliert.</span>
              <span><T>Unternehmer: Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail: as@sitekx.de. Telefon: [PLATZHALTER nur falls vorhanden]</T></span>
            </div>
            <p>Für Standardartikel, bei denen du nur Farbe oder Variante aus meinem Sortiment wählst, gilt das gesetzliche Widerrufsrecht von 14 Tagen.</p>
          </Abschnitt>

          <Abschnitt titel="B. Kein Widerrufsrecht bei individuell angefertigten Waren (nur Angebote nach AGB Ziffer 10)">
            <p><strong>Kein Widerrufsrecht bei individuell angefertigten Waren.</strong> Das Widerrufsrecht besteht nicht bei Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch dich maßgeblich ist oder die eindeutig auf deine persönlichen Bedürfnisse zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB). Das gilt für Stücke, die ich nach deinem Angebot mit deinem Wunschtext, Namen, Bild oder nach deinen Vorgaben anfertige. Bei allen anderen Artikeln im Shop besteht das Widerrufsrecht wie oben beschrieben.</p>
            <p>Solche Stücke gibt es nicht im Warenkorb, sondern nur über „Individueller Druck“ (Preis nach Anfrage). Auf den Ausschluss weise ich im Angebot vor deiner Annahme ausdrücklich hin.</p>
          </Abschnitt>

          <Abschnitt titel="C. Muster-Widerrufsformular">
            <div className="shop-marker" role="note">
              <strong>NOCH NICHT WÖRTLICH EINGEFÜGT</strong>
              <span>Hier folgt das amtliche Muster-Widerrufsformular (Anlage 2 zum EGBGB) als kopierbarer Block. Empfänger: Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, as@sitekx.de.</span>
            </div>
          </Abschnitt>

          <Abschnitt titel="D. Widerrufsfunktion (§ 356a BGB)">
            <div className="shop-marker" role="note">
              <strong>PLATZHALTER, NOCH NICHT UMGESETZT</strong>
              <span>Hier soll später die elektronische Widerrufsfunktion („Vertrag widerrufen“, Eingabe zu Bestellnummer und E-Mail, Bestätigung, Eingangsbestätigung per E-Mail) stehen. Umsetzung und Anwendungszeitpunkt sind noch zu klären.</span>
            </div>
            <p>Bis dahin kannst du den Widerruf per E-Mail an as@sitekx.de erklären.</p>
          </Abschnitt>
        </article>
      </div>
    </ShopShell>
  );
}
