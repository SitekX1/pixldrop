// Hinweis zur Lieferung vor Weihnachten (Alex 05.11.2026, Wortlaut nach Dr. Justus: keine Garantie/Zusage der Ankunft, nur Übergabe an den Paketdienst bis zu einem Datum).
// Reine Funktion für Server und Browser. Versanddatum 15.12. von Alex festgelegt (06.11.).

export const WEIHNACHT_BESTELLUNG_BIS = "2026-12-13T00:00:00+01:00"; // Bestellungen bis einschließlich 12.12.2026
export const WEIHNACHT_VERSAND_BIS_TEXT = "15.12.2026";

/** Hinweis zur Lieferung vor Weihnachten; ab 13.12. sachlicher Verweis auf die normale Lieferzeit, ab 27.12. kein Hinweis mehr. */
export function weihnachtsFristText(jetzt: Date = new Date()): string | null {
  const t = jetzt.getTime();
  if (t < Date.parse(WEIHNACHT_BESTELLUNG_BIS)) {
    return `Lieferung vor Weihnachten: Bestellungen, die du bis einschließlich 12.12.2026 abschickst (Standardartikel, Zahlung sofort per PayPal), gebe ich bis spätestens ${WEIHNACHT_VERSAND_BIS_TEXT} an den Paketdienst bzw. die Post. Wie lange Hermes, DHL oder die Post danach brauchen, kann ich nicht beeinflussen; vor Weihnachten ist oft viel los. Einen festen Zustelltermin sage ich deshalb nicht zu. Brauchst du das Geschenk zu einem bestimmten Termin, schreib mir vorher an as@sitekx.de. Das gilt nicht für Individuelles nach Anfrage; dort steht die Frist im Angebot.`;
  }
  if (t < Date.parse("2026-12-27T00:00:00+01:00")) {
    return "Bestellungen ab dem 13.12.2026: Ob die Lieferung noch vor Weihnachten klappt, kann ich nicht zusagen. Es gilt die normale Lieferzeit (siehe oben). Wenn es für dein Geschenk knapp ist, schreib mir vorher kurz an as@sitekx.de.";
  }
  return null;
}
