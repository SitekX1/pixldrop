import ShopShell from "@/components/shop/ShopShell";
import EntwurfBanner from "@/components/shop/EntwurfBanner";
import { Abschnitt } from "@/components/shop/RechtText";
import { ENTWURF_MODUS, entwurfTitel, VERSAND_CENT, formatPreis } from "@/lib/shop/config";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

export const dynamic = "force-dynamic"; // Lieferzeit kommt aus den Shop-Einstellungen
export const metadata = { title: entwurfTitel("Versand & Zahlung") };

// recht-texte/versand-und-zahlung.md, Variante B, Stand 2026-10-09. Kosten und Lieferzeit kommen aus lib/shop/config.ts.
export default async function Versand() {
  const { lieferzeit: LIEFERZEIT_TEXT } = await holeEinstellungen();
  const versand = VERSAND_CENT != null ? `**${formatPreis(VERSAND_CENT)}** je Bestellung` : "wie auf der Übersichtsseite angezeigt";
  const lieferzeit = LIEFERZEIT_TEXT ? `**${LIEFERZEIT_TEXT}** ab Vertragsschluss (Bestellbestätigung).` : "Die Lieferzeit steht bei jedem Artikel und auf der Übersichtsseite; sie läuft ab Vertragsschluss (Bestellbestätigung).";
  return (
    <ShopShell banner={<EntwurfBanner />}>
      <div className="shop-wrap" style={{ maxWidth: 720 }}>
        <article className="shop-legal">
          <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)" }}>Versand &amp; Zahlung</h1>
          {ENTWURF_MODUS && <p className="muted">Entwurf, noch nicht rechtsverbindlich.</p>}
          <Abschnitt titel="Lieferung" absaetze={[
            "Ich liefere **nur innerhalb Deutschlands** an die Adresse, die du bei der Bestellung angibst. Eine Lieferung an Packstationen, Postfächer und Paketshops ist nicht möglich; bitte gib eine Straßenanschrift an, an der du das Paket annehmen kannst. Deutsche Inseln werden ohne Aufpreis beliefert.",
          ]} />
          <Abschnitt titel="Versandarten und Kosten" absaetze={[
            `Versandart: Paket oder Päckchen mit DHL, **mit Sendungsverfolgung** · Kosten: ${versand} (Deutschland; Versandstufen nach Größe und Gewicht können folgen, maßgeblich ist der vor der Bestellung angezeigte Betrag). Sobald die Sendung übergeben ist, schicke ich dir die Sendungsnummer per E-Mail.`,
            "Die Versandkosten werden vor dem Bestellbutton auf der Übersichtsseite angezeigt. Eine versandkostenfreie Lieferung gibt es nicht.",
          ]} />
          <Abschnitt titel="Lieferzeit" absaetze={[
            `${lieferzeit} Bei Individuellem nach Anfrage steht die Frist im Angebot.`,
          ]} />
          <Abschnitt titel="Zahlung" absaetze={[
            "**PayPal, sofort bei Bestellung** (Vorkasse). Nach „Zahlungspflichtig bestellen“ wirst du direkt zu PayPal weitergeleitet. Der Kaufvertrag kommt mit meiner **Bestellbestätigung per E-Mail** nach erfolgter Zahlung zustande. PayPal bietet je nach Verfügbarkeit weitere Optionen (z. B. Lastschrift, Karte) an; es gelten PayPals Bedingungen.",
            "Wird die Zahlung bei PayPal nicht abgeschlossen, kommt kein Vertrag zustande. Ist ein Artikel trotz Zahlung nicht lieferbar (z. B. Farbe nicht mehr vorrätig), lehne ich die Bestellung ab und erstatte den Betrag unverzüglich über PayPal.",
            "**Logo, Bild, Sonderanfertigung: Preis nach Anfrage.** Wunschtext beim Tischschild und beim Spruch-Untersetzer ist direkt bestellbar. Bei Preis nach Anfrage schickst du eine unverbindliche Anfrage, ich sende ein Angebot per E-Mail. Das Angebot nimmst du über den Link in der Mail an (14 Tage gültig) und zahlst dann **sofort** per PayPal den vollen Preis; der Vertrag kommt mit erfolgreicher Zahlung zustande; meine Bestätigungsmail bestätigt ihn nur. Brichst du bei PayPal ab, kannst du über denselben Link innerhalb der Gültigkeit erneut zahlen. Gedruckt wird nach Zahlungseingang.",
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
            "Ich verpacke selbst, in Versandkartons bzw. Versandtaschen mit Papier- oder Pappfüllmaterial, damit die Ware den Transport übersteht. Für Verpackungen gelten die Vorgaben des Verpackungsgesetzes (VerpackG); die Registrierung bei LUCID erfolgt vor dem ersten Versand.",
          ]} />
        </article>
      </div>
    </ShopShell>
  );
}
