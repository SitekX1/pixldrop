import "server-only";
// Texte des Freigabe-Flows (Wunschtext-Bestellungen). Entwurf von Ben; die Endformulierung liegt bei Justus.
// DATENSCHUTZ: Telegram bekommt NUR Bestellnummer + Art + Hinweis "Details in deiner Mail / im Panel" (keine Namen, Anschriften,
// Wunschtexte, KEINE Freigabe-Links). Links und Wunschtext-Kurzliste stehen ausschliesslich in der Mail an Alex (eigene Mailbox).
import { KONTAKT_ALEX, TELEGRAM_HINWEIS, eur } from "./vorlagen";
import { PRODUKTE } from "../produkte";
import { GROESSEN, istGroesseId, STANDARD_GROESSE } from "../umbruch";
import { formatAnzeigeAusOptionen } from "../textformat";
import { SCHRIFTEN } from "../schriften";
import { FARBE, absatz, esc, hinweisBox, mailRahmen, ueberschrift } from "./mail-layout";
import { GRUEN, ROT, htmlErstattungOffen, klein, knopf, mehrzeilig } from "./mail-alex";

/** Mail "Erstattung offen" an Alex (Text unveraendert, dazu HTML). */
export function alexMailErstattungOffen(nummer: string): { betreff: string; text: string; html: string } {
  return {
    betreff: `Erstattung offen: ${nummer}`,
    text: `Die automatische PayPal-Erstattung für ${nummer} ist fehlgeschlagen. Bitte in PayPal erstatten.`,
    html: htmlErstattungOffen(nummer),
  };
}

/** Feste Grund-Textbausteine fuer die Ablehnung (Schluessel = DB-Check shop_bestellungen_freigabe_grund_chk). */
export const FREIGABE_GRUENDE = [
  { id: "marke", label: "Geschützte Marke / Rechte Dritter", text: "Dein Text enthält eine geschützte Marke, ein Logo oder eine geschützte Figur bzw. kann Rechte Dritter verletzen. Solche Texte darf ich nach Ziffer 9 Abs. 3 der AGB nicht fertigen." },
  { id: "unzulaessig", label: "Inhalt nicht zulässig", text: "Dein Text enthält Inhalte, die ich nach Ziffer 9 Abs. 3 der AGB nicht fertigen darf (z. B. rechtswidrige, beleidigende, diskriminierende, jugendgefährdende oder gewaltverherrlichende Inhalte oder verfassungsfeindliche Kennzeichen)." },
  { id: "unleserlich", label: "Nicht sauber druckbar", text: "Dein Text lässt sich in der gewählten Schrift und Größe auf dem Stück nicht sauber und lesbar drucken (z. B. wegen Länge, Zeichen oder Zeilenaufbau), sodass ich ihn so nicht fertigen kann." },
  { id: "sonstiges", label: "Sonstiger Grund", text: "Ich kann deine Bestellung mit diesem Text nicht annehmen. Bei Fragen dazu schreib mir bitte an as@sitekx.de." },
] as const;

/** Waehlbare Gruende (Freigabe-Seite). */
export type WaehlbarerGrund = (typeof FREIGABE_GRUENDE)[number]["id"];
/** Zusaetzlich 'frist': nur automatisch gesetzt (Frist von 24 h nach Zahlung ohne Entscheidung), nie waehlbar. */
export type FreigabeGrund = WaehlbarerGrund | "frist";
export const FRIST_BAUSTEIN = "Ich konnte deinen Text nicht rechtzeitig prüfen. Deshalb kommt kein Vertrag zustande und ich erstatte dir den vollen Betrag.";

/** Jeder in der DB mögliche Grund (für die Absage-Mail). */
export function istFreigabeGrund(v: unknown): v is FreigabeGrund {
  return v === "frist" || istWaehlbarerGrund(v);
}
/** Nur Gründe, die Alex auf der Freigabe-Seite wählen darf (ohne 'frist'). */
export function istWaehlbarerGrund(v: unknown): v is WaehlbarerGrund {
  return typeof v === "string" && FREIGABE_GRUENDE.some((g) => g.id === v);
}

export interface FreigabeLinks {
  ok: string;
  nein: string;
}

/** Position aus shop_freigabe_daten (nur die Felder, die die Kurzliste braucht; keine Kundendaten). */
/** Schrift-ID -> lesbarer Name (unbekannte IDs bleiben unverändert). */
const schriftName = (id: string): string => SCHRIFTEN.find((x) => x.id === id)?.name ?? id;

export interface KurzPosition { name: string; menge: number; text: string | null; schrift: string | null; optionen: Record<string, unknown> }

const kuerze = (t: string, max = 60) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

/** Kurzliste der Wunschtext-Positionen fuer die Mail an Alex: Text (auf 60 Zeichen gekuerzt), Schrift, Format/Groesse. */
export function wunschtextKurzliste(positionen: KurzPosition[]): string[] {
  return wunschtextDetails(positionen).map((d) => `- ${d.menge} × ${d.name}: „${kuerze(d.text)}“ (${d.teile.join(", ")})`);
}

/** Strukturierte Wunschtext-Positionen (Basis fuer Kurzliste und HTML-Tabelle). */
export function wunschtextDetails(positionen: KurzPosition[]): { menge: number; name: string; text: string; teile: string[]; details: { label: string; wert: string }[] }[] {
  return positionen.filter((p) => p.text).map((p) => {
    const pers = PRODUKTE.find((pr) => pr.name === p.name)?.personalisierung ?? null;
    const opt = Object.fromEntries(Object.entries(p.optionen).filter(([, v]) => typeof v === "string")) as Record<string, string>;
    const format = formatAnzeigeAusOptionen(pers, opt).filter(([k]) => k !== "Schriftgröße").map(([k, v]) => `${k}: ${v}`);
    const g = istGroesseId(opt.groesse) ? opt.groesse : STANDARD_GROESSE;
    const groesse = `Größe ${GROESSEN.find((x) => x.id === g)?.label ?? g}`;
    const sf = typeof p.optionen.Schriftfarbe === "string" ? `Schriftfarbe ${p.optionen.Schriftfarbe}` : null;
    const lf = typeof p.optionen.Linienfarbe === "string" ? `Linienfarbe ${p.optionen.Linienfarbe}` : null;
    const sn = typeof p.optionen["Schrift Name"] === "string" ? `Schrift Name ${p.optionen["Schrift Name"]}, Schrift Titel ${p.optionen["Schrift Titel"]}` : null;
    const teile = [sn ?? (p.schrift ? `Schrift ${schriftName(p.schrift)}` : null), sf, lf, ...format, groesse].filter(Boolean) as string[];
    const details: { label: string; wert: string }[] = [];
    if (sn) details.push({ label: "Schrift", wert: `Name ${p.optionen["Schrift Name"]}, Titel ${p.optionen["Schrift Titel"]}` });
    else if (p.schrift) details.push({ label: "Schrift", wert: schriftName(p.schrift) });
    if (sf) details.push({ label: "Schriftfarbe", wert: String(p.optionen.Schriftfarbe) });
    if (lf) details.push({ label: "Linienfarbe", wert: String(p.optionen.Linienfarbe) });
    for (const [k, v] of formatAnzeigeAusOptionen(pers, opt).filter(([k2]) => k2 !== "Schriftgröße")) details.push({ label: k, wert: v });
    details.push({ label: "Größe", wert: groesse.replace(/^Größe /, "") });
    return { menge: p.menge, name: p.name, text: p.text as string, teile, details };
  });
}

/** Frist-Zeitpunkt: Zahlungszeitpunkt + 24 h, "16.10.2026, 14:03 Uhr" in deutscher Zeit; null bei fehlendem/ungueltigem Datum. */
export function fristText(bezahltIso: string | null | undefined): string | null {
  if (!bezahltIso) return null;
  const t = Date.parse(bezahltIso);
  if (!Number.isFinite(t)) return null;
  const s = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t + 24 * 3_600_000));
  return `${s} Uhr`;
}

const NEIN_HINWEIS = "Absage-Mail an den Kunden, automatische PayPal-Erstattung des vollen Betrags";

function alexFreigabeHtml(nummer: string, links: FreigabeLinks, art: "neu" | "erinnerung", positionen: KurzPosition[], frist: string | null): string {
  const zeilen = wunschtextDetails(positionen).map((d) => {
    const det = d.details.map((x) => `<span class="gedimmt" style="color:${FARBE.gedimmt};">${esc(x.label)}:</span> ${esc(x.wert)}`).join("<br>");
    return `<tr><td class="zelle" valign="top" style="padding:12px 0;border-top:1px solid ${FARBE.linie};font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:${FARBE.text};">` +
      `<div class="txt" style="font-weight:bold;">${d.menge} × ${esc(d.name)}</div>` +
      `<div class="hl" style="margin:6px 0;padding:8px 12px;background:${FARBE.tint};color:${FARBE.tinte};font-size:16px;line-height:23px;font-weight:bold;border-radius:6px;">${mehrzeilig(kuerze(d.text, 160))}</div>` +
      `<div class="txt" style="font-size:13px;line-height:20px;">${det}</div></td></tr>`;
  }).join("");
  const tabelle = zeilen ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px 0;">${zeilen}</table>` : "";
  const inhalt = [
    absatz(esc(art === "erinnerung"
      ? `Erinnerung: Bestellung ${nummer} wartet noch auf deine Entscheidung. Der Kunde hat nur eine Eingangsbestätigung bekommen.`
      : `Bestellung ${nummer} ist bezahlt und enthält einen Wunschtext. Der Kunde hat nur eine Eingangsbestätigung bekommen.`), "font-size:16px;line-height:24px;"),
    hinweisBox(frist
      ? `<strong>Entscheide bis ${esc(frist)}</strong><br>Zugesagt ist die Entscheidung innerhalb von 24 Stunden nach Zahlungseingang. Danach wird automatisch abgesagt und erstattet.`
      : "<strong>Entscheide innerhalb von 24 Stunden nach Zahlungseingang.</strong>"),
    ueberschrift("Wunschtexte (gekürzt, Details auf der Freigabe-Seite)"),
    tabelle,
    `<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>`,
    knopf(links.ok, "Freigeben", GRUEN),
    klein("Vertragsschluss, die Bestätigung mit PDFs geht an den Kunden."),
    `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`,
    knopf(links.nein, "Ablehnen und erstatten", ROT),
    klein(`${esc(NEIN_HINWEIS)}.`),
    klein("Die Buttons führen auf eine Seite mit Bestätigungsschritt. Die Links sind 7 Tage gültig.", "margin-top:20px;"),
    klein(`Falls ein Button nicht funktioniert:<br>Freigeben: <span style="word-break:break-all;">${esc(links.ok)}</span><br>Ablehnen: <span style="word-break:break-all;">${esc(links.nein)}</span>`, "font-size:11px;line-height:16px;"),
    klein(esc("Aus Datenschutzgründen stehen hier keine Kundendaten.")),
  ].join("\n");
  return mailRahmen({ titel: `Wunschtext prüfen: ${nummer}`, vorschau: frist ? `Entscheide bis ${frist}` : `Bestellung ${nummer}: Wunschtext prüfen`, inhalt, ohneKachel: true });
}

/** Telegram: nur Nummer + Art (keine Links, keine Wunschtexte, keine Anzahl). Links und Texte stehen in der Mail an Alex. */
export const telegramFreigabe = (nummer: string): string =>
  `Wunschtext prüfen: ${nummer} (Frist 24 h nach Zahlung). ${TELEGRAM_HINWEIS}`;

export const telegramFreigabeErinnerung = (nummer: string, stunden: number): string =>
  `Erinnerung: Wunschtext prüfen, Bestellung ${nummer} wartet seit über ${stunden} Stunden (Frist 24 Stunden). ${TELEGRAM_HINWEIS}`;

export const telegramFristAbgesagt = (nummer: string): string =>
  `Frist abgelaufen, automatisch abgesagt: ${nummer} (Erstattung wird veranlasst). ${TELEGRAM_HINWEIS}`;

export const telegramErstattungOffen = (nummer: string): string =>
  `Erstattung fehlgeschlagen: ${nummer} - bitte in PayPal erstatten. ${TELEGRAM_HINWEIS}`;

export function alexMailFreigabe(
  nummer: string,
  links: FreigabeLinks,
  art: "neu" | "erinnerung",
  kurzliste: string[] = [],
  extra: { positionen?: KurzPosition[]; bezahltAm?: string | null } = {},
): { betreff: string; text: string; html: string } {
  const frist = fristText(extra.bezahltAm);
  return {
    betreff: art === "neu" ? `Wunschtext prüfen: Bestellung ${nummer}` : `Erinnerung: Wunschtext prüfen, Bestellung ${nummer}`,
    html: alexFreigabeHtml(nummer, links, art, extra.positionen ?? [], frist),
    text: [
      `Bestellung ${nummer} ist bezahlt und enthält einen Wunschtext. Der Kunde hat nur eine Eingangsbestätigung bekommen.`,
      frist ? `Entscheide bis ${frist} (24 Stunden nach Zahlungseingang zugesagt).` : "Die Entscheidung ist innerhalb von 24 Stunden nach Zahlungseingang zugesagt.",
      ...(kurzliste.length ? ["", "Wunschtexte (gekürzt, Details auf der Freigabe-Seite):", ...kurzliste] : []),
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
  const baustein = grund === "frist" ? FRIST_BAUSTEIN : (FREIGABE_GRUENDE.find((g) => g.id === grund)?.text ?? FREIGABE_GRUENDE[3].text);
  return {
    betreff: `Deine Bestellung ${b.nummer}: leider kann ich sie nicht annehmen, Erstattung erfolgt`,
    text: [
      `Hallo ${b.name},`,
      "",
      grund === "frist"
        ? `zu deiner Bestellung ${b.nummer} muss ich leider absagen. Es ist kein Kaufvertrag zustande gekommen.`
        : `ich habe deinen Wunschtext zu Bestellung ${b.nummer} geprüft und kann sie leider nicht annehmen. Es ist deshalb kein Kaufvertrag zustande gekommen.`,
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
