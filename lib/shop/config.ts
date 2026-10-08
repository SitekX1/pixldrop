// Zentrale Shop-Konfiguration (Gerüst, nicht live). Alles Umstellbare steht hier, nicht im Markup.

/**
 * Sicherheitsnetz: Solange false, sind Bestell- und Anfrageformulare reine Oberfläche
 * (nichts wird gesendet oder gespeichert). Auch bei true ist in diesem Gerüst noch KEIN
 * Backend angebunden (Ben), der Schalter ist nur die Sollbruchstelle für später.
 */
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
  preisFolgt: "Preis folgt",
  versandHinweis: "Versandkosten folgen (Lieferung nur innerhalb Deutschlands)",
  lieferzeitHinweis: "Lieferzeit folgt (Druckzeit plus Versand, Wert bestätigt Alex)",
  kleinunternehmer: "Preis gemäß § 19 UStG ohne Ausweis der Umsatzsteuer",
  keinSpielzeug: "Kein Spielzeug. Nicht für Kinder unter 3 Jahren. Nicht für offene Flamme.",
  ledHinweis: "Dekoration, nur mit LED-Teelichtern verwenden.",
  widerrufAusschluss: "Individuell gefertigt: vom Widerruf ausgeschlossen.",
  widerrufNormal: "14 Tage Widerruf, Rücksendekosten trägt der Kunde.",
} as const;

// Platzhalterwerte, solange Alex nichts bestätigt hat. null = "folgt", keine erfundenen Zahlen.
export const VERSAND_CENT: number | null = null;
export const LIEFERZEIT_TEXT: string | null = null;

export const VERKAEUFER = {
  name: "Alex Sitek",
  anschrift: "Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim",
  mail: "as@sitekx.de",
} as const;

export function formatPreis(cent: number | null): string {
  if (cent == null) return TEXTE.preisFolgt;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);
}
