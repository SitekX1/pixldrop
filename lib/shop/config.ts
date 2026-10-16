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
  startHinweis: "Lieferung nur innerhalb Deutschlands. Bezahlung sofort per PayPal. Sonderwünsche (Schrift außerhalb der Shop-Liste, Logo, Bild): bitte über „Individueller Druck“ anfragen.",
  vertragsschluss: "Nach dem Klick geht es direkt zu PayPal. Der Vertrag kommt mit meiner Bestellbestätigung per E-Mail nach erfolgter Zahlung zustande. Bei geändertem Wunschtext erhältst du zuerst eine Eingangsbestätigung; der Vertrag kommt mit meiner Bestätigung nach Textfreigabe (innerhalb von 24 Stunden nach Zahlung) zustande.",
  datenschutzHinweis: "Informationen zur Verarbeitung deiner Daten findest du in der",
  versandHinweis: "Versandkosten werden im Warenkorb angezeigt (Lieferung nur innerhalb Deutschlands)",
  lieferzeitHinweis: "Lieferzeit: Druckzeit plus Versand, genaue Angabe in der Bestellbestätigung",
  schriftHinweis: "Die Vorschau ist eine Annäherung. Die Position deiner Schrift darf beim Druck um bis zu 3 mm verschoben werden, zum Beispiel damit sie mittig auf dem Stück sitzt, soweit das für dich zumutbar ist. Text, Schrift, Farben und Größenstufe bleiben wie in der Vorschau.",
  bildHinweis: "Die Bilder zeigen Beispielstücke aus meiner Fertigung. Wird ein Foto in deiner gewählten Farbe angezeigt, ist es digital bearbeitet und kein Foto deines fertigen Stücks. Farbton und Glanz können durch Bildschirm, Licht und Filament-Charge leicht abweichen. Maßgeblich ist die Farbbezeichnung, die du im Warenkorb siehst.",
  kleinunternehmer: "Preis gemäß § 19 UStG ohne Ausweis der Umsatzsteuer",
  keinSpielzeug: "Kein Spielzeug. Enthält Kleinteile bzw. kann zerbrechen: von Kleinkindern fernhalten.",
  ledHinweis: "Nur mit LED-Teelichtern verwenden. Nicht für Kerzen oder offene Flamme (Brand- und Verformungsgefahr). LED-Teelichter gehören nicht zum Lieferumfang; passende Modelle unterscheiden sich je nach Hersteller. Batterien (Knopfzellen) der LED-Teelichter von Kindern fernhalten.",
  widerrufAusschluss: "Individuell gefertigt: vom Widerruf ausgeschlossen.",
  widerrufNormal: "14 Tage Widerruf, Rücksendekosten trägt der Kunde.",
} as const;

// Versand-Pauschale nur fuer Angebote (individueller Druck); Artikelversand rechnet lib/shop/versand.ts.
// Lieferzeit: Alex 2026-10-15 (im Panel-Reiter Einstellungen aenderbar). Artikelpreise: lib/shop/produkte.ts.
export const VERSAND_CENT: number | null = 490; // 4,90 EUR
export const LIEFERZEIT_TEXT: string | null = "3-5 Werktage";

export const VERKAEUFER = {
  name: "Alexander Sitek",
  anschrift: "Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim",
  mail: "as@sitekx.de",
} as const;

export function formatPreis(cent: number | null): string {
  if (cent == null) return TEXTE.preisFolgt;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);
}

/** Kontakt-Kachel im Footer: true = Anschrift anzeigen, false = "Anschrift siehe Impressum". */
export const KONTAKT_MIT_ANSCHRIFT = true;
