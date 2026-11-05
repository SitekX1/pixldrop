// Bestellschluss für Lieferung vor Weihnachten (Alex 05.11.2026): Garantie endet am 13.12.2026 um 00:00 (letzter garantierter Bestelltag Sa 12.12.).
// Reine Funktion für Server und Browser. Wortlaut vor Veröffentlichung von Dr. Justus prüfen lassen.

export const WEIHNACHT_GARANTIE_BIS = "2026-12-13T00:00:00+01:00";

/** Hinweis zur Lieferung vor Weihnachten; nach Fristende die Absage der Garantie, ab 27.12. kein Hinweis mehr. */
export function weihnachtsFristText(jetzt: Date = new Date()): string | null {
  const t = jetzt.getTime();
  if (t < Date.parse(WEIHNACHT_GARANTIE_BIS)) {
    return "Bestellst du bis einschließlich 12.12.2026, liefere ich garantiert vor Weihnachten (Zahlung bei Bestellung, Versand innerhalb Deutschlands).";
  }
  if (t < Date.parse("2026-12-27T00:00:00+01:00")) {
    return "Bestellungen nach dem 12.12.2026: Eine Lieferung vor Weihnachten kann ich nicht mehr garantieren. Ich versuche es, wenn es zeitlich passt.";
  }
  return null;
}
