import "server-only";
// PDF-Anhaenge der Bestellbestaetigung (AGB, Widerrufsbelehrung, Muster-Widerrufsformular) aus Klartext.
// pdf-lib, rein JS, laeuft in Vercel Functions ohne Zusatzdienst. Standard-Schriften (Helvetica, WinAnsi):
// Zeichen ausserhalb von WinAnsi werden ersetzt statt zu werfen (siehe bereinige).
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { MailAnhang } from "./benachrichtigung";

export interface RechtsDokument {
  /** Dateiname inkl. .pdf (ASCII) */
  dateiname: string;
  /** Titel (Seite 1 oben, PDF-Metadaten, Fusszeile) */
  titel: string;
  /** Klartext; Leerzeile = Absatz, Zeile aus Strichen = Trennlinie */
  text: string;
}

const A4 = { b: 595.28, h: 841.89 };
const RAND = { l: 62, r: 62, o: 64, u: 70 };
const SCHRIFT = 10;
const ZEILE = 14;
const H2 = 11.5;

/** Stand-Datum aus "Stand: TT.MM.JJJJ" im Text; sonst null (dann Erstellungsdatum). */
export function standAusText(text: string): string | null {
  const m = text.match(/Stand:\s*(\d{1,2}\.\s*(?:\d{1,2}\.|[A-Za-zÄÖÜäöü]+)\s*\d{4})/);
  return m ? m[1] : null;
}

function datumBerlin(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** Ersetzt Zeichen, die die Standard-Schrift nicht kann (WinAnsi), sauber statt Fehler. */
function bereinige(s: string, erlaubt: Set<number>): string {
  let out = "";
  for (const ch of s.replace(/\r/g, "").replace(/\t/g, "  ")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n" || erlaubt.has(cp)) { out += ch; continue; }
    if (cp === 0x00a0 || cp === 0x202f || cp === 0x2009) { out += " "; continue; }
    if (cp === 0x2011 || cp === 0x2010 || cp === 0x2212) { out += "-"; continue; }
    const basis = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += [...basis].every((c) => erlaubt.has(c.codePointAt(0)!)) && basis ? basis : "?";
  }
  return out;
}

function istUeberschrift(zeile: string, davor: string | undefined, danach: string | undefined): "h1" | "h2" | null {
  const z = zeile.trim();
  if (!z) return null;
  if (/^\d+\.\s+\S/.test(z) && z.length < 110) return "h2"; // AGB: "3. Vertragsschluss ..."
  const buchstaben = z.replace(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (buchstaben.length >= 4 && z === z.toUpperCase() && z.length < 70) return "h2"; // MUSTER-WIDERRUFSFORMULAR
  // kurze Zeile ohne Satzzeichen am Ende, davor Leerzeile/Anfang, danach Text: Zwischenueberschrift
  if (z.length < 40 && !/[.:;,)(]$/.test(z) && !z.startsWith("–") && !z.startsWith("-") && (davor === undefined || davor.trim() === "") && danach !== undefined && danach.trim() !== "") return "h2";
  return null;
}

function umbrechen(text: string, font: PDFFont, groesse: number, breite: number): string[] {
  const zeilen: string[] = [];
  let aktuell = "";
  const passt = (s: string) => font.widthOfTextAtSize(s, groesse) <= breite;
  for (const wort of text.split(/ +/)) {
    if (!wort) continue;
    const probe = aktuell ? `${aktuell} ${wort}` : wort;
    if (passt(probe)) { aktuell = probe; continue; }
    if (aktuell) { zeilen.push(aktuell); aktuell = ""; }
    if (passt(wort)) { aktuell = wort; continue; }
    // sehr langes Wort (URL): hart nach Zeichen trennen
    let rest = wort;
    while (rest) {
      let n = rest.length;
      while (n > 1 && !passt(rest.slice(0, n))) n--;
      if (n >= rest.length) { aktuell = rest; rest = ""; } else { zeilen.push(rest.slice(0, n)); rest = rest.slice(n); }
    }
  }
  if (aktuell) zeilen.push(aktuell);
  return zeilen;
}

/** Erzeugt ein einzelnes PDF (A4, Titel, Absaetze, Seitenumbruch, Fusszeile mit Stand und Seitenzahl). */
export async function erzeugePdf(doc: RechtsDokument, jetzt: Date = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const erlaubt = new Set(normal.getCharacterSet());
  const roh = bereinige(doc.text, erlaubt);
  const titel = bereinige(doc.titel, erlaubt);
  const stand = standAusText(roh);
  const fuss = `${titel}  |  ${stand ? `Stand: ${stand}` : `Erstellt am ${datumBerlin(jetzt)}`}  |  Alexander Sitek, pixldrop.de/3d-druck`;

  pdf.setTitle(titel);
  pdf.setAuthor("Alexander Sitek");
  pdf.setProducer("pixldrop.de");
  pdf.setCreationDate(jetzt);
  pdf.setModificationDate(jetzt);

  const breite = A4.b - RAND.l - RAND.r;
  let seite = pdf.addPage([A4.b, A4.h]);
  let y = A4.h - RAND.o;
  const neueSeite = () => { seite = pdf.addPage([A4.b, A4.h]); y = A4.h - RAND.o; };
  const platz = (h: number) => { if (y - h < RAND.u) neueSeite(); };
  const schreibe = (s: string, f: PDFFont, g: number, abstand: number, einzug = 0) => {
    for (const z of umbrechen(s, f, g, breite - einzug)) {
      platz(abstand);
      seite.drawText(z, { x: RAND.l + einzug, y: y - g, size: g, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= abstand;
    }
  };

  // Titel, dann Text. Ist die erste Textzeile gleich dem Titel (ohne Gross/Klein), wird sie nicht doppelt gesetzt.
  schreibe(titel, fett, 17, 22);
  y -= 8;
  const zeilen = roh.split("\n");
  let start = 0;
  if (zeilen[0] && zeilen[0].trim().toLowerCase() === titel.trim().toLowerCase()) start = 1;
  if (zeilen[start] !== undefined && /^allgemeine geschäftsbedingungen/i.test(zeilen[start]) && /allgemeine geschäftsbedingungen/i.test(titel)) start++;

  for (let i = start; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.trim() === "") { y -= 6; continue; }
    if (/^-{5,}$/.test(z.trim())) {
      platz(14);
      y -= 4;
      seite.drawLine({ start: { x: RAND.l, y }, end: { x: A4.b - RAND.r, y }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
      y -= 10;
      continue;
    }
    const art = istUeberschrift(z, zeilen[i - 1], zeilen[i + 1]);
    if (art) {
      platz(ZEILE * 3); // Ueberschrift nicht allein am Seitenende
      y -= 4;
      schreibe(z.trim(), fett, H2, 16);
      y -= 1;
    } else if (/^[–-]\s/.test(z.trim()) || /^\([a-z0-9]+\)\s/.test(z.trim())) {
      schreibe(z.trim(), normal, SCHRIFT, ZEILE, 0);
    } else {
      schreibe(z.trim(), normal, SCHRIFT, ZEILE);
    }
  }

  const seiten = pdf.getPages();
  seiten.forEach((p, i) => {
    p.drawLine({ start: { x: RAND.l, y: 48 }, end: { x: A4.b - RAND.r, y: 48 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    p.drawText(fuss, { x: RAND.l, y: 34, size: 8, font: normal, color: rgb(0.35, 0.35, 0.35) });
    const nr = `Seite ${i + 1} von ${seiten.length}`;
    p.drawText(nr, { x: A4.b - RAND.r - normal.widthOfTextAtSize(nr, 8), y: 34, size: 8, font: normal, color: rgb(0.35, 0.35, 0.35) });
  });
  return pdf.save();
}

/** Erzeugt alle Dokumente als Mail-Anhaenge. Wirft bei Fehler (Aufrufer faellt auf Volltext im Mailkoerper zurueck). */
export async function erzeugeAnhaenge(docs: RechtsDokument[], jetzt: Date = new Date()): Promise<MailAnhang[]> {
  const out: MailAnhang[] = [];
  for (const d of docs) {
    const bytes = await erzeugePdf(d, jetzt);
    out.push({ filename: d.dateiname, content: Buffer.from(bytes), contentType: "application/pdf" });
  }
  return out;
}

export type AnhangErzeuger = (docs: RechtsDokument[]) => Promise<MailAnhang[]>;

/**
 * Bereitet die Kundenmail vor: kurzer Text + PDFs. Schlaegt die PDF-Erzeugung fehl (oder ist leer),
 * geht die Mail ohne Anhang mit dem Volltext des Rechtsblocks raus (Fallback) und der Fehler wird geloggt.
 */
export async function mailMitAnhaengen(
  mail: { betreff: string; text: string; volltext: string; anhaenge: RechtsDokument[] },
  erzeuger: AnhangErzeuger = erzeugeAnhaenge,
): Promise<{ betreff: string; text: string; anhaenge?: MailAnhang[]; fallback: boolean }> {
  try {
    const anhaenge = await erzeuger(mail.anhaenge);
    if (anhaenge.length !== mail.anhaenge.length) throw new Error("Anhangzahl stimmt nicht");
    return { betreff: mail.betreff, text: mail.text, anhaenge, fallback: false };
  } catch (err) {
    console.error("Shop-PDF-Fehler (Fallback auf Volltext):", err instanceof Error ? err.name : "unbekannt");
    return { betreff: mail.betreff, text: mail.volltext, fallback: true };
  }
}
