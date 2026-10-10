import "server-only";
// Mail- und Nachrichtentexte. Reiner Text (kein HTML), damit Kundeneingaben nichts einschleusen.
// Rechtsblock der Bestellbestaetigung (Dr. Justus, Stand 2026-10-09, Endpruefung Magnus offen): Widerrufsbelehrung und Muster-Widerrufsformular
// WOERTLICH nach Anlage 1 und 2 zu Art. 246a EGBGB (Kaufvertrag, eine Sendung, Textbaustein b), bzw. Hinweis W2 bei
// individueller Ware. PFLICHTANGABEN_FREIGEGEBEN bleibt false bis Alex' Go. Solange false, weigert sich der Shop,
// mit PAYPAL_ENV=live Bestellungen anzunehmen (siehe bestellung.ts).
// Vorlage: D:\Apps\3D-Druck\shop\recht-texte\bestellbestaetigung-mail.md (Variante B).

import { LIEFERZEIT_TEXT } from "../config";
import { AGB_TEXT } from "./agb-text";
import { ANGEBOT_TEXTE } from "../angebot-texte";
import type { RechtsDokument } from "./pdf";
import { FARBE, absatz, esc, hinweisBox, inline, mailRahmen, textZuHtml, ueberschrift } from "./mail-layout";

export const PFLICHTANGABEN_FREIGEGEBEN = false;

const UNTERNEHMER = "Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail: as@sitekx.de";
const UNTERNEHMER_ANSCHRIFT = "Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim";
const STANDARD_SITE = "https://pixldrop.de";

/**
 * Enthaelt die Bestellung mindestens eine Standardware-Position (also eine ohne Widerrufsausschluss)?
 * Hat jede Position ein boolesches `individuell`-Flag, entscheidet es. Fehlt das Flag (DB-Funktion
 * shop_bestellung_mail_daten liefert es noch nicht), gilt vorsichtig: mehr als eine Position = Standardware moeglich.
 */
export function enthaeltStandardware(b: Pick<MailBestellung, "individuell" | "positionen">): boolean {
  if (!b.individuell) return true;
  const pos = b.positionen;
  if (pos.length > 0 && pos.every((p) => typeof p.individuell === "boolean")) {
    return pos.some((p) => !p.individuell);
  }
  return pos.length > 1;
}

/**
 * Rechtsblock fuer die Mail (Klartext, dauerhafter Datenträger, Art. 246a § 4 Abs. 3 EGBGB).
 * `individuell` = Bestellung enthaelt individuell gefertigte Ware; `mitStandardware` = enthaelt zusaetzlich
 * Standardware (dann steht zusaetzlich die volle Standard-Belehrung samt Formular im Block).
 */
export function pflichtangabenText(individuell: boolean, siteUrl?: string, mitStandardware = false): string {
  const site = (siteUrl || STANDARD_SITE).replace(/\/+$/, "");
  const agb = `Allgemeine Geschäftsbedingungen (in der bei deiner Bestellung gültigen Fassung): ${site}/3d-druck/agb`;
  const maengel = "Es gelten die gesetzlichen Mängelrechte (Gewährleistung).";
  if (individuell) {
    return [
      "HINWEIS ZUM WIDERRUF",
      "Für Stücke, die nach deinen Angaben individuell angefertigt werden (z. B. Tischschild oder Spruch-Untersetzer mit geändertem Wunschtext), besteht kein Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB). Deine gesetzlichen Mängelrechte bleiben unberührt.",
      "",
      ...(mitStandardware
        ? ["Für alle übrigen Artikel deiner Bestellung (Standardware, ohne geänderten Wunschtext) gilt die folgende Widerrufsbelehrung:", "", pflichtangabenText(false, siteUrl), ""]
        : [agb]),
    ].join("\n");
  }
  return [
    "WIDERRUFSBELEHRUNG",
    "",
    "Widerrufsrecht",
    "Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.",
    "",
    "Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.",
    "",
    `Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (${UNTERNEHMER}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.`,
    "",
    // Online-Widerrufsfunktion: Stelle gemaess Gestaltungshinweis 3 zu Anlage 1 (am Ende des Absatzes "Um Ihr Widerrufsrecht auszuueben ...").
    `Sie können Ihr Widerrufsrecht auch online unter ${site}/3d-druck/widerruf ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z. B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.`,
    "",
    "Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.",
    "",
    "Folgen des Widerrufs",
    "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.",
    "",
    "Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.",
    "",
    `Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an ${UNTERNEHMER_ANSCHRIFT} zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.`,
    "",
    "Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.",
    "",
    "Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.",
    "",
    "----------------------------------------",
    "",
    "MUSTER-WIDERRUFSFORMULAR",
    "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)",
    "",
    `– An ${UNTERNEHMER}:`,
    "– Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)",
    "– Bestellt am (*)/erhalten am (*)",
    "– Name des/der Verbraucher(s)",
    "– Anschrift des/der Verbraucher(s)",
    "– Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
    "– Datum",
    "",
    "(*) Unzutreffendes streichen.",
    "",
    "----------------------------------------",
    "",
    agb,
    maengel,
  ].join("\n");
}

/** Nur fuer Tests des Freigabe-Guards (dep-Override); wird in der echten Mail nicht mehr verwendet. */
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
  /** true = Position vom Widerruf ausgenommen (geaenderter Wunschtext). Kommt aus shop_positionen.individuell (Migration 08). */
  individuell?: boolean | null;
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
  /** Bestelldatum, Zahlungsdatum (ISO) und Transaktions-ID (PayPal-Capture): optional, kommen aus mail_daten */
  erstellt_am?: string | null;
  bezahlt_am?: string | null;
  capture_id?: string | null;
  /** gesetzt = Bestellung stammt aus einem Angebot (Angebots-Flow); dann kein Wunschtext-Freigabe-Satz. Muss aus mail_daten kommen. */
  anfrage_id?: string | null;
}

/** Deckt "[[PLATZHALTER" (Code) und "[PLATZHALTER" (AGB-Text) ab. */
export const PLATZHALTER_MARKER = "[PLATZHALTER";

/** Lieferzeit kommt aus lib/shop/config.ts (LIEFERZEIT_TEXT); null dort -> Platzhalter (blockiert die Freigabe). */
export const LIEFERZEIT_PLATZHALTER = "[[PLATZHALTER - Lieferzeit, Alex bestätigt]]";

export const KONTAKT_ALEX = "Alexander Sitek, Richard-Strauss-Straße 4, 86663 Asbach-Bäumenheim, E-Mail as@sitekx.de";

function alsDatum(iso: string | Date): Date | null {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Datum + Uhrzeit in deutscher Zeit, z. B. "08.10.2026, 14:03:21 Uhr (deutsche Zeit)". */
export function datumUhrzeit(iso: string | Date): string {
  const d = alsDatum(iso);
  if (!d) return "";
  const t = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d);
  return `${t} Uhr (deutsche Zeit)`;
}

export function datumKurz(iso: string | Date): string {
  const d = alsDatum(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/**
 * Teilt den Widerrufsblock in Belehrung und Muster-Widerrufsformular (Ueberschrift "MUSTER-WIDERRUFSFORMULAR").
 * Ohne diese Ueberschrift (z. B. Test-Override): alles ist Belehrung, kein Formular.
 */
export function teileWiderrufsblock(block: string): { belehrung: string; formular: string | null } {
  const zeilen = block.split("\n");
  const i = zeilen.findIndex((z) => z.trim() === "MUSTER-WIDERRUFSFORMULAR");
  if (i < 0) return { belehrung: block.trim(), formular: null };
  const strich = (z: string) => /^-{5,}$/.test(z.trim());
  const belehrung = zeilen.slice(0, i).join("\n").replace(/[\s-]+$/, "").trim();
  const rest = zeilen.slice(i);
  const ende = rest.findIndex((z, n) => n > 0 && strich(z));
  const formular = (ende < 0 ? rest : rest.slice(0, ende)).join("\n").trim();
  return { belehrung, formular };
}

export interface MailOptionen {
  /** z. B. https://pixldrop.de (fuer den Link zur Widerrufsfunktion) */
  siteUrl?: string;
  lieferzeit?: string | null;
  /** AGB-Klartext fuer den dauerhaften Datentraeger; Standard: AGB_TEXT aus agb-text.ts */
  agbText?: string;
}

/**
 * Mail 1 = Bestellbestaetigung = Annahme (Variante B): wird erst nach bestaetigter PayPal-Zahlung gesendet.
 * `block` = Rechtsblock der Mail (Widerrufsbelehrung/Formular/AGB; Standard: Platzhalter). Ist `freigegeben`
 * true, darf KEIN Platzhalter mehr im Text stehen (weder im Block noch bei der Lieferzeit): dann wird geworfen
 * statt eine unvollstaendige Mail zu senden.
 */
export function bestaetigungsMail(
  b: MailBestellung,
  blockOverride?: string,
  freigegeben: boolean = PFLICHTANGABEN_FREIGEGEBEN,
  opt: MailOptionen = {},
): { betreff: string; text: string; volltext: string; html: string; anhaenge: RechtsDokument[] } {
  const mitStandardware = b.individuell && enthaeltStandardware(b);
  const block = blockOverride ?? pflichtangabenText(b.individuell, opt.siteUrl, mitStandardware);
  const zeilen = b.positionen.map((p) => {
    const extras = [
      p.farbe ? `Farbe: ${p.farbe}` : null,
      ...Object.entries(p.optionen ?? {}).map(([k, v]) => `${k}: ${v}`),
      p.text ? `Wunschtext: „${p.text.replace(/\n/g, " / ")}“${p.schrift ? ` (${p.schrift})` : ""}` : null,
    ].filter(Boolean);
    return `- ${p.menge} x ${p.name} à ${eur(p.einzelpreis_cent)}${extras.length ? `\n    ${extras.join(", ")}` : ""}`;
  });
  const agbText = opt.agbText ?? AGB_TEXT;
  const lieferzeit = opt.lieferzeit ?? LIEFERZEIT_TEXT ?? LIEFERZEIT_PLATZHALTER;
  const bestelltAm = b.erstellt_am ? datumKurz(b.erstellt_am) : "";
  const zahlung =
    "Zahlung: PayPal" +
    (b.bezahlt_am ? `, bezahlt am ${datumKurz(b.bezahlt_am)}` : "") +
    (b.capture_id ? ` (Transaktion ${b.capture_id})` : "");
  const widerrufLink = opt.siteUrl ? `${opt.siteUrl.replace(/\/+$/, "")}/3d-druck/widerruf` : null;

  const kopf = [
    `Hallo ${b.name},`,
    "",
    `danke für deine Bestellung ${b.nummer}${bestelltAm ? ` vom ${bestelltAm}` : ""}. ${b.anfrage_id ? ANGEBOT_TEXTE.bestaetigungEinleitung : "Ich habe deine Zahlung erhalten und nehme deine Bestellung hiermit an. Damit ist der Kaufvertrag zustande gekommen."}`,
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
    zahlung,
    `Lieferzeit: ${lieferzeit} ab heute`,
    b.individuell ? `\n${b.anfrage_id ? ANGEBOT_TEXTE.bestaetigungAbsatz : "Hinweis: Dein Wunschtext wurde von mir geprüft und freigegeben. Dein Stück wird nach deinen Vorgaben gefertigt, ein Widerrufsrecht besteht dafür nicht (§ 312g Abs. 2 Nr. 1 BGB)."}` : "",
    "",
    `Verkäufer: ${KONTAKT_ALEX}`,
  ];
  const anhangHinweisVolltext =
    b.individuell && !mitStandardware
      ? "Diese Bestätigung dient als Beleg für deine Bestellung. Der Hinweis zum Widerruf und der Link zu den AGB stehen unten."
      : "Diese Bestätigung dient als Beleg für deine Bestellung. Widerrufsbelehrung, Muster-Widerrufsformular und der Link zu den AGB stehen unten.";
  // Volltext (Fallback, wenn die PDF-Erzeugung scheitert): kompletter Rechtsblock + AGB im Mailkoerper.
  const volltext = [
    ...kopf,
    "",
    anhangHinweisVolltext,
    widerrufLink && (!b.individuell || mitStandardware) ? `Du kannst deinen Vertrag auch online widerrufen: ${widerrufLink}` : "",
    "",
    block,
    "",
    "----------------------------------------",
    "",
    "ALLGEMEINE GESCHÄFTSBEDINGUNGEN",
    "(in der bei deiner Bestellung gültigen Fassung)",
    "",
    agbText,
    "",
    "----------------------------------------",
    "",
    "Viele Grüße",
    "Alex",
  ].join("\n");

  // Anhaenge als PDF: AGB immer; Widerrufsbelehrung + Muster-Widerrufsformular nur mit Standardware.
  const anhaenge: RechtsDokument[] = [{ dateiname: "AGB.pdf", titel: "Allgemeine Geschäftsbedingungen", text: agbText }];
  if (!b.individuell || mitStandardware) {
    const { belehrung, formular } = teileWiderrufsblock(blockOverride ?? pflichtangabenText(false, opt.siteUrl));
    anhaenge.push({ dateiname: "Widerrufsbelehrung.pdf", titel: "Widerrufsbelehrung", text: belehrung });
    if (formular) anhaenge.push({ dateiname: "Muster-Widerrufsformular.pdf", titel: "Muster-Widerrufsformular", text: formular });
  }
  const anhangListe = anhaenge.map((d) => `- ${d.titel} (PDF)`);
  const hinweisWiderruf =
    b.individuell && !mitStandardware
      ? pflichtangabenText(true, opt.siteUrl, false).split("\n").filter((z) => !z.startsWith("Allgemeine Geschäftsbedingungen (")).join("\n").trim()
      : b.individuell
        ? "Hinweis zum Widerruf: Für Stücke mit geändertem Wunschtext besteht kein Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB). Für alle übrigen Artikel deiner Bestellung gilt die beigefügte Widerrufsbelehrung."
        : "";
  const kurz = [
    ...kopf,
    ...(hinweisWiderruf ? ["", hinweisWiderruf] : []),
    "",
    "Im Anhang findest du (zum Aufbewahren):",
    ...anhangListe,
    "Diese Bestätigung dient als Beleg für deine Bestellung. Die AGB kannst du auch online abrufen: " + `${(opt.siteUrl || STANDARD_SITE).replace(/\/+$/, "")}/3d-druck/agb`,
    widerrufLink && (!b.individuell || mitStandardware) ? `Du kannst deinen Vertrag auch online widerrufen: ${widerrufLink}` : "",
    "",
    "Viele Grüße",
    "Alex",
  ].join("\n");

  if (
    freigegeben &&
    [block, agbText, volltext, kurz, ...anhaenge.map((d) => d.text)].some((t) => t.includes(PLATZHALTER_MARKER))
  ) {
    throw new Error("Pflichtangaben freigegeben, aber Platzhalter noch im Mailtext");
  }
  const html = bestaetigungsHtml(b, {
    bestelltAm, zahlung, lieferzeit, widerrufLink: widerrufLink && (!b.individuell || mitStandardware) ? widerrufLink : null,
    agbLink: `${(opt.siteUrl || STANDARD_SITE).replace(/\/+$/, "")}/3d-druck/agb`, hinweisWiderruf, anhangListe: anhaenge.map((d) => d.titel), siteUrl: opt.siteUrl,
  });
  return { betreff: `Bestellbestätigung ${b.nummer}: dein Kauf ist abgeschlossen`, text: kurz, volltext, html, anhaenge };
}

interface HtmlTeile {
  bestelltAm: string; zahlung: string; lieferzeit: string; widerrufLink: string | null; agbLink: string;
  hinweisWiderruf: string; anhangListe: string[]; siteUrl?: string;
}

const TD = `font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:22px;color:${FARBE.text};`;

/** HTML-Fassung der Bestellbestaetigung (gleiche Inhalte wie der Text, nur Layout). Optionen generisch aus der Position. */
function bestaetigungsHtml(b: MailBestellung, t: HtmlTeile): string {
  const zeilen = b.positionen.map((p) => {
    const extras = [
      p.farbe ? `Farbe: ${p.farbe}` : null,
      ...Object.entries(p.optionen ?? {}).map(([k, v]) => `${k}: ${v}`),
      p.text ? `Wunschtext: „${p.text.replace(/\n/g, " / ")}“${p.schrift ? ` (${p.schrift})` : ""}` : null,
    ].filter((x): x is string => Boolean(x));
    const sub = extras.map((e) => `<div class="gedimmt" style="font-size:13px;line-height:19px;color:${FARBE.gedimmt};padding-left:14px;">${esc(e)}</div>`).join("");
    const einzel = p.menge > 1 ? `<div class="gedimmt" style="font-size:12px;line-height:18px;color:${FARBE.gedimmt};">${p.menge} × ${esc(eur(p.einzelpreis_cent))}</div>` : "";
    return `<tr><td class="txt linie" valign="top" style="${TD}padding:10px 8px 10px 0;border-bottom:1px solid ${FARBE.linie};"><strong>${p.menge > 1 ? `${p.menge} × ` : ""}${esc(p.name)}</strong>${sub}</td>` +
      `<td class="txt linie" valign="top" align="right" style="${TD}padding:10px 0;border-bottom:1px solid ${FARBE.linie};white-space:nowrap;">${esc(eur(p.menge * p.einzelpreis_cent))}${einzel}</td></tr>`;
  }).join("");
  const summe = (label: string, wert: string, fett = false) =>
    `<tr><td class="txt" style="${TD}padding:3px 8px 3px 0;${fett ? "font-weight:bold;font-size:17px;padding-top:8px;" : ""}" align="right">${label}</td><td class="txt" align="right" style="${TD}padding:3px 0;white-space:nowrap;${fett ? "font-weight:bold;font-size:17px;padding-top:8px;" : ""}" width="110">${esc(wert)}</td></tr>`;
  const tabelle = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${zeilen}</table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${summe("Zwischensumme", eur(b.summe_waren_cent))}${summe("Versand (Deutschland)", eur(b.versand_cent))}${summe("Gesamtpreis", eur(b.gesamt_cent), true)}</table>` +
    absatz("Preis gemäß § 19 UStG ohne Ausweis der Umsatzsteuer.", `font-size:12px;line-height:18px;color:${FARBE.gedimmt};margin:8px 0 0 0;text-align:right;`);
  const feld = (kopf: string, inhalt: string) =>
    `<td valign="top" width="50%" class="txt" style="padding:0 12px 0 0;"><div class="kopf" style="font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:${FARBE.link};font-weight:bold;margin:0 0 6px 0;">${kopf}</div>${inhalt}</td>`;
  const anschrift = absatz(`${esc(b.name)}<br>${esc(b.strasse)}<br>${esc(b.plz)} ${esc(b.ort)}`, "margin:0;");
  const zahlungLieferzeit = absatz(`${inline(t.zahlung)}<br>Lieferzeit: ${esc(t.lieferzeit)} ab heute`, "margin:0;");
  const info = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>${feld("Lieferanschrift", anschrift)}${feld("Zahlung und Lieferung", zahlungLieferzeit)}</tr></table>`;
  const hinweise: string[] = [];
  if (b.individuell) hinweise.push(hinweisBox(esc(b.anfrage_id ? ANGEBOT_TEXTE.bestaetigungAbsatz.replace(/^Hinweis: /, "") : "Dein Wunschtext wurde von mir geprüft und freigegeben. Dein Stück wird nach deinen Vorgaben gefertigt, ein Widerrufsrecht besteht dafür nicht (§ 312g Abs. 2 Nr. 1 BGB).")));
  if (t.hinweisWiderruf && !t.hinweisWiderruf.startsWith("Hinweis zum Widerruf")) hinweise.push(textZuHtml(t.hinweisWiderruf));
  else if (t.hinweisWiderruf) hinweise.push(hinweisBox(esc(t.hinweisWiderruf)));
  const anhang = `${ueberschrift("Im Anhang (zum Aufbewahren)")}<ul style="margin:0 0 12px 0;padding:0 0 0 20px;${TD}">${t.anhangListe.map((a) => `<li class="txt" style="margin:0 0 3px 0;">${esc(a)} (PDF)</li>`).join("")}</ul>` +
    absatz(`Diese Bestätigung dient als Beleg für deine Bestellung. Die AGB kannst du auch online abrufen: ${inline(t.agbLink)}` +
      (t.widerrufLink ? `<br>Du kannst deinen Vertrag auch online widerrufen: ${inline(t.widerrufLink)}` : ""), "font-size:14px;");
  const inhalt = [
    absatz(`Hallo ${esc(b.name)},`),
    absatz(`danke für deine Bestellung <strong>${esc(b.nummer)}</strong>${t.bestelltAm ? ` vom ${esc(t.bestelltAm)}` : ""}. ${esc(b.anfrage_id ? ANGEBOT_TEXTE.bestaetigungEinleitung : "Ich habe deine Zahlung erhalten und nehme deine Bestellung hiermit an. Damit ist der Kaufvertrag zustande gekommen.")}`),
    ueberschrift("Deine Bestellung"), tabelle, info, ...hinweise, anhang,
    absatz("Viele Grüße<br>Alex", "margin-top:18px;"),
  ].join("\n");
  return mailRahmen({ titel: "Bestellbestätigung", vorschau: `Bestellung ${b.nummer}: Zahlung erhalten, Kaufvertrag zustande gekommen.`, siteUrl: t.siteUrl, inhalt });
}

/** Mail 1b: Ablehnung mit Erstattung (nur wenn eine bezahlte Bestellung nicht lieferbar ist). Keine Werbung. */
export function ablehnungsMail(
  b: { nummer: string; name: string; gesamt_cent: number },
  grund: string,
): { betreff: string; text: string } {
  const g = grund.replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  return {
    betreff: `Deine Bestellung ${b.nummer}: leider nicht lieferbar, Erstattung erfolgt`,
    text: [
      `Hallo ${b.name},`,
      "",
      `leider kann ich deine Bestellung ${b.nummer} nicht annehmen.${g ? ` Grund: ${g}` : ""}`,
      "Ein Kaufvertrag ist dadurch nicht zustande gekommen.",
      `Den gezahlten Betrag von ${eur(b.gesamt_cent)} erstatte ich dir unverzüglich über PayPal auf demselben Weg, mit dem du bezahlt hast.`,
      "",
      "Bei Fragen erreichst du mich unter as@sitekx.de.",
      "",
      "Viele Grüße",
      "Alex",
    ].join("\n"),
  };
}

export interface WiderrufMail {
  nummer: string;
  name: string;
  vertragAngabe: string;
  /** null = ganzer Vertrag */
  positionen: string | null;
  email: string;
  eingegangenAm: string | Date;
}

/** Eingangsbestaetigung (§ 356a Abs. 4 BGB): Inhalt der Erklaerung + Datum und Uhrzeit des Eingangs. */
export function widerrufEingangsMail(w: WiderrufMail): { betreff: string; text: string } {
  return {
    betreff: `Eingangsbestätigung deines Widerrufs ${w.nummer}`,
    text: [
      `Hallo ${w.name},`,
      "",
      "dein Widerruf ist bei mir eingegangen. Diese Mail ist die Eingangsbestätigung. Bitte bewahre sie auf.",
      "",
      `Eingegangen am: ${datumUhrzeit(w.eingegangenAm)}`,
      `Referenz: ${w.nummer}`,
      "",
      "Inhalt deiner Widerrufserklärung:",
      `- Name: ${w.name}`,
      `- Widerrufener Vertrag: ${w.vertragAngabe}`,
      `- Betroffen: ${w.positionen ?? "der gesamte Vertrag"}`,
      `- E-Mail für diese Bestätigung: ${w.email}`,
      "",
      "Die Erklärung gilt mit dem Absenden als bei mir eingegangen. Ich melde mich bei dir zur weiteren Abwicklung (Rücksendung, Erstattung).",
      "",
      `Kontakt: ${KONTAKT_ALEX}`,
      "",
      "Viele Grüße",
      "Alex",
    ].join("\n"),
  };
}

/** Telegram: NUR Nummer und Art, nie Namen/Anschrift/Texte. */
export const telegramBestellung = (nummer: string) => `Neue Bestellung ${nummer} (bezahlt)`;
export const telegramAnfrage = (nummer: string) => `Neue Anfrage ${nummer} (individueller Druck)`;
export const telegramPruefen = (nummer: string, grund: string) => `Zahlung prüfen: ${nummer} (${grund})`;
export const telegramWiderruf = (nummer: string, passt: boolean) =>
  `Neuer Widerruf ${nummer} (Zuordnung: ${passt ? "passt" : "bitte prüfen"})`;

export function alexMail(art: "Bestellung" | "Anfrage", nummer: string, adminUrl?: string): { betreff: string; text: string } {
  return {
    betreff: `Neue ${art} ${nummer}`,
    text: [
      `Neue ${art === "Bestellung" ? "bezahlte Bestellung" : "Anfrage"}: ${nummer}`,
      "",
      adminUrl
        ? `Details im Admin Panel: ${adminUrl}`
        : `Details im Admin Panel: 3D-Druck → ${art === "Bestellung" ? "Bestellungen" : "Anfragen"}.`,
      "",
      "Aus Datenschutzgründen stehen hier keine Kundendaten.",
    ].join("\n"),
  };
}

export function alexMailWiderruf(
  nummer: string,
  bestellnummer: string | null,
  abgleich: string,
  bestaetigungOk: boolean,
  adminUrl?: string,
): { betreff: string; text: string } {
  return {
    betreff: `Neuer Widerruf ${nummer}`,
    text: [
      `Neuer Widerruf über die Widerrufsfunktion: ${nummer}`,
      bestellnummer ? `Angegebene Bestellnummer: ${bestellnummer}` : "Keine Bestellnummer angegeben (siehe Vertragsangabe im Admin Panel).",
      `Abgleich mit der Bestellung: ${abgleich}`,
      bestaetigungOk
        ? "Eingangsbestätigung an den Verbraucher: versendet."
        : "ACHTUNG: Eingangsbestätigung konnte NICHT versendet werden. Bitte umgehend von Hand an den Verbraucher senden (§ 356a Abs. 4 BGB).",
      "",
      adminUrl ? `Details im Admin Panel: ${adminUrl}` : "Details im Admin Panel: 3D-Druck → Bestellungen.",
      "",
      "Aus Datenschutzgründen stehen hier keine Kundendaten.",
    ].join("\n"),
  };
}
