import "server-only";
// Texte des Freigabe-Flows (Wunschtext-Bestellungen). Entwurf von Ben; die Endformulierung liegt bei Justus.
// Telegram bekommt NUR Bestellnummer + Art + die zwei Links (keine Namen, Anschriften, Wunschtexte).
import { KONTAKT_ALEX, eur } from "./vorlagen";

/** Feste Grund-Textbausteine fuer die Ablehnung (Schluessel = DB-Check shop_bestellungen_freigabe_grund_chk). */
export const FREIGABE_GRUENDE = [
  { id: "marke", label: "Geschützte Marke / Rechte Dritter", text: "Dein Text enthält eine geschützte Marke, ein Logo oder eine geschützte Figur bzw. kann Rechte Dritter verletzen. Solche Texte darf ich nach Ziffer 9 Abs. 3 der AGB nicht fertigen." },
  { id: "unzulaessig", label: "Inhalt nicht zulässig", text: "Dein Text enthält Inhalte, die ich nach Ziffer 9 Abs. 3 der AGB nicht fertigen darf (z. B. rechtswidrige, beleidigende, diskriminierende, jugendgefährdende oder gewaltverherrlichende Inhalte oder verfassungsfeindliche Kennzeichen)." },
  { id: "unleserlich", label: "Nicht sauber druckbar", text: "Dein Text lässt sich in der gewählten Schrift und Größe auf dem Stück nicht sauber und lesbar drucken (z. B. wegen Länge, Zeichen oder Zeilenaufbau), sodass ich ihn so nicht fertigen kann." },
  { id: "sonstiges", label: "Sonstiger Grund", text: "Ich kann deine Bestellung mit diesem Text nicht annehmen. Bei Fragen dazu schreib mir bitte an as@sitekx.de." },
] as const;

export type FreigabeGrund = (typeof FREIGABE_GRUENDE)[number]["id"];

export function istFreigabeGrund(v: unknown): v is FreigabeGrund {
  return typeof v === "string" && FREIGABE_GRUENDE.some((g) => g.id === v);
}

export interface FreigabeLinks {
  ok: string;
  nein: string;
}

export const telegramFreigabe = (nummer: string, links: FreigabeLinks): string =>
  `Wunschtext prüfen und freigeben: ${nummer} (Frist 24 h nach Zahlung)
Freigeben: ${links.ok}
Ablehnen: ${links.nein}`;

export const telegramFreigabeErinnerung = (nummer: string, stunden: number, links: FreigabeLinks): string =>
  `Erinnerung: Bestellung ${nummer} wartet seit über ${stunden} Stunden auf die Prüfung des Wunschtexts (Frist 24 Stunden)\nFreigeben: ${links.ok}\nAblehnen: ${links.nein}`;

export const telegramErstattungOffen = (nummer: string): string =>
  `Erstattung fehlgeschlagen: ${nummer} - bitte in PayPal erstatten`;

export function alexMailFreigabe(
  nummer: string,
  links: FreigabeLinks,
  art: "neu" | "erinnerung",
): { betreff: string; text: string } {
  return {
    betreff: art === "neu" ? `Wunschtext prüfen: Bestellung ${nummer}` : `Erinnerung: Wunschtext prüfen, Bestellung ${nummer}`,
    text: [
      `Bestellung ${nummer} ist bezahlt und enthält einen Wunschtext. Der Kunde hat nur eine Eingangsbestätigung bekommen.`,
      "Die Entscheidung ist innerhalb von 24 Stunden nach Zahlungseingang zugesagt.",
      "",
      `Freigeben (Vertragsschluss, Bestätigung mit PDFs geht an den Kunden): ${links.ok}`,
      `Ablehnen (Absage-Mail, automatische PayPal-Erstattung): ${links.nein}`,
      "",
      "Die Links sind 7 Tage gültig und führen auf eine Seite mit Bestätigungsschritt.",
      "Aus Datenschutzgründen stehen hier keine Kundendaten.",
    ].join("\n"),
  };
}

/** Mail A: Eingangsbestaetigung (Justus), KEIN Vertragsschluss. Keine PDFs. */
export function eingangsMail(
  b: { nummer: string; name: string; gesamt_cent: number; datum?: string; positionen?: string },
  siteUrl: string,
): { betreff: string; text: string } {
  const site = siteUrl.replace(/\/+$/, "");
  return {
    betreff: `Eingang deiner Bestellung ${b.nummer}: ich prüfe deinen Text`,
    text: [
      `Hallo ${b.name},`,
      "",
      `danke für deine Bestellung ${b.nummer}${b.datum ? ` vom ${b.datum}` : ""}. Deine Zahlung über ${eur(b.gesamt_cent)} ist bei mir eingegangen.`,
      "",
      "Das ist noch nicht die Bestellbestätigung und noch kein Vertragsschluss. Weil du den Wunschtext geändert hast, prüfe ich ihn zuerst selbst. Das mache ich innerhalb von 24 Stunden nach deiner Zahlung (AGB Ziffer 3 Abs. 4 und 5, Ziffer 9 Abs. 3).",
      "",
      "Danach passiert eines von beidem:",
      "- Ich gebe den Text frei: Du bekommst die Bestellbestätigung mit AGB, Widerrufsbelehrung und Muster-Widerrufsformular. Erst damit kommt der Kaufvertrag zustande, und die Lieferzeit beginnt.",
      "- Ich lehne den Text ab: Du bekommst eine Absage mit dem Grund, kein Vertrag kommt zustande, und ich erstatte dir den gesamten Betrag einschließlich Versand über PayPal.",
      ...(b.positionen ? ["", "Deine Bestellung:", b.positionen] : []),
      "",
      `Verkäufer: ${KONTAKT_ALEX} (Impressum: ${site}/impressum)`,
      `Allgemeine Geschäftsbedingungen: ${site}/3d-druck/agb`,
      "Kommt innerhalb von 24 Stunden nichts von mir an, schreib mir bitte an as@sitekx.de.",
      "",
      "Viele Grüße, Alex",
    ].join("\n"),
  };
}

/** Mail B: Absage mit Grund-Textbaustein und Vollerstattung (Justus). */
export function absageMail(
  b: { nummer: string; name: string; gesamt_cent: number },
  grund: FreigabeGrund,
  siteUrl: string = "https://pixldrop.de",
): { betreff: string; text: string } {
  const site = siteUrl.replace(/\/+$/, "");
  const baustein = FREIGABE_GRUENDE.find((g) => g.id === grund)?.text ?? FREIGABE_GRUENDE[3].text;
  return {
    betreff: `Deine Bestellung ${b.nummer}: leider kann ich sie nicht annehmen, Erstattung erfolgt`,
    text: [
      `Hallo ${b.name},`,
      "",
      `ich habe deinen Wunschtext zu Bestellung ${b.nummer} geprüft und kann sie leider nicht annehmen. Es ist deshalb kein Kaufvertrag zustande gekommen.`,
      "",
      "Grund:",
      baustein,
      "",
      `Ich erstatte dir den gezahlten Betrag von ${eur(b.gesamt_cent)} einschließlich Versandkosten vollständig über PayPal auf dasselbe Zahlungsmittel. PayPal bucht je nach Zahlungsart in der Regel innerhalb weniger Tage zurück.`,
      "",
      `Mit einem geänderten Text kannst du gern neu bestellen, oder du stellst eine individuelle Anfrage unter ${site}/3d-druck. Bei Fragen schreib an as@sitekx.de.`,
      "",
      "Viele Grüße, Alex",
    ].join("\n"),
  };
}
