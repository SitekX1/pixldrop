import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt } from "@/components/shop/RechtText";

export const metadata = { title: "Versand & Zahlung (Entwurf)" };

// ENTWURF (recht-texte/versand-und-zahlung.md, Variante B, 2026-10-08). Werte (Kosten, Lieferzeit) liefert Alex.
export default function Versand() {
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Versand &amp; Zahlung</h1>
          <p className="muted">Entwurf, noch nicht rechtsverbindlich. Gelb markierte Stellen sind noch offen.</p>
          <Abschnitt titel="Lieferung" absaetze={[
            "Ich liefere **nur innerhalb Deutschlands** an die Adresse, die du bei der Bestellung angibst. [PLATZHALTER: Packstation/Postfach möglich ja/nein; Inseln/Sonderfälle]",
          ]} />
          <Abschnitt titel="Versandarten und Kosten" absaetze={[
            "Versandart: [PLATZHALTER z. B. Deutsche Post Päckchen/Warenpost oder DHL Paket] · Kosten: [PLATZHALTER €] · Sendungsverfolgung: [PLATZHALTER ja/nein]",
            "Die Versandkosten werden vor dem Bestellbutton auf der Übersichtsseite angezeigt. Versandkostenfrei ab einem Bestellwert von [PLATZHALTER ja/nein, Betrag].",
          ]} />
          <Abschnitt titel="Lieferzeit" absaetze={[
            "**[PLATZHALTER z. B. 3 bis 5 Werktage Fertigung + 1 bis 3 Werktage Versand]** ab Vertragsschluss (Bestellbestätigung). Bei Individuellem nach Anfrage steht die Frist im Angebot.",
          ]} />
          <Abschnitt titel="Zahlung" absaetze={[
            "**PayPal, sofort bei Bestellung** (Vorkasse). Nach „Zahlungspflichtig bestellen“ wirst du direkt zu PayPal weitergeleitet. Der Kaufvertrag kommt mit meiner **Bestellbestätigung per E-Mail** nach erfolgter Zahlung zustande. PayPal bietet je nach Verfügbarkeit weitere Optionen (z. B. Lastschrift, Karte) an; es gelten PayPals Bedingungen. [PLATZHALTER: PayPal-Geschäftskonto folgt, Wortlaut danach abgleichen]",
            "Wird die Zahlung bei PayPal nicht abgeschlossen, kommt kein Vertrag zustande. Ist ein Artikel trotz Zahlung nicht lieferbar (z. B. Farbe nicht mehr vorrätig), lehne ich die Bestellung ab und erstatte den Betrag unverzüglich über PayPal.",
            "**Individuelles (Wunschtext, Namen, Bilder, Sonderanfertigung): Preis nach Anfrage.** Du schickst eine unverbindliche Anfrage, ich sende ein Angebot per E-Mail. Nach Annahme zahlst du per PayPal (Zahlungslink) **innerhalb von [PLATZHALTER 7] Tagen**; gedruckt wird nach Zahlungseingang.",
            "Es entstehen für dich keine Zusatzgebühren für die Zahlung.",
            "Preise: Endpreise, **ohne Umsatzsteuerausweis gemäß § 19 UStG** (Kleinunternehmer).",
            "Rückerstattungen (z. B. nach Widerruf) laufen über dasselbe Zahlungsmittel.",
          ]} />
          <Abschnitt titel="Transportschäden und Gefahrübergang" absaetze={[
            "Bei Versand an Verbraucher trage **ich** das Transportrisiko: Die Gefahr geht erst mit **Übergabe an dich** über (§ 475 Abs. 2 BGB). Ist ein Paket beschädigt angekommen, melde dich bitte schnell unter as@sitekx.de, am besten mit Fotos von Paket und Ware. Das ist eine Bitte, keine Voraussetzung: Deine Rechte gehen dadurch nicht verloren.",
          ]} />
          <Abschnitt titel="Zustellprobleme" absaetze={[
            "Kann das Paket nicht zugestellt werden (falsche Adresse, nicht abgeholt), melde ich mich per E-Mail. Entstehen durch falsche Angaben von dir zusätzliche Kosten, kann ich sie dir berechnen, soweit gesetzlich zulässig.",
          ]} />
          <Abschnitt titel="Verpackung" absaetze={[
            "[PLATZHALTER: Versandkarton/Füllmaterial; Hinweis zur Verpackungsregistrierung erst, wenn LUCID/Systembeteiligung erledigt ist.]",
          ]} />
        </article>
      </div>
    </ShopShell>
  );
}
