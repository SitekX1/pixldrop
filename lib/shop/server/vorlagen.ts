import "server-only";
// Mail- und Nachrichtentexte. Reiner Text (kein HTML), damit Kundeneingaben nichts einschleusen.
// ACHTUNG: Der Rechtsblock ist ein PLATZHALTER. Dr. Justus liefert den Text; erst dann
// PFLICHTANGABEN_FREIGEGEBEN auf true setzen. Solange false, weigert sich der Shop,
// mit PAYPAL_ENV=live Bestellungen anzunehmen (siehe bestellung.ts).

export const PFLICHTANGABEN_FREIGEGEBEN = false;

export const PFLICHTANGABEN_PLATZHALTER = [
  "[[PLATZHALTER - TEXT VON DR. JUSTUS]]",
  "Hier stehen vor dem Livegang die gesetzlich nötigen Angaben (Art. 246a EGBGB, § 312f BGB):",
  "- Widerrufsbelehrung und Muster-Widerrufsformular (bzw. Hinweis auf den Ausschluss bei individuell gefertigten Waren)",
  "- AGB (Fassung, die zum Bestellzeitpunkt galt)",
  "- Lieferzeit, Versandkosten, Zahlungsbedingungen",
  "- Gewährleistungshinweis",
  "- Anbieterkennzeichnung: Alex Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, as@sitekx.de",
  "[[ENDE PLATZHALTER]]",
].join("\n");

export const eur = (cent: number): string =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);

export interface MailPosition {
  name: string;
  menge: number;
  einzelpreis_cent: number;
  farbe?: string | null;
  text?: string | null;
  schrift?: string | null;
  optionen?: Record<string, string> | null;
}

export interface MailBestellung {
  nummer: string;
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  gesamt_cent: number;
  summe_waren_cent: number;
  versand_cent: number;
  individuell: boolean;
  positionen: MailPosition[];
}

export const PLATZHALTER_MARKER = "[[PLATZHALTER";

/**
 * `block` = Rechtsblock der Mail (Standard: Platzhalter). Ist `freigegeben` true, darf der
 * Platzhalter NIE mehr in der Mail stehen: dann wird geworfen statt eine unvollstaendige Mail zu senden.
 */
export function bestaetigungsMail(
  b: MailBestellung,
  block: string = PFLICHTANGABEN_PLATZHALTER,
  freigegeben: boolean = PFLICHTANGABEN_FREIGEGEBEN,
): { betreff: string; text: string } {
  if (freigegeben && block.includes(PLATZHALTER_MARKER)) {
    throw new Error("Pflichtangaben freigegeben, aber Platzhalter noch im Mailtext");
  }
  const zeilen = b.positionen.map((p) => {
    const extras = [
      p.farbe ? `Farbe: ${p.farbe}` : null,
      ...Object.entries(p.optionen ?? {}).map(([k, v]) => `${k}: ${v}`),
      p.text ? `Wunschtext: „${p.text}“${p.schrift ? ` (${p.schrift})` : ""}` : null,
    ].filter(Boolean);
    return `- ${p.menge} x ${p.name} à ${eur(p.einzelpreis_cent)}${extras.length ? `\n    ${extras.join(", ")}` : ""}`;
  });
  const text = [
    `Hallo ${b.name},`,
    "",
    `danke für deine Bestellung ${b.nummer} bei PixlDrop. Deine Zahlung ist bei uns eingegangen.`,
    "",
    "Deine Bestellung:",
    ...zeilen,
    "",
    `Zwischensumme: ${eur(b.summe_waren_cent)}`,
    `Versand (Deutschland): ${eur(b.versand_cent)}`,
    `Gesamtpreis: ${eur(b.gesamt_cent)}`,
    "Preis gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.",
    "",
    "Lieferanschrift:",
    `${b.name}, ${b.strasse}, ${b.plz} ${b.ort}`,
    b.individuell ? "\nHinweis: Dein Stück mit Wunschtext wird individuell für dich gefertigt." : "",
    "",
    block,
    "",
    "Viele Grüße",
    "Alex Sitek",
  ].join("\n");
  return { betreff: `Deine Bestellung ${b.nummer} bei PixlDrop`, text };
}

/** Telegram: NUR Nummer und Art, nie Namen/Anschrift/Texte. */
export const telegramBestellung = (nummer: string) => `Neue Bestellung ${nummer} (bezahlt)`;
export const telegramAnfrage = (nummer: string) => `Neue Anfrage ${nummer} (individueller Druck)`;
export const telegramPruefen = (nummer: string, grund: string) => `Zahlung prüfen: ${nummer} (${grund})`;

export function alexMail(art: "Bestellung" | "Anfrage", nummer: string, adminUrl?: string): { betreff: string; text: string } {
  return {
    betreff: `Neue ${art} ${nummer}`,
    text: [
      `Neue ${art === "Bestellung" ? "bezahlte Bestellung" : "Anfrage"}: ${nummer}`,
      "",
      adminUrl ? `Details im Admin Panel: ${adminUrl}` : "Details im Admin Panel (Reiter Shop).",
      "",
      "Aus Datenschutzgründen stehen hier keine Kundendaten.",
    ].join("\n"),
  };
}
