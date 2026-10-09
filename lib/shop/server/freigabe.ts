import "server-only";
// Freigabe-Flow fuer Bestellungen mit Wunschtext (shop_bestellungen.enthaelt_individuell = true).
//   Nach der Zahlung: Eingangsbestaetigung an den Kunden (KEIN Vertragsschluss) + Telegram/Mail an Alex mit zwei
//   signierten Links. Entscheidung ueber POST (entscheideFreigabe): freigeben -> Vertragsbestaetigung mit PDFs,
//   ablehnen -> Absage-Mail + automatische PayPal-Erstattung (Fehlerfall: Telegram "bitte in PayPal erstatten").
// Sicherheit: Token = HMAC-SHA256(bestellId|aktion|ablauf), 7 Tage gueltig, Vergleich in konstanter Zeit; die
// Einmaligkeit erzwingt die DB (shop_freigabe_setzen, nur bei freigabe_status = 'offen'). GET aendert nie etwas
// (Link-Vorschau von Telegram darf nichts ausloesen). Fehlertexte sind generisch.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { Benachrichtiger } from "./benachrichtigung";
import { PayPalFehler } from "./paypal";
import type { Antwort, Deps } from "./bestellung";
import { claimeMail, ereignis, gibMailFrei, sendeBestaetigung } from "./bestaetigung";
import { telegramPruefen } from "./vorlagen";
import { PRODUKTE } from "../produkte";
import {
  FREIGABE_GRUENDE,
  absageMail,
  alexMailFreigabe,
  wunschtextKurzliste,
  eingangsMail,
  istFreigabeGrund,
  telegramErstattungOffen,
  telegramFreigabe,
  telegramFreigabeErinnerung,
  type FreigabeGrund,
  type FreigabeLinks,
} from "./freigabe-texte";

export const FREIGABE_GUELTIG_SEK = 7 * 24 * 60 * 60;
export const ERINNERUNG_NACH_STUNDEN = 20;
export type FreigabeAktion = "ok" | "nein";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^(\d{9,12})\.([A-Za-z0-9_-]{43})$/;

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------
/** Schluessel der Links: eigener SHOP_FREIGABE_SECRET, sonst SHOP_API_SECRET. */
export function freigabeSchluessel(env: ShopEnv): string | null {
  const k = env.freigabeSecret ?? env.dbSecret;
  return k && k.length >= 16 ? k : null;
}

function mac(schluessel: string, bestellId: string, aktion: FreigabeAktion, ablauf: number): string {
  return createHmac("sha256", schluessel).update(`freigabe-v1|${bestellId}|${aktion}|${ablauf}`).digest("base64url");
}

export function signiereFreigabe(schluessel: string, bestellId: string, aktion: FreigabeAktion, jetzt: number = Date.now()): string {
  const ablauf = Math.floor(jetzt / 1000) + FREIGABE_GUELTIG_SEK;
  return `${ablauf}.${mac(schluessel, bestellId, aktion, ablauf)}`;
}

export type TokenPruefung = "ok" | "ungueltig" | "abgelaufen";

export function pruefeFreigabeToken(
  schluessel: string,
  bestellId: unknown,
  aktion: unknown,
  token: unknown,
  jetzt: number = Date.now(),
): TokenPruefung {
  if (typeof bestellId !== "string" || !UUID.test(bestellId)) return "ungueltig";
  if (aktion !== "ok" && aktion !== "nein") return "ungueltig";
  if (typeof token !== "string") return "ungueltig";
  const m = TOKEN.exec(token);
  if (!m) return "ungueltig";
  const erwartet = Buffer.from(mac(schluessel, bestellId, aktion, Number(m[1])));
  const gegeben = Buffer.from(m[2]);
  if (erwartet.length !== gegeben.length || !timingSafeEqual(erwartet, gegeben)) return "ungueltig";
  if (Number(m[1]) < Math.floor(jetzt / 1000)) return "abgelaufen";
  return "ok";
}

export function freigabeLinks(env: ShopEnv, bestellId: string, jetzt: number = Date.now()): FreigabeLinks | null {
  const k = freigabeSchluessel(env);
  if (!k) return null;
  const basis = `${env.siteUrl}/3d-druck/freigabe?b=${encodeURIComponent(bestellId)}`;
  return {
    ok: `${basis}&a=ok&t=${signiereFreigabe(k, bestellId, "ok", jetzt)}`,
    nein: `${basis}&a=nein&t=${signiereFreigabe(k, bestellId, "nein", jetzt)}`,
  };
}

// ---------------------------------------------------------------------------
// Antworten
// ---------------------------------------------------------------------------
const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});
const LINK_UNGUELTIG = (): Antwort => fehler(403, "link_ungueltig", "Dieser Link ist ungültig oder abgelaufen.");
const DB_FEHLER = (): Antwort => fehler(503, "db", "Gerade nicht möglich. Bitte versuch es gleich noch einmal.");

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// ---------------------------------------------------------------------------
// Benachrichtigungen (Alex) und Eingangsbestaetigung (Kunde)
// ---------------------------------------------------------------------------
/** Telegram + Mail an Alex mit den zwei Links. true = mindestens ein Kanal erreicht. */
export async function benachrichtigeAlexFreigabe(
  deps: { env: ShopEnv; notifier: Benachrichtiger; db?: Db },
  id: string,
  nummer: string,
  art: "neu" | "erinnerung",
): Promise<boolean> {
  const links = freigabeLinks(deps.env, id);
  if (!links) {
    await deps.notifier.telegram(telegramPruefen(nummer, "Freigabe-Links nicht möglich, Schlüssel fehlt"));
    return false;
  }
  // Kurzliste der Wunschtexte aus shop_freigabe_daten; schlaegt das fehl, geht die Benachrichtigung trotzdem raus.
  let pos: ReturnType<typeof mappePositionen> = [];
  if (deps.db) {
    try {
      const d = await deps.db.rpc<{ ok: boolean; positionen?: unknown[] }>("shop_freigabe_daten", { p_id: id });
      if (d.ok) pos = mappePositionen(d.positionen);
    } catch { /* ohne Kurzliste weiter */ }
  }
  const kurz = wunschtextKurzliste(pos);
  const mail = alexMailFreigabe(nummer, links, art, kurz);
  const text = art === "neu" ? telegramFreigabe(nummer, links, kurz.length) : telegramFreigabeErinnerung(nummer, ERINNERUNG_NACH_STUNDEN, links);
  const t = await deps.notifier.telegram(text);
  const m = await deps.notifier.mailAlex(mail.betreff, mail.text);
  return t || m;
}

/** Eingangsbestaetigung (kein Vertragsschluss), nur einmal. */
export async function sendeEingangsbestaetigung(deps: Pick<Deps, "db" | "env" | "notifier">, id: string): Promise<"gesendet" | "schon" | "fehler"> {
  let claimed = false;
  try {
    const d = await deps.db.rpc<{ ok: boolean; nummer?: string; name?: string; email?: string; gesamt_cent?: number }>(
      "shop_freigabe_mail_daten", { p_id: id, p_art: "eingang" });
    if (!d.ok || !d.email || !d.nummer || !d.name || typeof d.gesamt_cent !== "number") return "schon";
    const mail = eingangsMail({ nummer: d.nummer, name: d.name, gesamt_cent: d.gesamt_cent }, deps.env.siteUrl);
    if (!(await claimeMail(deps, id, "eingang"))) return "schon";
    claimed = true;
    if (await deps.notifier.mailKunde(d.email, mail.betreff, mail.text)) return "gesendet";
    await gibMailFrei(deps, id, "eingang");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "eingangsmail_fehlgeschlagen" });
    return "fehler";
  } catch {
    if (claimed) await gibMailFrei(deps, id, "eingang");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "eingangsmail_fehler" });
    return "fehler";
  }
}

async function sendeAbsage(deps: Pick<Deps, "db" | "env" | "notifier">, id: string): Promise<"gesendet" | "schon" | "fehler"> {
  let claimed = false;
  try {
    const d = await deps.db.rpc<{ ok: boolean; nummer?: string; name?: string; email?: string; gesamt_cent?: number; grund?: string }>(
      "shop_freigabe_mail_daten", { p_id: id, p_art: "absage" });
    if (!d.ok || !d.email || !d.nummer || !d.name || typeof d.gesamt_cent !== "number") return "schon";
    const grund: FreigabeGrund = istFreigabeGrund(d.grund) ? d.grund : "sonstiges";
    const mail = absageMail({ nummer: d.nummer, name: d.name, gesamt_cent: d.gesamt_cent }, grund, deps.env.siteUrl);
    if (!(await claimeMail(deps, id, "absage"))) return "schon";
    claimed = true;
    if (await deps.notifier.mailKunde(d.email, mail.betreff, mail.text)) return "gesendet";
    await gibMailFrei(deps, id, "absage");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "absagemail_fehlgeschlagen" });
    return "fehler";
  } catch {
    if (claimed) await gibMailFrei(deps, id, "absage");
    await ereignis(deps, id, "benachrichtigung", { ergebnis: "absagemail_fehler" });
    return "fehler";
  }
}

// ---------------------------------------------------------------------------
// Erstattung
// ---------------------------------------------------------------------------
type ErstattungsErgebnis = "erstattet" | "erstattung_offen";

async function erstatte(deps: Deps, id: string, nummer: string): Promise<ErstattungsErgebnis> {
  let refundId: string | null = null;
  let erfolg = false;
  try {
    const s = await deps.db.rpc<{ ok: boolean; paypal_capture_id?: string | null; gesamt_cent?: number }>(
      "shop_bestellung_suche", { p_id: id, p_paypal_order_id: null, p_nummer: null });
    if (s.ok && s.paypal_capture_id && typeof s.gesamt_cent === "number") {
      try {
        // Feste Request-Id je Bestellung: Wiederholen (Doppelklick, Replay) erstattet nie doppelt.
        const r = await deps.paypal.erstatte(s.paypal_capture_id, s.gesamt_cent, `refund-${nummer}`);
        refundId = r.refundId;
        erfolg = r.status === "COMPLETED" || r.status === "PENDING";
      } catch (err) {
        // Schon voll erstattet (z. B. von Hand in PayPal): gilt als erledigt
        if (err instanceof PayPalFehler && err.httpStatus === 422 && err.issue === "CAPTURE_FULLY_REFUNDED") erfolg = true;
        else console.error("Shop: Erstattung fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
      }
    }
  } catch {
    /* DB-Lesefehler: gilt als nicht erstattet */
  }
  const status: ErstattungsErgebnis = erfolg ? "erstattet" : "erstattung_offen";
  try {
    await deps.db.rpc("shop_freigabe_erstattung_setzen", { p_id: id, p_status: status, p_refund_id: refundId });
  } catch {
    await ereignis(deps, id, "fehler", { stufe: "erstattung_speichern", status });
  }
  if (!erfolg) {
    await deps.notifier.telegram(telegramErstattungOffen(nummer));
    await deps.notifier.mailAlex(`Erstattung offen: ${nummer}`, `Die automatische PayPal-Erstattung für ${nummer} ist fehlgeschlagen. Bitte in PayPal erstatten.`);
  }
  return status;
}

/** Positionen aus shop_freigabe_daten fuer die API und die Kurzliste in der Mail an Alex. */
export function mappePositionen(roh: unknown) {
  return (Array.isArray(roh) ? roh : []).map((p) => {
    const x = obj(p);
    const name = typeof x.name === "string" ? x.name : "";
    const text = typeof x.text === "string" ? x.text : null;
    // personalisierung_text ist mit " / " verbunden; nur bei Produkten mit Zeilen-Personalisierung wieder trennen
    const mehrzeilig = (PRODUKTE.find((pr) => pr.name === name)?.personalisierung?.zeilen?.length ?? 0) > 1;
    return {
      zeilen: text === null ? [] : mehrzeilig ? text.split(" / ") : [text],
      name,
      menge: typeof x.menge === "number" ? x.menge : 1,
      farbe: typeof x.farbe === "string" ? x.farbe : null,
      farbeHex: typeof x.farbe_hex === "string" ? x.farbe_hex : null,
      text,
      schrift: typeof x.schrift === "string" ? x.schrift : null,
      optionen: obj(x.optionen),
      individuell: x.individuell === true,
    };
  });
}

// ---------------------------------------------------------------------------
// API: Daten fuer die Seite (GET, aendert nichts)
// ---------------------------------------------------------------------------
export async function holeFreigabeDaten(
  deps: { db: Db; env: ShopEnv },
  q: { b: unknown; t: unknown },
  jetzt: number = Date.now(),
): Promise<Antwort> {
  const k = freigabeSchluessel(deps.env);
  if (!k) return fehler(503, "nicht_eingerichtet", "Die Freigabe ist gerade nicht verfügbar.");
  if (typeof q.b !== "string" || typeof q.t !== "string") return fehler(400, "ungueltig", "Ungültige Anfrage.");
  // Der Link traegt die Aktion im Token; die Seite kennt sie auch aus der URL, hier wird sie ermittelt.
  const aktion: FreigabeAktion | null =
    pruefeFreigabeToken(k, q.b, "ok", q.t, jetzt) === "ok" ? "ok"
    : pruefeFreigabeToken(k, q.b, "nein", q.t, jetzt) === "ok" ? "nein"
    : null;
  if (!aktion) return LINK_UNGUELTIG();

  let d: {
    ok: boolean; nummer?: string; status?: string; angefordert_am?: string | null; entschieden_am?: string | null;
    grund?: string | null; positionen?: unknown[];
  };
  try {
    d = await deps.db.rpc("shop_freigabe_daten", { p_id: q.b });
  } catch (err) {
    console.error("Shop: Freigabe-Daten fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return DB_FEHLER();
  }
  if (!d.ok || !d.nummer || !d.status) return LINK_UNGUELTIG();

  const positionen = mappePositionen(d.positionen);
  return {
    status: 200,
    body: {
      ok: true,
      aktion,
      bestellnummer: d.nummer,
      status: d.status,
      angefordertAm: d.angefordert_am ?? null,
      entschiedenAm: d.entschieden_am ?? null,
      grund: d.grund ?? null,
      positionen,
      gruende: FREIGABE_GRUENDE.map((g) => ({ id: g.id, label: g.label })),
    },
  };
}

// ---------------------------------------------------------------------------
// API: Entscheidung (POST)
// ---------------------------------------------------------------------------
export async function entscheideFreigabe(deps: Deps, eingabe: unknown, jetzt: number = Date.now()): Promise<Antwort> {
  const k = freigabeSchluessel(deps.env);
  if (!k) return fehler(503, "nicht_eingerichtet", "Die Freigabe ist gerade nicht verfügbar.");
  const e = obj(eingabe);
  if (typeof e.b !== "string" || typeof e.t !== "string" || (e.aktion !== "ok" && e.aktion !== "nein")) {
    return fehler(400, "ungueltig", "Ungültige Anfrage.");
  }
  const aktion: FreigabeAktion = e.aktion;
  if (pruefeFreigabeToken(k, e.b, aktion, e.t, jetzt) !== "ok") return LINK_UNGUELTIG();
  const id = e.b;

  let grund: FreigabeGrund | null = null;
  if (aktion === "nein") {
    if (!istFreigabeGrund(e.grund)) return fehler(422, "grund_fehlt", "Bitte wähle einen Grund aus.");
    grund = e.grund;
  }

  let r: { ok: boolean; grund?: string; neu?: boolean; nummer?: string; status?: string; erstattung_status?: string | null };
  try {
    r = await deps.db.rpc("shop_freigabe_setzen", { p_id: id, p_aktion: aktion, p_grund: grund });
  } catch (err) {
    console.error("Shop: Freigabe setzen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return DB_FEHLER();
  }
  if (!r.ok || !r.nummer || !r.status) {
    if (r.grund === "nicht_moeglich") return fehler(409, "nicht_moeglich", "Diese Bestellung kann nicht freigegeben oder abgelehnt werden.");
    if (r.grund === "ungueltige_eingabe") return fehler(422, "ungueltig", "Ungültige Anfrage.");
    console.error("Shop: Freigabe abgelehnt, Grund:", r.grund ?? "unbekannt");
    return fehler(500, "intern", "Gerade nicht möglich.");
  }

  const gewollt = aktion === "ok" ? "freigegeben" : "abgelehnt";
  if (r.status !== gewollt) {
    // Die andere Entscheidung ist schon gefallen: nichts ausfuehren.
    return fehler(409, "bereits_entschieden", "Über diese Bestellung wurde bereits entschieden.", { status: r.status });
  }
  const neu = r.neu === true;

  if (aktion === "ok") {
    // Auch bei Wiederholung: fehlende Bestaetigung wird nachgeholt (Flag in der DB verhindert Doppelversand).
    const mail = await sendeBestaetigung(deps, id);
    return { status: 200, body: { ok: true, status: "freigegeben", neu, mail: mail !== "fehler" } };
  }

  // Ablehnung: Erstattung (idempotent) und Absage-Mail; beides wird bei Wiederholung nachgeholt.
  const erstattung: ErstattungsErgebnis = r.erstattung_status === "erstattet" ? "erstattet" : await erstatte(deps, id, r.nummer);
  const absage = await sendeAbsage(deps, id);
  return { status: 200, body: { ok: true, status: "abgelehnt", neu, erstattung, mail: absage !== "fehler" } };
}

// ---------------------------------------------------------------------------
// Erinnerung (Cron): Freigabe laenger als N Stunden offen
// ---------------------------------------------------------------------------
export async function erinnereOffeneFreigaben(
  deps: { db: Db; env: ShopEnv; notifier: Benachrichtiger },
  stunden: number = ERINNERUNG_NACH_STUNDEN,
): Promise<number> {
  let liste: { ok: boolean; bestellungen?: { id: string; nummer: string }[] };
  try {
    liste = await deps.db.rpc("shop_freigabe_erinnerung_liste", { p_stunden: stunden });
  } catch {
    return 0; // z. B. Migration 10 noch nicht angewendet: die Bereinigung darf deswegen nicht scheitern
  }
  if (!liste.ok) return 0;
  let gesendet = 0;
  for (const b of liste.bestellungen ?? []) {
    if (await benachrichtigeAlexFreigabe(deps, b.id, b.nummer, "erinnerung")) {
      await deps.db.rpc("shop_freigabe_markiere", { p_id: b.id, p_art: "erinnert" }).catch(() => undefined);
      gesendet++;
    }
  }
  return gesendet;
}
