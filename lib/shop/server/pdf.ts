import "server-only";
// PDF-Anhaenge der Bestellbestaetigung (AGB, Widerrufsbelehrung, Muster-Widerrufsformular) aus Klartext.
// pdf-lib, rein JS, laeuft in Vercel Functions ohne Zusatzdienst. Standard-Schriften (Helvetica, WinAnsi):
// Zeichen ausserhalb von WinAnsi werden ersetzt statt zu werfen (siehe bereinige).
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { MailAnhang } from "./benachrichtigung";
import { PIXLDROP_LOGO_MASSE, PIXLDROP_LOGO_PNG_BASE64 } from "./pdf-logo";

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

// Farbwelt wie im Shop: Honig + Braun (dezent), Text dunkelbraun.
const C = {
  tinte: rgb(0.18, 0.11, 0.06), text: rgb(0.16, 0.125, 0.08), gedimmt: rgb(0.42, 0.35, 0.26),
  honig: rgb(0.94, 0.73, 0.33), braun: rgb(0.6, 0.37, 0.04), linie: rgb(0.85, 0.78, 0.65), tint: rgb(0.97, 0.9, 0.74),
};
const ABSENDER = "Alexander Sitek · Richard-Strauss-Straße 4 · 86663 Asbach-Bäumenheim · as@sitekx.de";

/** Schreiblinien je Formularfeld (Muster-Widerrufsformular, Anlage 2 zu Art. 246a EGBGB: Wortlaut unveraendert). */
function formularLinien(z: string): number {
  if (/^[–-]\s*Hiermit widerrufe/.test(z)) return 2;
  if (/^[–-]\s*Anschrift/.test(z)) return 2;
  if (/^[–-]\s*(Bestellt am|Name|Unterschrift|Datum)/.test(z)) return 1;
  return 0;
}

/** Erzeugt ein einzelnes PDF (A4, Kopf mit Logo, Absender, Ueberschriften, Hanging-Indent, Seitenumbruch, Fusszeile mit Stand und Seitenzahl). */
export async function erzeugePdf(doc: RechtsDokument, jetzt: Date = new Date()): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const kursiv = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const erlaubt = new Set(normal.getCharacterSet());
  const roh = bereinige(doc.text, erlaubt);
  const titel = bereinige(doc.titel, erlaubt);
  const absender = bereinige(ABSENDER, erlaubt);
  const stand = standAusText(roh);
  const istFormular = /^muster-widerrufsformular$/i.test(titel.trim());
  const fuss = `${titel}  |  ${stand ? `Stand: ${stand}` : `Erstellt am ${datumBerlin(jetzt)}`}  |  Alexander Sitek, pixldrop.de/3d-druck`;
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try { logo = await pdf.embedPng(Buffer.from(PIXLDROP_LOGO_PNG_BASE64, "base64")); } catch { logo = null; /* Wortmarke genuegt */ }

  pdf.setTitle(titel);
  pdf.setAuthor("Alexander Sitek");
  pdf.setProducer("pixldrop.de");
  pdf.setCreationDate(jetzt);
  pdf.setModificationDate(jetzt);

  const breite = A4.b - RAND.l - RAND.r;
  const rechts = A4.b - RAND.r;
  let seite = pdf.addPage([A4.b, A4.h]);
  let y = A4.h - RAND.o;
  const balken = () => seite.drawRectangle({ x: 0, y: A4.h - 8, width: A4.b, height: 8, color: C.honig });

  // Kopf Seite 1: Honigbalken, Kicker, Titel, Untertitel, Absenderzeile, Trennlinie; Logo rechts.
  const zeilen = roh.split("\n");
  let start = 0;
  let untertitel = "";
  if (zeilen[0] && zeilen[0].trim().toLowerCase() === titel.trim().toLowerCase()) start = 1;
  if (zeilen[start] !== undefined && /^allgemeine geschäftsbedingungen/i.test(zeilen[start]) && /allgemeine geschäftsbedingungen/i.test(titel)) {
    untertitel = zeilen[start].trim().replace(/^allgemeine geschäftsbedingungen\s*/i, "").trim();
    start++;
  }
  balken();
  const logoB = 74;
  const logoH = logoB * (PIXLDROP_LOGO_MASSE.h / PIXLDROP_LOGO_MASSE.b);
  const kopfBreite = breite - (logo ? logoB + 16 : 0);
  if (logo) seite.drawImage(logo, { x: rechts - logoB, y: A4.h - 28 - logoH, width: logoB, height: logoH });
  else seite.drawText("PixlDrop", { x: rechts - fett.widthOfTextAtSize("PixlDrop", 16), y: A4.h - 48, size: 16, font: fett, color: C.braun });
  seite.drawText("PIXLDROP 3D-DRUCK", { x: RAND.l, y: A4.h - 44, size: 8.5, font: fett, color: C.braun });
  let ky = A4.h - 70;
  for (const z of umbrechen(titel, fett, 22, kopfBreite)) { seite.drawText(z, { x: RAND.l, y: ky, size: 22, font: fett, color: C.tinte }); ky -= 27; }
  if (untertitel) {
    for (const z of umbrechen(untertitel, normal, 11.5, kopfBreite)) { seite.drawText(z, { x: RAND.l, y: ky, size: 11.5, font: normal, color: C.gedimmt }); ky -= 15; }
  }
  ky -= 4;
  seite.drawText(absender, { x: RAND.l, y: ky, size: 8.5, font: normal, color: C.gedimmt });
  const kopfUnten = Math.min(ky - 12, A4.h - 28 - logoH - 10);
  seite.drawLine({ start: { x: RAND.l, y: kopfUnten }, end: { x: rechts, y: kopfUnten }, thickness: 1.2, color: C.honig });
  y = kopfUnten - 20;

  const neueSeite = () => {
    seite = pdf.addPage([A4.b, A4.h]);
    balken();
    seite.drawText(titel, { x: RAND.l, y: A4.h - 34, size: 8.5, font: fett, color: C.braun });
    const r = "PixlDrop 3D-Druck";
    seite.drawText(r, { x: rechts - normal.widthOfTextAtSize(r, 8.5), y: A4.h - 34, size: 8.5, font: normal, color: C.gedimmt });
    seite.drawLine({ start: { x: RAND.l, y: A4.h - 42 }, end: { x: rechts, y: A4.h - 42 }, thickness: 0.5, color: C.linie });
    y = A4.h - 66;
  };
  const platz = (h: number) => { if (y - h < RAND.u) neueSeite(); };
  /** Zeilen eines Absatzes setzen; Einzug = linker Einzug des Textes, Marke (z. B. "(1)") steht links davon. */
  const schreibe = (s: string, f: PDFFont, g: number, abstand: number, einzug = 0, farbe = C.text, marke = "") => {
    let erste = true;
    for (const z of umbrechen(s, f, g, breite - einzug)) {
      platz(abstand);
      if (erste && marke) seite.drawText(marke, { x: RAND.l, y: y - g, size: g, font: fett, color: C.braun });
      erste = false;
      seite.drawText(z, { x: RAND.l + einzug, y: y - g, size: g, font: f, color: farbe });
      y -= abstand;
    }
  };

  for (let i = start; i < zeilen.length; i++) {
    const z = zeilen[i];
    const t = z.trim();
    if (t === "") continue;
    if (/^-{5,}$/.test(t)) {
      platz(24);
      y -= 6;
      seite.drawLine({ start: { x: RAND.l, y }, end: { x: rechts, y }, thickness: 0.6, color: C.linie });
      y -= 14;
      continue;
    }
    const art = istUeberschrift(z, zeilen[i - 1], zeilen[i + 1]);
    if (art) {
      platz(ZEILE * 4); // Ueberschrift nicht allein am Seitenende
      y -= 10;
      seite.drawRectangle({ x: RAND.l, y: y - 13, width: 3, height: 14, color: C.honig });
      schreibe(t, fett, H2 + 1, 17, 11, C.tinte);
      y -= 3;
      continue;
    }
    if (/^Stand:/.test(t)) {
      platz(30);
      y -= 8;
      seite.drawLine({ start: { x: RAND.l, y }, end: { x: rechts, y }, thickness: 0.5, color: C.linie });
      y -= 12;
      schreibe(t, kursiv, 9.5, 14, 0, C.gedimmt);
      continue;
    }
    if (istFormular) {
      if (/^[–-]\s/.test(t)) {
        const n = formularLinien(t);
        if (n === 0) {
          // Adressat ("An ..."): als getoente Box
          const h = umbrechen(t, normal, SCHRIFT + 0.5, breite - 10).length * 15 + 14;
          platz(h + 8);
          seite.drawRectangle({ x: RAND.l, y: y - h, width: breite, height: h, color: C.tint, opacity: 0.55 });
          seite.drawRectangle({ x: RAND.l, y: y - h, width: 3, height: h, color: C.honig });
          y -= 8;
          schreibe(t, normal, SCHRIFT + 0.5, 15, 10, C.tinte);
          y -= 14;
        } else {
          platz(20 + n * 28);
          y -= 6;
          schreibe(t, fett, SCHRIFT + 0.5, 15, 0, C.tinte);
          for (let k = 0; k < n; k++) {
            y -= 15;
            seite.drawLine({ start: { x: RAND.l, y }, end: { x: rechts, y }, thickness: 0.7, color: C.gedimmt });
          }
          y -= 8;
        }
        continue;
      }
      schreibe(t, /^\(\*\)/.test(t) ? kursiv : normal, SCHRIFT, ZEILE + 1, 0, /^\(\*\)/.test(t) ? C.gedimmt : C.text);
      y -= 6;
      continue;
    }
    const hang = t.match(/^(\([a-z0-9]+\))\s+(.*)$/);
    if (hang) {
      schreibe(hang[2], normal, SCHRIFT, ZEILE + 0.5, 26, C.text, hang[1]);
      y -= 4;
    } else if (/^[–-]\s/.test(t)) {
      seite.drawText("–", { x: RAND.l + 8, y: y - SCHRIFT, size: SCHRIFT, font: fett, color: C.braun });
      schreibe(t.replace(/^[–-]\s+/, ""), normal, SCHRIFT, ZEILE + 0.5, 22);
      y -= 4;
    } else {
      schreibe(t, normal, SCHRIFT, ZEILE + 0.5);
      y -= 7;
    }
  }

  const seiten = pdf.getPages();
  seiten.forEach((p, i) => {
    p.drawLine({ start: { x: RAND.l, y: 50 }, end: { x: rechts, y: 50 }, thickness: 0.5, color: C.linie });
    p.drawText(fuss, { x: RAND.l, y: 35, size: 8, font: normal, color: C.gedimmt });
    const nr = `Seite ${i + 1} von ${seiten.length}`;
    p.drawText(nr, { x: rechts - normal.widthOfTextAtSize(nr, 8), y: 35, size: 8, font: normal, color: C.gedimmt });
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
