// Zentrale Shop-Konfiguration (Gerüst, nicht live). Alles Umstellbare steht hier, nicht im Markup.

/**
 * Sicherheitsnetz: Solange false, sind Bestell- und Anfrageformulare reine Oberfläche
 * (nichts wird gesendet oder gespeichert). Auch bei true ist in diesem Gerüst noch KEIN
 * Backend angebunden (Ben), der Schalter ist nur die Sollbruchstelle für später.
 */
/**
 * Zentraler Schalter für alle Entwurf-Hinweise (Titelzusatz "(Entwurf)", Zeile "noch nicht rechtsverbindlich",
 * EntwurfBanner). Standard: an. Beim Livegang NEXT_PUBLIC_SHOP_ENTWURF=false setzen, ohne Codeänderung.
 */
export const ENTWURF_MODUS: boolean = process.env.NEXT_PUBLIC_SHOP_ENTWURF !== "false";
export const entwurfTitel = (titel: string): string => (ENTWURF_MODUS ? `${titel} (Entwurf)` : titel);

export const SHOP_AKTIV: boolean = process.env.NEXT_PUBLIC_SHOP_AKTIV === "true";

export type HalloweenModus = "off" | "preview" | "sale";

/** Ab diesem Datum (UTC, exklusiv) ist die Halloween-Kollektion automatisch aus. */
export const HALLOWEEN_ENDE = "2026-11-03";
export const HALLOWEEN_ENDE_TEXT = "bis 2. November";

/**
 * Standard "preview" (PLAN.md: Halloween 2026 nur Content, Verkauf frühestens Weihnachten).
 * Umstellbar per Env SHOP_HALLOWEEN=off|preview|sale. Nach dem Enddatum immer "off".
 */
export function halloweenModus(jetzt: Date = new Date()): HalloweenModus {
  if (jetzt.getTime() >= Date.parse(HALLOWEEN_ENDE + "T00:00:00Z")) return "off";
  const v = process.env.SHOP_HALLOWEEN;
  return v === "off" || v === "sale" || v === "preview" ? v : "preview";
}

export const TEXTE = {
  bestellButton: "Zahlungspflichtig bestellen", // Button-Lösung § 312j BGB, Wortlaut von Justus bestätigen
  bestellInaktiv: "Bestellung noch nicht aktiv",
  anfrageButton: "Anfrage absenden (unverbindlich)",
  anfrageInaktiv: "Anfrage noch nicht aktiv",
  preisFolgt: "Preis auf Anfrage",
  preisAnfrage: "Preis nach Anfrage",
  startHinweis: "Lieferung nur innerhalb Deutschlands. Bezahlung sofort per PayPal. Sonderwünsche (andere Schrift, Logo, Bild): bitte über „Individueller Druck“ anfragen.",
  vertragsschluss: "Nach dem Klick geht es direkt zu PayPal. Der Vertrag kommt mit meiner Bestellbestätigung per E-Mail nach erfolgter Zahlung zustande.",
  datenschutzHinweis: "Informationen zur Verarbeitung deiner Daten findest du in der",
  versandHinweis: "Versandkosten werden im Warenkorb angezeigt (Lieferung nur innerhalb Deutschlands)",
  lieferzeitHinweis: "Lieferzeit: Druckzeit plus Versand, genaue Angabe in der Bestellbestätigung",
  kleinunternehmer: "Preis gemäß § 19 UStG ohne Ausweis der Umsatzsteuer",
  keinSpielzeug: "Kein Spielzeug, nicht für Kinder.",
  ledHinweis: "Nicht für offene Flammen (nur mit LED-Teelichtern).",
  widerrufAusschluss: "Individuell gefertigt: vom Widerruf ausgeschlossen.",
  widerrufNormal: "14 Tage Widerruf, Rücksendekosten trägt der Kunde.",
} as const;

// TESTWERTE, damit der Server Bestellungen annimmt. Alex ersetzt sie durch die echten Werte
// (null = nicht angegeben, dann ist nichts bestellbar). Artikelpreise: TESTPREIS_CENT in lib/shop/produkte.ts.
export const VERSAND_CENT: number | null = 490; // TESTWERT 4,90 EUR
export const LIEFERZEIT_TEXT: string | null = "3-5 Werktage"; // TESTWERT

export const VERKAEUFER = {
  name: "Alex Sitek",
  anschrift: "Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim",
  mail: "as@sitekx.de",
} as const;

export function formatPreis(cent: number | null): string {
  if (cent == null) return TEXTE.preisFolgt;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);
}
