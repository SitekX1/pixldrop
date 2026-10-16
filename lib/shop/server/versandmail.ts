import "server-only";
// Versandmail "Deine Bestellung ist unterwegs" (Panel: Bestellungen > "Als versendet markieren").
// Ablauf: Panel-Route (Session + Admin) -> POST /api/shop/admin/versendet (Header x-shop-admin-secret) -> sendeVersandmail:
//   shop_versand_markieren (DB prueft Voraussetzungen, setzt Status 'versendet' + Sendungsnummer, liefert die Mail-Daten)
//   -> shop_versandmail_claim (Flag atomar VOR dem Versand, genau eine Mail je Bestellung) -> Mail -> bei Fehler Claim zurueck.
// Ein Mailfehler blockiert den Status NICHT: der Status 'versendet' steht dann trotzdem; die Antwort sagt mail:"fehler",
// das Panel zeigt "Mail fehlgeschlagen, erneut senden". Empfaenger, Name, Anschrift, Versandart kommen NUR aus der DB.
import { createHash, timingSafeEqual } from "node:crypto";
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import type { Antwort } from "./bestellung";
import { ereignis } from "./bestaetigung";
import { KONTAKT_ALEX } from "./vorlagen";
import { absatz, esc, hinweisBox, mailRahmen } from "./mail-layout";
import { VERSANDART_NAME, istVersandArt } from "../versand";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMMER_FORM = /^[A-Za-z0-9]{6,40}$/;

// ---------------------------------------------------------------------------
// Admin-Secret (Panel -> Shop)
// ---------------------------------------------------------------------------
export const ADMIN_SECRET_MIN = 32;

/** Konstantzeit-Vergleich ueber SHA-256 (gleiche Laenge, kein Laengen-Leck). Zu kurzes/fehlendes Secret = immer false. */
export function adminSecretOk(erwartet: string | undefined, geliefert: string | null | undefined): boolean {
  if (!erwartet || erwartet.length < ADMIN_SECRET_MIN || !geliefert) return false;
  const a = createHash("sha256").update(erwartet).digest();
  const b = createHash("sha256").update(geliefert).digest();
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Sendungsnummer und Tracking-Link
// ---------------------------------------------------------------------------
/** Leerzeichen/Bindestriche entfernen, Grossbuchstaben; nur 6 bis 40 Buchstaben/Ziffern. Leer = keine Nummer. */
export function normalisiereSendungsnummer(v: unknown): { ok: true; nr: string | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, nr: null };
  if (typeof v !== "string" || v.length > 80) return { ok: false };
  const n = v.replace(/[\s-]+/g, "").toUpperCase();
  if (n === "") return { ok: true, nr: null };
  return NUMMER_FORM.test(n) ? { ok: true, nr: n } : { ok: false };
}

/**
 * Tracking-Link je Versandart (Formate nach Alex' Vorgabe; DHL und Hermes unterstuetzen die Nummer im Link, ohne Gewaehr, dass
 * der Anbieter das Format spaeter aendert: die Mail zeigt die Nummer deshalb IMMER auch als Text). Brief: kein Link.
 */
export function trackingLink(versandart: string | null | undefined, nr: string | null): string | null {
  if (!nr || !NUMMER_FORM.test(nr)) return null;
  if (versandart === "dhl") return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(nr)}`;
  if (versandart === "hermes") return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${encodeURIComponent(nr)}`;
  if (versandart === "brief") return null;
  // Versandart nicht festgelegt (z. B. Bestellung aus einem Angebot, Standard "paket"): Anbieter am Nummernformat erkennen.
  // DHL: JD.../JJD... oder 12/20 Ziffern; Hermes: 14 Ziffern. Sonst kein Link (die Nummer steht immer auch als Text in der Mail).
  if (/^(JJD|JD)\d{6,}[A-Z]{0,3}$/.test(nr) || /^(\d{12}|\d{20})$/.test(nr)) return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(nr)}`;
  if (/^\d{14}$/.test(nr)) return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${encodeURIComponent(nr)}`;
  return null;
}

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------
export interface VersandMailDaten {
  nummer: string;
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  versandart: string | null;
  sendungsnummer: string | null;
}

export function versandMail(b: VersandMailDaten, siteUrl: string): { betreff: string; text: string; html: string } {
  const site = siteUrl.replace(/\/+$/, "");
  const art = b.versandart && istVersandArt(b.versandart) ? b.versandart : null;
  const dienst = art ? VERSANDART_NAME[art] : null;
  const nr = b.sendungsnummer && NUMMER_FORM.test(b.sendungsnummer) ? b.sendungsnummer : null;
  const brief = art === "brief";
  const link = brief ? null : trackingLink(art, nr);
  const betreff = `Deine Bestellung ${b.nummer} ist unterwegs`;

  // Absatz zum Versandweg (Text und HTML teilen dieselben Aussagen)
  const versandSatz = brief
    ? "Sie kommt als Brief (Deutsche Post) zu dir. Ein Brief hat keine Sendungsnummer und keine Sendungsverfolgung, er landet direkt in deinem Briefkasten."
    : nr
      ? `Ich habe sie ${dienst ? `mit ${dienst} ` : ""}auf den Weg gebracht. Mit der Sendungsnummer kannst du sie verfolgen.`
      : `Ich habe sie ${dienst ? `mit ${dienst} ` : ""}auf den Weg gebracht. Eine Sendungsnummer kann ich dir gerade nicht nennen. Wenn du eine brauchst, schreib mir kurz.`;
  const problem = "Sollte bei der Ankunft etwas nicht stimmen (zum Beispiel ein Transportschaden oder ein fehlendes Teil), schreib mir bitte kurz an as@sitekx.de, dann kümmere ich mich darum.";

  const text = [
    `Hallo ${b.name},`,
    "",
    `gute Nachrichten: Deine Bestellung ${b.nummer} ist unterwegs zu dir.`,
    versandSatz,
    ...(!brief && nr ? ["", `Sendungsnummer: ${nr}`, ...(link ? [`Sendung verfolgen: ${link}`] : [])] : []),
    "",
    "Lieferanschrift:",
    b.name,
    b.strasse,
    `${b.plz} ${b.ort}`,
    "",
    problem,
    "",
    "Viele Grüße",
    "Alex",
    "",
    `Verkäufer: ${KONTAKT_ALEX} (Impressum: ${site}/impressum)`,
  ].join("\n");

  const trackingBox = !brief && nr
    ? hinweisBox(`<strong>Sendungsnummer</strong><br><span style="font-size:17px;letter-spacing:.5px;">${esc(nr)}</span>` +
        (link ? `<br><a href="${esc(link)}" style="text-decoration:underline;">Sendung verfolgen${dienst ? ` bei ${esc(dienst)}` : ""}</a>` : ""))
    : "";
  const inhalt = [
    absatz(`Hallo ${esc(b.name)},`),
    absatz(`gute Nachrichten: Deine Bestellung <strong>${esc(b.nummer)}</strong> ist unterwegs zu dir. ${esc(versandSatz)}`),
    trackingBox,
    absatz(`<strong>Lieferanschrift</strong><br>${esc(b.name)}<br>${esc(b.strasse)}<br>${esc(b.plz)} ${esc(b.ort)}`, "margin-top:18px;"),
    absatz(esc(problem)),
    absatz("Viele Grüße<br>Alex", "margin-top:18px;"),
  ].filter(Boolean).join("\n");
  const html = mailRahmen({ titel: "Deine Bestellung ist unterwegs", vorschau: `Bestellung ${b.nummer} ist auf dem Weg zu dir.`, siteUrl: site, inhalt });
  return { betreff, text, html };
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------
const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

const GRUND_TEXT: Record<string, { status: number; text: string }> = {
  nicht_gefunden: { status: 404, text: "Bestellung nicht gefunden." },
  nicht_bezahlt: { status: 409, text: "Die Bestellung ist noch nicht bezahlt." },
  freigabe_offen: { status: 409, text: "Die Wunschtext-Freigabe steht noch aus." },
  storniert: { status: 409, text: "Die Bestellung ist storniert oder abgelehnt." },
  erstattet: { status: 409, text: "Die Bestellung ist bereits erstattet." },
  anonymisiert: { status: 409, text: "Die Kundendaten sind nicht mehr vorhanden." },
  ungueltige_eingabe: { status: 422, text: "Ungültige Eingabe." },
};

interface MarkierDaten {
  ok: boolean;
  grund?: string;
  nummer?: string;
  name?: string;
  email?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  versandart?: string | null;
  sendungsnummer?: string | null;
  status?: string;
  mail_schon?: boolean;
}

export interface VersandDeps {
  db: Db;
  env: ShopEnv;
  notifier: Benachrichtiger;
}

/** Body: { id: <Bestell-UUID>, sendungsnummer?: string|null, erneut?: boolean }. */
export async function sendeVersandmail(deps: VersandDeps, body: unknown): Promise<Antwort> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !["id", "sendungsnummer", "erneut"].includes(k))) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  if (typeof b.id !== "string" || !UUID.test(b.id)) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  if (b.erneut !== undefined && typeof b.erneut !== "boolean") return fehler(400, "ungueltig", "Ungültige Anfrage.");
  const nr = normalisiereSendungsnummer(b.sendungsnummer);
  if (!nr.ok) return fehler(422, "sendungsnummer_ungueltig", "Die Sendungsnummer darf nur aus Buchstaben und Ziffern bestehen (6 bis 40 Zeichen).");
  const id = b.id;
  const erneut = b.erneut === true;

  let claimed = false;
  try {
    let d = await deps.db.rpc<MarkierDaten>("shop_versand_markieren", { p_id: id, p_sendungsnummer: nr.nr });
    if (d.ok && d.mail_schon && erneut) {
      // Bewusstes erneutes Senden (Alex hat im Panel bestaetigt): Claim loesen, Daten (inkl. korrigierter Nummer) neu holen
      await deps.db.rpc("shop_versandmail_claim", { p_id: id, p_zurueck: true });
      d = await deps.db.rpc<MarkierDaten>("shop_versand_markieren", { p_id: id, p_sendungsnummer: nr.nr });
    }
    if (!d.ok) {
      if (d.grund === "nicht_berechtigt") return fehler(503, "db", "Gerade nicht möglich. Bitte versuch es gleich noch einmal.");
      const g = GRUND_TEXT[d.grund ?? ""] ?? { status: 409, text: "Nicht möglich." };
      return fehler(g.status, d.grund === "ungueltige_eingabe" ? "ungueltig" : "nicht_moeglich", g.text, { grund: d.grund ?? "unbekannt" });
    }
    if (d.mail_schon) {
      return { status: 200, body: { ok: true, status: d.status ?? "versendet", mail: "schon" } };
    }
    if (!d.email || !d.nummer || !d.name || !d.strasse || !d.plz || !d.ort) {
      return fehler(409, "nicht_moeglich", "Die Kundendaten sind unvollständig.", { grund: "daten_fehlen", status: d.status ?? "versendet" });
    }
    const mail = versandMail(
      { nummer: d.nummer, name: d.name, strasse: d.strasse, plz: d.plz, ort: d.ort, versandart: d.versandart ?? null, sendungsnummer: d.sendungsnummer ?? null },
      deps.env.siteUrl,
    );
    if (!(await claimeVersandmail(deps, id))) return { status: 200, body: { ok: true, status: d.status ?? "versendet", mail: "schon" } };
    claimed = true;
    if (await deps.notifier.mailKunde(d.email, mail.betreff, mail.text, undefined, mail.html)) {
      await ereignis(deps, id, "benachrichtigung", { ergebnis: "versandmail_gesendet" });
      return { status: 200, body: { ok: true, status: d.status ?? "versendet", mail: "gesendet" } };
    }
    await freigebenVersandmail(deps, id);
    claimed = false;
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "versandmail_fehlgeschlagen" });
    return { status: 200, body: { ok: true, status: d.status ?? "versendet", mail: "fehler" } };
  } catch (err) {
    if (claimed) await freigebenVersandmail(deps, id);
    if (err instanceof DbFehler) {
      console.error("Shop-Versandmail DB-Fehler:", err.stufe, err.httpStatus ?? "");
      return fehler(503, "db", "Gerade nicht möglich. Bitte versuch es gleich noch einmal.");
    }
    console.error("Shop-Versandmail Fehler:", err instanceof Error ? err.name : "unbekannt");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "versandmail_fehler" });
    return fehler(500, "intern", "Die Versandmail konnte nicht verarbeitet werden.");
  }
}

/** true = dieser Aufruf darf senden. Fehlt die DB-Funktion (Migration 15 nicht angewendet), wird NICHT gesendet (fail-closed). */
async function claimeVersandmail(deps: Pick<VersandDeps, "db">, id: string): Promise<boolean> {
  const r = await deps.db.rpc<{ ok: boolean; neu?: boolean }>("shop_versandmail_claim", { p_id: id, p_zurueck: false });
  return r.ok && r.neu === true;
}

async function freigebenVersandmail(deps: Pick<VersandDeps, "db">, id: string): Promise<void> {
  try {
    await deps.db.rpc("shop_versandmail_claim", { p_id: id, p_zurueck: true });
  } catch {
    /* Retry im Panel bleibt trotzdem moeglich ("erneut senden") */
  }
}
