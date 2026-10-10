// Gemeinsamer HTML-Rahmen fuer alle Kundenmails des Shops (tabellenbasiert, Inline-CSS, ca. 600 px,
// Outlook/Gmail/GMX-tauglich, Dark-Mode-tolerant). Inhalte bleiben unveraendert: der Rahmen setzt nur Typografie
// und Optik um. Kundeneingaben werden IMMER escaped (esc), nie als HTML eingefuegt.
// Bilder: absolute URLs (public/shop/mail-logo-*.png), keine data-URIs. Eddie-Hintergrundbild bewusst weggelassen
// (Hintergrundbilder werden von Outlook/Gmail unzuverlaessig gerendert); Eddie steckt im Logo.

const STANDARD_SITE = "https://pixldrop.de";

export const FARBE = {
  bg: "#fdf7ec", karte: "#fffdf9", tinte: "#2e1c0f", text: "#2a2014", gedimmt: "#6b5a43",
  honig: "#f0bb55", link: "#9a5f0b", tint: "#f7e6bd", linie: "#ecdfc7",
} as const;

const SCHRIFT_TEXT = "'Segoe UI',Helvetica,Arial,sans-serif";
const SCHRIFT_KOPF = "'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif";

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
  `<h2 class="kopf" style="margin:26px 0 10px 0;font-family:${SCHRIFT_KOPF};font-size:12px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:${FARBE.link};font-weight:bold;">${esc(text)}</h2>`;

/** Hinweisbox (Honig-Tint, linker Balken). */
export const hinweisBox = (html: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;"><tr>` +
  `<td width="4" style="background:${FARBE.honig};font-size:0;line-height:0;">&nbsp;</td>` +
  `<td class="tint" style="background:${FARBE.tint};padding:12px 16px;font-family:${SCHRIFT_TEXT};font-size:14px;line-height:21px;color:${FARBE.tinte};">${html}</td></tr></table>`;

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
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="kachel" style="margin:28px 0 0 0;background:${FARBE.karte};border:1px solid ${FARBE.linie};border-radius:14px;"><tr><td style="padding:18px 20px;">` +
    `<img src="${site}/shop/mail-logo-sitekx.png" width="96" height="37" alt="SitekX" style="display:block;border:0;margin:0 0 10px 0;height:auto;">` +
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
}

/** Vollstaendiges HTML-Dokument im PixlDrop-Look. */
export function mailRahmen(o: RahmenOpt): string {
  const site = (o.siteUrl || STANDARD_SITE).replace(/\/+$/, "");
  const css = `
    @media (max-width:620px){ .aussen{width:100%!important} .pad{padding-left:18px!important;padding-right:18px!important} .logo{width:84px!important;height:auto!important} .titel{font-size:21px!important;line-height:26px!important} }
    @media (prefers-color-scheme:dark){
      body,.bg{background:#1f1428!important}
      .karte{background:#2b1c38!important}
      .txt,.kopf,.titel{color:#fff1dc!important}
      .gedimmt{color:#d8c3a5!important}
      .tint{background:#3a2749!important;color:#fff1dc!important}
      .kachel{background:#241631!important;border-color:#4a3560!important}
      .linie{border-color:#4a3560!important}
      a{color:#f0bb55!important}
    }`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.titel)}</title><style>${css}</style></head>
<body class="bg" style="margin:0;padding:0;background:${FARBE.bg};">
${o.vorschau ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${FARBE.bg};">${esc(o.vorschau)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${FARBE.bg};"><tr><td align="center" style="padding:20px 10px 32px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="aussen" style="width:600px;max-width:100%;">
<tr><td style="background:${FARBE.honig};height:6px;font-size:0;line-height:0;border-radius:14px 14px 0 0;">&nbsp;</td></tr>
<tr><td class="karte pad" style="background:${FARBE.karte};padding:22px 32px 30px 32px;border-radius:0 0 14px 14px;border:1px solid ${FARBE.linie};border-top:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" class="linie" style="padding:0 0 14px 0;border-bottom:1px solid ${FARBE.linie};"><div class="kopf" style="font-family:${SCHRIFT_KOPF};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${FARBE.link};font-weight:bold;margin:0 0 4px 0;">PixlDrop 3D-Druck</div><div class="titel kopf" style="font-family:${SCHRIFT_KOPF};font-size:24px;line-height:29px;font-weight:bold;color:${FARBE.tinte};">${esc(o.titel)}</div></td>
<td valign="middle" align="right" width="110" class="linie" style="padding:0 0 14px 12px;border-bottom:1px solid ${FARBE.linie};"><a href="${site}"><img class="logo" src="${site}/shop/mail-logo-pixldrop.png" width="104" height="95" alt="PixlDrop – Eddie’s Welt" style="display:block;border:0;height:auto;"></a></td>
</tr></table>
<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
${o.inhalt}
${kontaktKachel({ siteUrl: site })}
</td></tr>
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
