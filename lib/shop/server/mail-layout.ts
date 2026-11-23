// Gemeinsamer HTML-Rahmen fuer alle Kundenmails des Shops (neuer Shop-Look: hell, Schwarz/Weiss/Greige, Inter mit Web-Safe-Fallback) (tabellenbasiert, Inline-CSS, ca. 600 px,
// Outlook/Gmail/GMX-tauglich, Dark-Mode-tolerant). Inhalte bleiben unveraendert: der Rahmen setzt nur Typografie
// und Optik um. Kundeneingaben werden IMMER escaped (esc), nie als HTML eingefuegt.
// Bilder: eingebettete CID-Anhaenge (cid:pixldrop-logo / cid:sitekx-logo, Daten in mail-logos.ts; Anhaenge siehe
// logoAnhaengeFuer), weil Outlook externe Bilder blockt und die Vorschau-Domain geschuetzt sein kann. Keine data-URIs. Logo = neues rundes Shop-Logo (mail-logos.ts).

import { PIXLDROP_MAIL_LOGO_BASE64, SITEKX_MAIL_LOGO_BASE64 } from "./mail-logos";

export const CID_PIXLDROP = "pixldrop-logo";
export const CID_SITEKX = "sitekx-logo";

export interface InlineAnhang { filename: string; content: Buffer; contentType: string; cid: string; contentDisposition: "inline" }

/** Inline-Anhaenge (CID) fuer alle Logos, auf die das HTML per cid: verweist. */
export function logoAnhaengeFuer(html: string): InlineAnhang[] {
  const out: InlineAnhang[] = [];
  if (html.includes(`cid:${CID_PIXLDROP}`)) out.push({ filename: "pixldrop-logo.png", content: Buffer.from(PIXLDROP_MAIL_LOGO_BASE64, "base64"), contentType: "image/png", cid: CID_PIXLDROP, contentDisposition: "inline" });
  if (html.includes(`cid:${CID_SITEKX}`)) out.push({ filename: "sitekx-logo.png", content: Buffer.from(SITEKX_MAIL_LOGO_BASE64, "base64"), contentType: "image/png", cid: CID_SITEKX, contentDisposition: "inline" });
  return out;
}

/** Nur fuer Browser-Vorschau: cid:-Verweise durch data-URIs ersetzen. */
export function cidZuDataUri(html: string): string {
  return html
    .replace(`cid:${CID_PIXLDROP}`, `data:image/png;base64,${PIXLDROP_MAIL_LOGO_BASE64}`)
    .replace(`cid:${CID_SITEKX}`, `data:image/png;base64,${SITEKX_MAIL_LOGO_BASE64}`);
}

const STANDARD_SITE = "https://pixldrop.de";

export const FARBE = {
  bg: "#F4F1EB", karte: "#ffffff", tinte: "#161513", text: "#161513", gedimmt: "#6B665D",
  honig: "#C9C2B4", link: "#161513", tint: "#F1ECE4", linie: "#E6E0D6",
} as const;

// Inter ist in Mailclients meist nicht installiert: Fallback auf die Systemschrift (Apple/Android/Windows).
export const SCHRIFT_TEXT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const SCHRIFT_KOPF = SCHRIFT_TEXT;

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Escaped Text, URLs werden zu Links, Zeilenumbrueche zu <br>. */
export function inline(s: string): string {
  const e = esc(s);
  return e
    .replace(/(https?:\/\/[^\s<]+?)([.,;:)]*)(?=\s|$|<)/g, (_m, url: string, rest: string) => `<a href="${url}" style="color:${FARBE.link};text-decoration:underline;">${url}</a>${rest}`)
    .replace(/\n/g, "<br>");
}

export const absatz = (html: string, stil = ""): string =>
  `<p class="txt" style="margin:0 0 14px 0;font-family:${SCHRIFT_TEXT};font-size:15px;line-height:23px;color:${FARBE.text};${stil}">${html}</p>`;

export const ueberschrift = (text: string): string =>
  `<h2 class="gedimmt" style="margin:28px 0 10px 0;font-family:${SCHRIFT_KOPF};font-size:12px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${FARBE.gedimmt};font-weight:700;">${esc(text)}</h2>`;

/** Hinweisbox (Honig-Tint, linker Balken). */
export const hinweisBox = (html: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;"><tr>` +
  // Balken als Rand der Zelle (eine Zelle): eine schmale Extra-Zelle mit &nbsp; wird in Outlook versetzt/kuerzer dargestellt.
  `<td class="tint" style="background:${FARBE.tint};border-left:3px solid ${FARBE.tinte};border-radius:8px;padding:14px 16px;font-family:${SCHRIFT_TEXT};font-size:14px;line-height:21px;color:${FARBE.tinte};">${html}</td></tr></table>`;

/**
 * Klartext (wie bisher als text/plain gesendet) -> HTML-Absaetze. Leerzeile = Absatz, Zeilen mit "- " = Liste,
 * Zeile aus Strichen = Trennlinie, Zeile in GROSSBUCHSTABEN = Zwischenueberschrift.
 */
export function textZuHtml(text: string): string {
  const bloecke = text.replace(/\r/g, "").split(/\n{2,}/);
  const out: string[] = [];
  for (const b of bloecke) {
    const zeilen = b.split("\n").filter((z) => z.trim() !== "");
    if (!zeilen.length) continue;
    if (zeilen.length === 1 && /^-{5,}$/.test(zeilen[0].trim())) {
      out.push(`<hr style="border:0;border-top:1px solid ${FARBE.linie};margin:18px 0;">`);
      continue;
    }
    if (zeilen.length === 1 && zeilen[0].length < 70 && /[A-ZÄÖÜ]{4}/.test(zeilen[0]) && zeilen[0] === zeilen[0].toUpperCase()) {
      out.push(ueberschrift(zeilen[0]));
      continue;
    }
    if (zeilen.every((z) => /^\s*[-–]\s/.test(z))) {
      out.push(`<ul style="margin:0 0 14px 0;padding:0 0 0 20px;font-family:${SCHRIFT_TEXT};font-size:15px;line-height:23px;color:${FARBE.text};">` +
        zeilen.map((z) => `<li class="txt" style="margin:0 0 4px 0;">${inline(z.replace(/^\s*[-–]\s/, ""))}</li>`).join("") + `</ul>`);
      continue;
    }
    out.push(absatz(zeilen.map(inline).join("<br>")));
  }
  return out.join("\n");
}

export interface KontaktKachelOpt { siteUrl?: string }

/** Kontaktkachel wie im Shop-Footer (ShopShell.tsx, KONTAKT_MIT_ANSCHRIFT = true). */
export function kontaktKachel(opt: KontaktKachelOpt = {}): string {
  const site = (opt.siteUrl || STANDARD_SITE).replace(/\/+$/, "");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="kachel" style="margin:28px 0 0 0;background:${FARBE.karte};border:1px solid ${FARBE.linie};border-radius:12px;"><tr><td style="padding:18px 20px;">` +
    `<img src="cid:${CID_SITEKX}" width="80" height="31" alt="SitekX" style="display:block;border:0;margin:0 0 10px 0;height:auto;">` +
    `<div class="kopf" style="font-family:${SCHRIFT_KOPF};font-size:13px;line-height:18px;font-weight:bold;color:${FARBE.tinte};margin:0 0 6px 0;">Hersteller und Verkäufer / Kontakt</div>` +
    `<div class="gedimmt" style="font-family:${SCHRIFT_TEXT};font-size:13px;line-height:20px;color:${FARBE.gedimmt};">Alexander Sitek<br>Richard-Strauss-Straße 4<br>86663 Asbach-Bäumenheim</div>` +
    `<div class="gedimmt" style="font-family:${SCHRIFT_TEXT};font-size:13px;line-height:20px;color:${FARBE.gedimmt};margin-top:6px;">` +
    `<a href="mailto:as@sitekx.de" style="color:${FARBE.link};text-decoration:underline;">as@sitekx.de</a> · <a href="${site}/impressum" style="color:${FARBE.link};text-decoration:underline;">Impressum</a></div>` +
    `</td></tr></table>`;
}

export interface RahmenOpt {
  /** Titel im Kopfband (z. B. "Bestellbestätigung") und <title> */
  titel: string;
  /** versteckter Vorschautext (Posteingang) */
  vorschau?: string;
  siteUrl?: string;
  /** Inhalt (bereits HTML, Nutzerdaten escaped) */
  inhalt: string;
  /** true = ohne Kontaktkachel (interne Mails an Alex) */
  ohneKachel?: boolean;
}

/** Vollstaendiges HTML-Dokument im PixlDrop-Look. */
export function mailRahmen(o: RahmenOpt): string {
  const site = (o.siteUrl || STANDARD_SITE).replace(/\/+$/, "");
  const css = `
    @media (max-width:620px){ .aussen{width:100%!important} .pad{padding-left:20px!important;padding-right:20px!important} .logo{width:56px!important;height:56px!important} .titel{font-size:24px!important;line-height:30px!important} }
    @media (prefers-color-scheme:dark){
      body,.bg{background:#121110!important}
      .karte{background:#1c1b19!important;border-color:#33312d!important}
      .txt,.kopf,.titel{color:#F3F0EA!important}
      .gedimmt{color:#B9B3A6!important}
      .tint{background:#2a2824!important;color:#F3F0EA!important;border-color:#F3F0EA!important}
      .kachel{background:#232220!important;border-color:#3a3732!important}
      .linie{border-color:#3a3732!important}
      a{color:#F3F0EA!important}
      td.knopf-ink{background:#F3F0EA!important}
      a.knopf-ink{color:#161513!important}
      a.knopf{color:#ffffff!important}
      .zelle{border-color:#3a3732!important}
      .hl{background:#2a2824!important;color:#F3F0EA!important}
    }`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.titel)}</title><style>${css}</style></head>
<body class="bg" style="margin:0;padding:0;background:${FARBE.bg};">
${o.vorschau ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${FARBE.bg};">${esc(o.vorschau)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${FARBE.bg};"><tr><td align="center" style="padding:24px 10px 36px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="aussen" style="width:600px;max-width:100%;">
<tr><td class="karte pad" style="background:${FARBE.karte};padding:28px 36px 34px 36px;border-radius:16px;border:1px solid ${FARBE.linie};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" width="72" style="padding:0 16px 0 0;"><a href="${site}"><img class="logo" src="cid:${CID_PIXLDROP}" width="64" height="64" alt="Pixldrop 3D-Druck-Shop" style="display:block;border:0;border-radius:32px;"></a></td>
<td valign="middle"><div class="kopf" style="font-family:${SCHRIFT_KOPF};font-size:16px;line-height:20px;font-weight:700;letter-spacing:-0.2px;color:${FARBE.tinte};">Pixldrop</div><div class="gedimmt" style="font-family:${SCHRIFT_KOPF};font-size:11px;line-height:16px;letter-spacing:1.2px;text-transform:uppercase;color:${FARBE.gedimmt};">3D-Druck-Shop</div></td>
</tr></table>
<div class="linie" style="height:22px;line-height:22px;font-size:0;border-bottom:1px solid ${FARBE.linie};">&nbsp;</div>
<h1 class="titel kopf" style="margin:26px 0 20px 0;font-family:${SCHRIFT_KOPF};font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.5px;color:${FARBE.tinte};">${esc(o.titel)}</h1>
${o.inhalt}
${o.ohneKachel ? "" : kontaktKachel({ siteUrl: site })}
</td></tr>
<tr><td align="center" class="gedimmt" style="padding:18px 10px 0 10px;font-family:${SCHRIFT_TEXT};font-size:12px;line-height:18px;color:${FARBE.gedimmt};"><a href="${site}" style="color:${FARBE.gedimmt};text-decoration:underline;">pixldrop.de</a> · <a href="${site}/impressum" style="color:${FARBE.gedimmt};text-decoration:underline;">Impressum</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Einfache Kundenmail (Klartext -> HTML im Rahmen). Titel = Betreff. */
export function einfacheMailHtml(betreff: string, text: string, siteUrl?: string): string {
  const absaetze = text.replace(/\r/g, "").split(/\n{2,}/);
  const vorschau = (absaetze[1] ?? absaetze[0] ?? "").replace(/\s+/g, " ").slice(0, 110);
  // "Viele Grüße / Alex" nicht als Kontakt-Listen behandeln: bleibt Absatz mit <br>
  return mailRahmen({ titel: betreff, vorschau, siteUrl, inhalt: textZuHtml(text) });
}
