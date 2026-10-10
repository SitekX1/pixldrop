import "server-only";
// Angebots-Flow fuer individuelle Anfragen (Migration 16):
//   Panel -> shop_angebot_anfordern (DB, nur eingeloggt) -> POST /api/shop/angebot/senden {id}
//   -> sendeAngebot: Token (nur Hash in der DB), Mail an den Kunden, Status angebot_gesendet.
//   Kunde -> /3d-druck/angebot/<token> -> liesAngebot (nur lesen) -> nimmAngebotAn (Bestellung + PayPal wie im Shop).
// Sicherheit: Preis, Versand, Lieferzeit und Empfaenger-Mail kommen ausschliesslich aus der DB (Snapshot beim Senden).
// Die "senden"-Route ist ohne Login aufrufbar, aber wirkungslos ohne vorherige Anforderung durch das Panel
// (DB-Zustand angebot_angefordert_am, wird beim Erzeugen verbraucht = genau ein Versand je Klick).
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import { starteZahlung, type Antwort, type Deps } from "./bestellung";
import { pruefeKunde } from "./validierung";
import { AGB_TEXT } from "./agb-text";
import { ANGEBOT_TEXTE } from "../angebot-texte";
import { PFLICHTANGABEN_FREIGEGEBEN, PLATZHALTER_MARKER, datumKurz, eur } from "./vorlagen";
import { absatz, esc, FARBE, hinweisBox, inline, mailRahmen, ueberschrift } from "./mail-layout";

export const ANGEBOT_GUELTIG_TAGE = 14;
const AGB_VERSION = "entwurf-2026-10-08";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ANGEBOT_TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** Nur zum Wiederverwenden von pruefeKunde: die echte Mail-Adresse kommt in der DB aus der Anfrage. */
const PLATZHALTER_MAIL = "kein-wert@angebot.invalid";

const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------
export function hashAngebotToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 256 Bit Zufall; Klartext nur fuer die Mail, in der DB liegt nur der SHA-256-Hash. */
export function erzeugeAngebotToken(zufall: () => Buffer = () => randomBytes(32)): { klar: string; hash: string } {
  const klar = zufall().toString("base64url");
  return { klar, hash: hashAngebotToken(klar) };
}

export const angebotLink = (env: Pick<ShopEnv, "siteUrl">, token: string): string => `${env.siteUrl}/3d-druck/angebot/${token}`;

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------
export interface AngebotMailDaten {
  nummer: string;
  name: string;
  beschreibung: string;
  farbe: string | null;
  preisCent: number;
  versandCent: number;
  lieferzeit: string | null;
  text: string | null;
  gueltigBis: string;
}

/**
 * Entfernt eine fuehrende reine Anrede-Zeile ("Hallo Erika,", "Hi!", "Liebe Erika,") aus dem Begleittext, weil die
 * Mail selbst schon mit "Hallo <Name>," beginnt. Konservativ: nur die erste Zeile, nur wenn sie kurz ist, nur aus
 * Anrede + Name besteht (kein weiteres Satzzeichen) und mit Komma/Ausrufezeichen endet.
 */
export function begleittextOhneAnrede(text: string | null): string | null {
  if (!text) return text;
  const t = text.replace(/\r/g, "").replace(/^\s+/, "");
  const m = /^(?:hallo|hi|hey|moin|liebe[rn]?|guten (?:tag|morgen|abend))(?:[ \t]+[^\n,!.?:;]{1,35})?[ \t]*[,!][ \t]*(?:\n|$)/i.exec(t);
  if (!m || m[0].replace(/\n$/, "").length > 50) return text;
  const rest = t.slice(m[0].length).replace(/^\s+/, "");
  return rest === "" ? null : rest;
}

/** Angebots-Mail im Look der Bestellbestaetigung. Rechtstexte stehen in lib/shop/angebot-texte.ts (Platzhalter, Justus). */
export function angebotsMail(d: AngebotMailDaten, link: string, siteUrl?: string): { betreff: string; text: string; html: string } {
  const gesamt = d.preisCent + d.versandCent;
  const begleit = begleittextOhneAnrede(d.text);
  const bis = datumKurz(d.gueltigBis);
  const betreff = `Dein Angebot ${d.nummer} – PixlDrop 3D-Druck`;
  const hinweis = ANGEBOT_TEXTE.mailHinweis;
  const lieferzeit = d.lieferzeit ? `${d.lieferzeit} nach Zahlungseingang` : null;
  const zeilen: [string, string][] = [
    ["Anfrage", d.nummer],
    ["Preis", eur(d.preisCent)],
    ["Versand", d.versandCent === 0 ? "kostenlos" : eur(d.versandCent)],
    ["Gesamt", eur(gesamt)],
    ...(lieferzeit ? ([["Lieferzeit", lieferzeit]] as [string, string][]) : []),
    ["Gültig bis", bis],
  ];
  const text = [
    `Hallo ${d.name},`,
    "",
    "vielen Dank für deine Anfrage. Hier ist mein Angebot für dich:",
    ...(begleit ? ["", begleit] : []),
    "",
    "DEINE ANFRAGE",
    d.beschreibung,
    ...(d.farbe ? ["", `Wunschfarbe: ${d.farbe}`] : []),
    "",
    "ANGEBOT",
    ...zeilen.map(([k, v]) => `${k}: ${v}`),
    "",
    `Das Angebot gilt bis ${bis}.`,
    "Angebot ansehen, annehmen und bezahlen:",
    link,
    "",
    hinweis,
    "",
    "Wenn du Fragen hast, antworte einfach auf diese Mail.",
    "",
    "Viele Grüße",
    "Alex (PixlDrop 3D-Druck)",
  ].join("\n");

  const zelle = "font-family:'Segoe UI',Helvetica,Arial,sans-serif;border-bottom:1px solid " + FARBE.linie + ";";
  const tabelle =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px 0;border-top:1px solid ${FARBE.linie};">` +
    zeilen
      .map(([k, v]) => {
        const fett = k === "Gesamt";
        return (
          `<tr><td class="gedimmt linie" style="padding:${fett ? 12 : 9}px 0;${zelle}font-size:14px;color:${FARBE.gedimmt};">${esc(k)}</td>` +
          `<td class="txt linie" align="right" style="padding:${fett ? 12 : 9}px 0;${zelle}font-size:${fett ? 20 : 14}px;font-weight:${fett || k === "Anfrage" ? "bold" : "normal"};color:${FARBE.text};">${esc(v)}</td></tr>`
        );
      })
      .join("") +
    `</table>`;
  const anfrageBox =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;"><tr>` +
    `<td width="3" style="background:${FARBE.linie};font-size:0;line-height:0;">&nbsp;</td>` +
    `<td class="txt" style="padding:4px 0 4px 14px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:${FARBE.gedimmt};">${esc(d.beschreibung).replace(/\r\n|\r|\n/g, "<br>")}${d.farbe ? `<br><br>Wunschfarbe: ${esc(d.farbe)}` : ""}</td></tr></table>`;
  // Annahme-Button: gross, volle Breite auf dem Handy (class="knopf" wird im Rahmen nicht gestylt, daher Breite per width=100% der Tabelle).
  const knopf =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px 0;"><tr>` +
    `<td align="center" bgcolor="${FARBE.honig}" style="background:${FARBE.honig};border-radius:12px;border:2px solid ${FARBE.tinte};">` +
    `<a href="${esc(link)}" style="display:block;padding:16px 20px;font-family:'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif;font-size:17px;line-height:22px;font-weight:bold;color:${FARBE.tinte};text-decoration:none;">Angebot ansehen und annehmen</a>` +
    `</td></tr></table>` +
    `<p class="gedimmt" style="margin:0 0 6px 0;text-align:center;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:19px;color:${FARBE.gedimmt};"><strong>Gültig bis ${esc(bis)}</strong> · danach läuft der Link ab</p>` +
    absatz(`Falls der Knopf nicht funktioniert: <a href="${esc(link)}" style="color:${FARBE.link};text-decoration:underline;word-break:break-all;">${esc(link)}</a>`, "font-size:12px;line-height:18px;text-align:center;margin-top:10px;");
  const inhalt = [
    absatz(`Hallo ${esc(d.name)},`),
    absatz("vielen Dank für deine Anfrage. Hier ist mein Angebot für dich:"),
    begleit ? absatz(inline(begleit)) : "",
    ueberschrift("Deine Anfrage"),
    anfrageBox,
    ueberschrift("Angebot"),
    tabelle,
    knopf,
    hinweisBox(esc(hinweis)),
    absatz("Wenn du Fragen hast, antworte einfach auf diese Mail.", "margin-top:18px;"),
    absatz("Viele Grüße<br>Alex (PixlDrop 3D-Druck)"),
  ].join("\n");
  const html = mailRahmen({ titel: "Dein Angebot", vorschau: `Angebot ${d.nummer}: ${eur(gesamt)}, gültig bis ${bis}`, siteUrl, inhalt });
  return { betreff, text, html };
}

// ---------------------------------------------------------------------------
// Senden (aufgerufen vom Admin Panel)
// ---------------------------------------------------------------------------
export interface SendeDeps {
  db: Db;
  env: ShopEnv;
  notifier: Benachrichtiger;
}

export interface SendeOptionen {
  /** Versandkosten laut Shop-Konfiguration (config.ts); null = nicht gesetzt -> kein Versand moeglich */
  versandCent: number | null;
  /** Lieferzeit aus den Panel-Einstellungen (holeEinstellungen) */
  lieferzeit: string | null;
  zufall?: () => Buffer;
}

export async function sendeAngebot(deps: SendeDeps, eingabe: unknown, opt: SendeOptionen): Promise<Antwort> {
  const id = obj(eingabe).id;
  if (typeof id !== "string" || !UUID.test(id)) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  if (opt.versandCent === null || !Number.isInteger(opt.versandCent) || opt.versandCent < 0) {
    return fehler(503, "versand_fehlt", "Die Versandkosten sind im Shop noch nicht gesetzt.");
  }
  const lz = (opt.lieferzeit ?? "").trim();
  if (lz === "" || /absprache/i.test(lz)) {
    return fehler(422, "lieferzeit_fehlt", "Bitte trage eine konkrete Lieferzeit (z. B. 3-5 Werktage) in den Shop-Einstellungen ein.");
  }
  const t = erzeugeAngebotToken(opt.zufall);

  let r: {
    ok: boolean; grund?: string; nummer?: string; name?: string; email?: string; beschreibung?: string; farbe?: string | null;
    preis_cent?: number; versand_cent?: number; lieferzeit?: string | null; text?: string | null; gueltig_bis?: string;
  };
  try {
    r = await deps.db.rpc("shop_angebot_erzeugen", {
      p_id: id,
      p_token_hash: t.hash,
      p_versand_cent: opt.versandCent,
      p_lieferzeit: opt.lieferzeit,
      p_gueltig_tage: ANGEBOT_GUELTIG_TAGE,
    });
  } catch (err) {
    console.error("Shop: Angebot erzeugen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", "Das Angebot kann gerade nicht gesendet werden.");
  }
  if (!r.ok) {
    if (r.grund === "nicht_moeglich") return fehler(409, "nicht_moeglich", "Für diese Anfrage liegt keine Sendeanforderung vor (oder sie ist nicht mehr offen).");
    if (r.grund === "ungueltige_eingabe") return fehler(422, "ungueltig", "Ungültige Angaben.");
    console.error("Shop: Angebot abgelehnt, Grund:", r.grund ?? "unbekannt");
    return fehler(500, "intern", "Das Angebot kann gerade nicht gesendet werden.");
  }
  if (!r.nummer || !r.name || !r.email || typeof r.preis_cent !== "number" || typeof r.versand_cent !== "number" || !r.gueltig_bis) {
    await deps.db.rpc("shop_angebot_zurueck", { p_id: id }).catch(() => undefined);
    return fehler(500, "intern", "Das Angebot kann gerade nicht gesendet werden.");
  }

  const mail = angebotsMail(
    {
      nummer: r.nummer, name: r.name, beschreibung: r.beschreibung ?? "", farbe: r.farbe ?? null, preisCent: r.preis_cent,
      versandCent: r.versand_cent, lieferzeit: r.lieferzeit ?? null, text: r.text ?? null, gueltigBis: r.gueltig_bis,
    },
    angebotLink(deps.env, t.klar),
    deps.env.siteUrl,
  );
  const gesendet = await deps.notifier.mailKunde(r.email, mail.betreff, mail.text, undefined, mail.html);
  if (!gesendet) {
    // Link entwerten: eine nicht zugestellte Mail soll keinen gueltigen Link hinterlassen.
    await deps.db.rpc("shop_angebot_zurueck", { p_id: id }).catch(() => undefined);
    return fehler(502, "mail", "Die Mail konnte nicht gesendet werden. Bitte versuch es noch einmal.");
  }
  try {
    const g = await deps.db.rpc<{ ok?: boolean }>("shop_angebot_gesendet", { p_id: id });
    if (!g || g.ok !== true) {
      // Link evtl. ungueltig (Status nicht gesetzt): Alex sendet das Angebot neu.
      return { status: 200, body: { ok: true, gesendet: true, statusGespeichert: false, hinweis: "Link evtl. ungültig, bitte Angebot neu senden", gueltigBis: r.gueltig_bis } };
    }
  } catch {
    // Mail ist raus, Status nicht gespeichert: Alex sieht es im Panel und kann erneut senden (neuer Link).
    return { status: 200, body: { ok: true, gesendet: true, statusGespeichert: false, hinweis: "Link evtl. ungültig, bitte Angebot neu senden", gueltigBis: r.gueltig_bis } };
  }
  return { status: 200, body: { ok: true, gesendet: true, statusGespeichert: true, gueltigBis: r.gueltig_bis } };
}

// ---------------------------------------------------------------------------
// Lesen (Annahme-Seite)
// ---------------------------------------------------------------------------
const GRUND_STATUS: Record<string, number> = { ungueltig: 404, abgelaufen: 410, bereits_angenommen: 409 };
const GRUND_TEXT: Record<string, string> = {
  ungueltig: "Dieser Link ist ungültig.",
  abgelaufen: "Dieses Angebot ist abgelaufen. Melde dich gern bei mir, dann erstelle ich ein neues.",
  bereits_angenommen: "Dieses Angebot wurde bereits angenommen.",
};

export async function liesAngebot(deps: { db: Db }, token: unknown): Promise<Antwort> {
  if (typeof token !== "string" || !ANGEBOT_TOKEN.test(token)) return fehler(404, "ungueltig", GRUND_TEXT.ungueltig);
  let r: Record<string, unknown> & { ok?: boolean; grund?: string };
  try {
    r = await deps.db.rpc("shop_angebot_lesen", { p_token_hash: hashAngebotToken(token) });
  } catch (err) {
    console.error("Shop: Angebot lesen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", "Gerade nicht möglich. Bitte versuch es gleich noch einmal.");
  }
  if (!r.ok) {
    const g = typeof r.grund === "string" && r.grund in GRUND_STATUS ? r.grund : "ungueltig";
    return fehler(GRUND_STATUS[g], g, GRUND_TEXT[g], typeof r.nummer === "string" ? { anfragenummer: r.nummer } : {});
  }
  return {
    status: 200,
    body: {
      ok: true,
      anfragenummer: r.nummer,
      name: r.name,
      beschreibung: r.beschreibung,
      farbe: r.farbe ?? null,
      preisCent: r.preis_cent,
      versandCent: r.versand_cent,
      gesamtCent: r.gesamt_cent,
      lieferzeit: r.lieferzeit ?? null,
      text: r.text ?? null,
      gueltigBis: r.gueltig_bis,
      zahlungOffen: r.zahlung_offen === true,
    },
  };
}

// ---------------------------------------------------------------------------
// Annehmen + Zahlung starten
// ---------------------------------------------------------------------------
export async function nimmAngebotAn(
  deps: Deps,
  eingabe: unknown,
  ctx: { ipHash: string; pausiert?: boolean; pauseText?: string },
): Promise<Antwort> {
  const { env } = deps;
  if (ctx.pausiert) return fehler(503, "pausiert", ctx.pauseText ?? "Bestellungen sind aktuell pausiert.");
  const frei = deps.pflichtangabenFreigegeben ?? PFLICHTANGABEN_FREIGEGEBEN;
  const agb = deps.agbText ?? AGB_TEXT;
  if (env.paypalEnv === "live" && (!frei || agb.includes(PLATZHALTER_MARKER))) {
    return fehler(503, "texte_fehlen", "Der Shop ist noch nicht freigegeben.");
  }
  const e = obj(eingabe);
  if (typeof e.t !== "string" || !ANGEBOT_TOKEN.test(e.t)) return fehler(404, "ungueltig", GRUND_TEXT.ungueltig);
  const k = pruefeKunde({ ...obj(e.kunde), email: PLATZHALTER_MAIL });
  if (!k.ok) return fehler(422, "kunde_ungueltig", "Bitte prüfe deine Angaben.", { felder: k.felder });
  const einw = obj(e.einwilligungen);
  if (einw.agb !== true) return fehler(422, "einwilligung_fehlt", "Bitte bestätige AGB und Widerrufsbelehrung.");
  if (einw.verzicht !== true) {
    return fehler(422, "einwilligung_fehlt", "Bitte bestätige den Widerrufsausschluss für dein individuell gefertigtes Stück.");
  }

  const { email: _ignoriert, ...kunde } = k.wert;
  void _ignoriert;
  let r: {
    ok: boolean; grund?: string; id?: string; nummer?: string; wiederholt?: boolean; gesamt_cent?: number;
    summe_waren_cent?: number; versand_cent?: number; anfragenummer?: string;
  };
  try {
    r = await deps.db.rpc("shop_angebot_annehmen", {
      p_token_hash: hashAngebotToken(e.t),
      p_ip_hash: ctx.ipHash,
      p_kunde: kunde,
      p_einwilligungen: { agb: true, verzicht: true },
      p_agb_version: AGB_VERSION,
    });
  } catch (err) {
    console.error("Shop: Angebot annehmen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", "Die Annahme ist gerade nicht möglich. Bitte versuch es später noch einmal.");
  }
  if (!r.ok || !r.id || !r.nummer || typeof r.gesamt_cent !== "number" || typeof r.summe_waren_cent !== "number" || typeof r.versand_cent !== "number") {
    switch (r.grund) {
      case "ungueltig":
        return fehler(404, "ungueltig", GRUND_TEXT.ungueltig);
      case "abgelaufen":
        return fehler(410, "abgelaufen", GRUND_TEXT.abgelaufen);
      case "bereits_angenommen":
        return fehler(409, "bereits_angenommen", GRUND_TEXT.bereits_angenommen);
      case "einwilligung_fehlt":
        return fehler(422, "einwilligung_fehlt", "Bitte bestätige die Pflichtangaben.");
      case "zu_viele":
        return fehler(429, "zu_viele", "Zu viele Versuche in kurzer Zeit. Bitte versuch es später noch einmal.");
      case "ueberlastet":
        return fehler(503, "ueberlastet", "Gerade ist sehr viel los. Bitte versuch es später noch einmal.");
      case "ungueltige_eingabe":
        return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.");
      default:
        console.error("Shop: Angebot-Annahme abgelehnt, Grund:", r.grund ?? "unbekannt");
        return fehler(500, "intern", "Die Annahme ist gerade nicht möglich.");
    }
  }

  // Ab hier wie im normalen Shop: PayPal-Order (Betraege aus der DB), Rueckkehr/Webhook buchen die Zahlung.
  return starteZahlung(deps, {
    id: r.id,
    nummer: r.nummer,
    wiederholt: r.wiederholt === true,
    gesamtCent: r.gesamt_cent,
    summeWarenCent: r.summe_waren_cent,
    versandCent: r.versand_cent,
    positionen: [{ name: `Individuelle Anfertigung ${r.anfragenummer ?? ""}`.trim(), menge: 1, einzelpreisCent: r.summe_waren_cent }],
    empfaenger: { name: kunde.name, strasse: kunde.strasse, plz: kunde.plz, ort: kunde.ort },
    cancelUrl: `${env.siteUrl}/3d-druck/angebot/${e.t}?zahlung=abgebrochen`,
  });
}
