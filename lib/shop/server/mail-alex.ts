// HTML-Bausteine fuer die internen Mails AN ALEX (gleicher Rahmen wie die Kundenmails, aber ohne Kontaktkachel).
// Inhalte und Datenschutz-Regeln bleiben wie im Klartext: es kommen keine neuen Daten hinzu. Alles Eingegebene wird escaped.
import { FARBE, absatz, esc, hinweisBox, mailRahmen } from "./mail-layout";

const SCHRIFT_TEXT = "'Segoe UI',Helvetica,Arial,sans-serif";
const SCHRIFT_KOPF = "'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif";

export const GRUEN = "#2e7d32";
export const ROT = "#b3261e";

/** Mehrzeiliger Text (escaped, Zeilenumbrueche -> <br>). */
export const mehrzeilig = (s: string): string => esc(s).replace(/\r\n|\r|\n/g, "<br>");

/** Grosser Button (volle Breite, auch am Handy gut treffbar). `url` wird escaped. */
export function knopf(url: string, label: string, bg: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0 0;"><tr>` +
    `<td align="center" bgcolor="${bg}" style="background:${bg};border-radius:12px;">` +
    `<a class="knopf" href="${esc(url)}" style="display:block;padding:16px 20px;font-family:${SCHRIFT_KOPF};font-size:17px;line-height:22px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(label)}</a>` +
    `</td></tr></table>`;
}

/** Kleiner, gedimmter Text (Hinweise unter Buttons). `html` muss bereits escaped sein. */
export const klein = (html: string, stil = ""): string =>
  `<p class="gedimmt" style="margin:8px 0 0 0;font-family:${SCHRIFT_TEXT};font-size:13px;line-height:19px;color:${FARBE.gedimmt};${stil}">${html}</p>`;

/** Beschriftung/Wert-Tabelle. Werte sind Klartext (werden escaped); `html: true` erlaubt fertiges, selbst escaped HTML. */
export function infoTabelle(zeilen: { label: string; wert: string; html?: boolean; fett?: boolean }[]): string {
  const rows = zeilen.map((z, i) =>
    `<tr><td class="zelle gedimmt" valign="top" style="padding:9px 12px 9px 0;${i ? `border-top:1px solid ${FARBE.linie};` : ""}font-family:${SCHRIFT_TEXT};font-size:13px;line-height:19px;color:${FARBE.gedimmt};width:36%;">${esc(z.label)}</td>` +
    `<td class="zelle txt" valign="top" style="padding:9px 0;${i ? `border-top:1px solid ${FARBE.linie};` : ""}font-family:${SCHRIFT_TEXT};font-size:15px;line-height:22px;color:${FARBE.text};${z.fett ? "font-weight:bold;" : ""}">${z.html ? z.wert : mehrzeilig(z.wert)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">${rows}</table>`;
}

export interface AlexMailOpt {
  titel: string;
  vorschau: string;
  /** Hauptzeile unter dem Titel (Klartext) */
  lead?: string;
  zeilen?: { label: string; wert: string; html?: boolean; fett?: boolean }[];
  /** Warnbox (Klartext), z. B. wenn etwas von Hand erledigt werden muss */
  warnung?: string;
  /** Button */
  button?: { url: string; label: string };
  /** Zusatz-Inhalt (fertiges, escaped HTML) */
  extra?: string;
  /** Fussnote (Klartext) */
  fussnote?: string;
  siteUrl?: string;
}

/** Einheitliches, kurzes HTML fuer interne Mails an Alex. */
export function alexMailHtml(o: AlexMailOpt): string {
  const teile: string[] = [];
  if (o.lead) teile.push(absatz(esc(o.lead), "font-size:16px;line-height:24px;"));
  if (o.warnung) teile.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr><td width="4" style="background:${ROT};font-size:0;line-height:0;">&nbsp;</td><td class="tint" style="background:#fbe3e0;padding:12px 16px;font-family:${SCHRIFT_TEXT};font-size:14px;line-height:21px;color:#5c1410;"><strong>Achtung:</strong> ${mehrzeilig(o.warnung)}</td></tr></table>`);
  if (o.zeilen?.length) teile.push(infoTabelle(o.zeilen));
  if (o.extra) teile.push(o.extra);
  if (o.button) teile.push(knopf(o.button.url, o.button.label, FARBE.link));
  if (o.fussnote) teile.push(klein(mehrzeilig(o.fussnote), "margin-top:18px;"));
  return mailRahmen({ titel: o.titel, vorschau: o.vorschau, siteUrl: o.siteUrl, inhalt: teile.join("\n"), ohneKachel: true });
}

// ---------------------------------------------------------------------------
// Konkrete Mails (Texte entsprechen dem Klartext, nur gegliedert)
// ---------------------------------------------------------------------------
const DATENSCHUTZ = "Aus Datenschutzgründen stehen hier keine Kundendaten.";

export function htmlNeueBestellungOderAnfrage(art: "Bestellung" | "Anfrage", nummer: string, adminUrl?: string): string {
  const bestellung = art === "Bestellung";
  return alexMailHtml({
    titel: bestellung ? "Neue bezahlte Bestellung" : "Neue Anfrage",
    vorschau: `${bestellung ? "Neue bezahlte Bestellung" : "Neue Anfrage"}: ${nummer}`,
    zeilen: [{ label: bestellung ? "Bestellung" : "Anfrage", wert: nummer, fett: true }],
    ...(adminUrl
      ? { button: { url: adminUrl, label: "Details im Admin Panel" } }
      : { lead: `Details im Admin Panel: 3D-Druck → ${bestellung ? "Bestellungen" : "Anfragen"}.` }),
    fussnote: DATENSCHUTZ,
  });
}

export function htmlWiderruf(nummer: string, bestellnummer: string | null, abgleich: string, bestaetigungOk: boolean, adminUrl?: string): string {
  return alexMailHtml({
    titel: "Neuer Widerruf",
    vorschau: `Neuer Widerruf über die Widerrufsfunktion: ${nummer}`,
    zeilen: [
      { label: "Widerruf", wert: nummer, fett: true },
      { label: "Angegebene Bestellnummer", wert: bestellnummer ?? "keine (siehe Vertragsangabe im Admin Panel)" },
      { label: "Abgleich mit der Bestellung", wert: abgleich },
      { label: "Eingangsbestätigung", wert: bestaetigungOk ? "an den Verbraucher versendet" : "NICHT versendet" },
    ],
    ...(bestaetigungOk ? {} : { warnung: "Eingangsbestätigung konnte NICHT versendet werden. Bitte umgehend von Hand an den Verbraucher senden (§ 356a Abs. 4 BGB)." }),
    ...(adminUrl ? { button: { url: adminUrl, label: "Details im Admin Panel" } } : { lead: "Details im Admin Panel: 3D-Druck → Bestellungen." }),
    fussnote: DATENSCHUTZ,
  });
}

export function htmlErstattungOffen(nummer: string): string {
  return alexMailHtml({
    titel: "Erstattung offen",
    vorschau: `Die automatische PayPal-Erstattung für ${nummer} ist fehlgeschlagen.`,
    zeilen: [{ label: "Bestellung", wert: nummer, fett: true }],
    warnung: "Die automatische PayPal-Erstattung ist fehlgeschlagen. Bitte in PayPal erstatten.",
  });
}

export function htmlKontakt(name: string, email: string, nachricht: string): string {
  return alexMailHtml({
    titel: "Neue Kontaktanfrage",
    vorschau: "Neue Nachricht über das Kontaktformular (3D-Druck-Shop)",
    lead: "Neue Nachricht über das Kontaktformular (3D-Druck-Shop).",
    zeilen: [{ label: "Name", wert: name }, { label: "E-Mail", wert: email }],
    extra: hinweisBox(`<div style="white-space:normal;">${mehrzeilig(nachricht)}</div>`),
    fussnote: "Antworten geht direkt per Reply an den Absender.",
  });
}

export function htmlGrussAnfrage(f: { anlass: string; variante: string; textart: string; name: string; kontakt: string; nachricht: string }): string {
  return alexMailHtml({
    titel: "Neue Grußvideo-Anfrage",
    vorschau: `Neue Grußvideo-Anfrage über pixldrop.de (${f.anlass})`,
    lead: "Neue Grußvideo-Anfrage über pixldrop.de.",
    zeilen: [
      { label: "Anlass", wert: f.anlass },
      { label: "Variante", wert: f.variante },
      { label: "Textart", wert: f.textart },
      { label: "Name", wert: f.name },
      { label: "Kontakt", wert: f.kontakt },
      { label: "Nachricht", wert: f.nachricht },
    ],
  });
}
