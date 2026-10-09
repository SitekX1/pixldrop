import "server-only";
// Bestell- und Zahlungslogik (ohne Next-Abhaengigkeiten, damit mit Mocks testbar).
// Ablauf (Redirect-Flow):
//   1. legeBestellungAn: validieren, Preis serverseitig berechnen, Bestellung "neu" speichern,
//      PayPal-Order anlegen, Freigabe-URL zurueckgeben.
//   2. Kunde zahlt bei PayPal und kehrt zurueck -> schliesseZahlungAb (Capture, Betragspruefung).
//   3. Webhook PAYMENT.CAPTURE.COMPLETED -> verarbeiteWebhook (Absicherung, gleiche Buchung).
// Doppelverbuchung ist ausgeschlossen: die DB-Funktion shop_zahlung_buchen sperrt die Zeile,
// prueft Betrag/Waehrung und kennt die Capture-ID; Benachrichtigungen laufen nur bei neu_bezahlt.
import type { Db } from "./db";
import { DbFehler } from "./db";
import type { ShopEnv } from "./env";
import type { PayPalClient } from "./paypal";
import { PayPalFehler } from "./paypal";
import type { Benachrichtiger } from "./benachrichtigung";
import { berechneWarenkorb, type Kontext } from "./preise";
import { pruefeKunde } from "./validierung";
import { AGB_TEXT } from "./agb-text";
import { PFLICHTANGABEN_FREIGEGEBEN, PLATZHALTER_MARKER, alexMail, bestaetigungsMail, telegramBestellung, telegramPruefen, type MailBestellung } from "./vorlagen";

export interface Deps {
  db: Db;
  paypal: PayPalClient;
  notifier: Benachrichtiger;
  env: ShopEnv;
  /** Test-Hook; Standard: Konstante aus vorlagen.ts */
  pflichtangabenFreigegeben?: boolean;
  /** Test-Hook; Standard: Platzhalter aus vorlagen.ts (Rechtsblock der Bestaetigungsmail) */
  pflichtangabenText?: string;
  /** Test-Hook; Standard: AGB_TEXT aus agb-text.ts (AGB-Klartext in der Bestaetigungsmail) */
  agbText?: string;
  /** Test-Hook fuer deterministische Request-Ids */
  zufall?: () => string;
}

export interface Antwort {
  status: number;
  body: Record<string, unknown>;
}

const AGB_VERSION = "entwurf-2026-10-08";

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

const fehler = (status: number, code: string, meldung: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error: meldung, ...extra },
});

interface Suche {
  ok: boolean;
  id?: string;
  nummer?: string;
  gesamt_cent?: number;
  status?: string;
  zahlungsstatus?: string;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  benachrichtigt?: boolean;
  bestaetigt?: boolean;
}

async function suche(deps: Deps, q: { id?: string; paypalOrderId?: string; nummer?: string }): Promise<Suche> {
  return deps.db.rpc<Suche>("shop_bestellung_suche", {
    p_id: q.id ?? null,
    p_paypal_order_id: q.paypalOrderId ?? null,
    p_nummer: q.nummer ?? null,
  });
}

/** Technisches Ereignis (ohne personenbezogene Daten) protokollieren; Fehler hier sind egal. */
async function ereignis(deps: Deps, id: string | null, art: string, details: Record<string, unknown>) {
  try {
    await deps.db.rpc("shop_ereignis_schreiben", { p_bestellung_id: id, p_art: art, p_details: details });
  } catch {
    /* Protokoll ist Zusatz */
  }
}

// ---------------------------------------------------------------------------
// 1. Bestellung anlegen
// ---------------------------------------------------------------------------
export async function legeBestellungAn(
  deps: Deps,
  eingabe: unknown,
  ctx: { ipHash: string; kontext: Kontext },
): Promise<Antwort> {
  const { env } = deps;
  const frei = deps.pflichtangabenFreigegeben ?? PFLICHTANGABEN_FREIGEGEBEN;
  const block = deps.pflichtangabenText ?? "";
  const agb = deps.agbText ?? AGB_TEXT;
  if (env.paypalEnv === "live" && (!frei || block.includes(PLATZHALTER_MARKER) || agb.includes(PLATZHALTER_MARKER))) {
    return fehler(503, "texte_fehlen", "Der Shop ist noch nicht freigegeben.");
  }
  const e = obj(eingabe);

  const key = e.idempotenzKey;
  if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(key)) {
    return fehler(422, "ungueltig", "Ungültige Anfrage.");
  }

  const korb = berechneWarenkorb(e.positionen, ctx.kontext);
  if (!korb.ok) {
    const status = korb.fehler.code === "lager_nicht_lesbar" ? 503 : 422;
    return fehler(status, korb.fehler.code, korb.fehler.meldung);
  }
  const k = pruefeKunde(e.kunde);
  if (!k.ok) return fehler(422, "kunde_ungueltig", "Bitte prüfe deine Angaben.", { felder: k.felder });

  const einw = obj(e.einwilligungen);
  if (einw.agb !== true) return fehler(422, "einwilligung_fehlt", "Bitte bestätige AGB und Widerrufsbelehrung.");
  if (korb.wert.individuell && einw.verzicht !== true) {
    return fehler(422, "einwilligung_fehlt", "Bitte bestätige den Widerrufsausschluss für dein individuell gefertigtes Stück.");
  }

  const w = korb.wert;
  let res: { ok: boolean; grund?: string; wiederholt?: boolean; id?: string; nummer?: string };
  try {
    res = await deps.db.rpc("shop_bestellung_anlegen", {
      p_ip_hash: ctx.ipHash,
      p_idempotenz_key: key,
      p_kunde: k.wert,
      p_einwilligungen: { agb: true, widerruf: einw.widerruf === true, verzicht: einw.verzicht === true },
      p_positionen: w.positionen.map((p) => ({
        slug: p.slug,
        name: p.name,
        menge: p.menge,
        einzelpreis_cent: p.einzelpreisCent,
        farbe_name: p.farbeName,
        farbe_hex: p.farbeHex,
        optionen: p.optionen,
        // Mehrzeilige Texte (Tischschild) als einzeilig mit " / " speichern: die DB-Regel lässt keine Steuerzeichen zu.
        text: p.text ? p.text.replace(/\r?\n/g, " / ") : p.text,
        schrift: p.schriftId,
        individuell: p.individuell,
      })),
      p_versand_cent: w.versandCent,
      p_agb_version: AGB_VERSION,
    });
  } catch (err) {
    console.error("Shop: Bestellung anlegen fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    return fehler(503, "db", "Die Bestellung ist gerade nicht möglich. Bitte versuch es später noch einmal.");
  }

  if (!res.ok || !res.id || !res.nummer) {
    switch (res.grund) {
      case "zu_viele":
        return fehler(429, "zu_viele", "Zu viele Bestellungen in kurzer Zeit. Bitte versuch es später noch einmal.");
      case "ueberlastet":
        return fehler(503, "ueberlastet", "Gerade ist sehr viel los. Bitte versuch es später noch einmal.");
      case "key_konflikt":
        return fehler(409, "key_konflikt", "Der Warenkorb hat sich geändert. Bitte starte die Bestellung neu.");
      case "einwilligung_fehlt":
        return fehler(422, "einwilligung_fehlt", "Bitte bestätige die Pflichtangaben.");
      case "ungueltige_eingabe":
        return fehler(422, "ungueltig", "Bitte prüfe deine Angaben.");
      default:
        console.error("Shop: Bestellung abgelehnt, Grund:", res.grund ?? "unbekannt");
        return fehler(500, "intern", "Die Bestellung ist gerade nicht möglich.");
    }
  }

  const id = res.id;
  const nummer = res.nummer;

  // Wiederholter Versuch (gleicher Key): schon bezahlt? Dann keine zweite Zahlung anbieten.
  // Eine vorhandene PayPal-Order wird nur ersetzt, wenn PayPal sie als unbrauchbar bestaetigt hat.
  let ersetzeAlt = false;
  if (res.wiederholt) {
    let s: Suche;
    try {
      s = await suche(deps, { id });
    } catch {
      return fehler(503, "db", "Die Bestellung ist gerade nicht möglich. Bitte versuch es später noch einmal.");
    }
    if (s.zahlungsstatus === "bezahlt" || s.zahlungsstatus === "ausstehend") {
      return { status: 200, body: { ok: true, bereitsBezahlt: true, bestellnummer: nummer } };
    }
    if (s.paypal_order_id) {
      try {
        const o = await deps.paypal.holeOrder(s.paypal_order_id);
        if (o.status === "CREATED" || o.status === "PAYER_ACTION_REQUIRED" || o.status === "APPROVED") {
          return { status: 200, body: { ok: true, bestellnummer: nummer, approveUrl: deps.paypal.approveUrl(o.id) } };
        }
        if (o.status === "VOIDED") ersetzeAlt = true;
        else return fehler(409, "nicht_moeglich", "Die Zahlung wird noch geprüft. Bitte melde dich bei uns, falls du nicht bestätigt wurdest.");
      } catch (err) {
        if (err instanceof PayPalFehler && err.httpStatus === 404) ersetzeAlt = true;
        else return fehler(502, "zahlungsdienst", "Der Zahlungsdienst ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal.");
      }
    }
  }

  // PayPal-Order anlegen (Betrag aus der DB-Bestellung = serverseitig berechneter Betrag)
  try {
    const order = await deps.paypal.erzeugeOrder({
      nummer,
      gesamtCent: w.gesamtCent,
      summeWarenCent: w.summeWarenCent,
      versandCent: w.versandCent,
      positionen: w.positionen.map((p) => ({ name: p.name, menge: p.menge, einzelpreisCent: p.einzelpreisCent })),
      empfaenger: { name: k.wert.name, strasse: k.wert.strasse, plz: k.wert.plz, ort: k.wert.ort },
      returnUrl: `${env.siteUrl}/api/shop/zahlung/rueckkehr?b=${encodeURIComponent(nummer)}`,
      cancelUrl: `${env.siteUrl}/3d-druck/bestellung?schritt=3&zahlung=abgebrochen`,
      requestId: res.wiederholt ? `${nummer}-${(deps.zufall ?? zufallKurz)()}` : nummer,
    });
    const gesetzt = await deps.db.rpc<{ ok: boolean }>("shop_bestellung_paypal_setzen", {
      p_id: id,
      p_paypal_order_id: order.id,
      p_ersetze_alt: ersetzeAlt,
    });
    if (!gesetzt.ok) {
      // Paralleler Request war schneller und hat schon eine Order gesetzt: diese verwenden
      try {
        const aktuell = await suche(deps, { id });
        if (aktuell.paypal_order_id && aktuell.zahlungsstatus !== "bezahlt") {
          return { status: 200, body: { ok: true, bestellnummer: nummer, approveUrl: deps.paypal.approveUrl(aktuell.paypal_order_id) } };
        }
      } catch {
        /* weiter mit Fehlermeldung */
      }
      await ereignis(deps, id, "fehler", { stufe: "paypal_setzen" });
      return fehler(409, "nicht_moeglich", "Die Bestellung kann nicht mehr bezahlt werden.");
    }
    return { status: 200, body: { ok: true, bestellnummer: nummer, approveUrl: order.approveUrl } };
  } catch (err) {
    const stufe = err instanceof PayPalFehler ? err.message : err instanceof DbFehler ? err.message : "unbekannt";
    console.error("Shop: PayPal-Order fehlgeschlagen:", stufe);
    await ereignis(deps, id, "fehler", { stufe: "paypal_order", meldung: stufe.slice(0, 120) });
    return fehler(502, "zahlungsdienst", "Der Zahlungsdienst ist gerade nicht erreichbar. Bitte versuch es gleich noch einmal.");
  }
}

function zufallKurz(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// 2. Rueckkehr von PayPal: Capture + Buchung
// ---------------------------------------------------------------------------
export type Ziel = "danke" | "abbruch" | "fehler" | "pruefen" | "unbekannt";
export interface Abschluss {
  ziel: Ziel;
  nummer?: string;
}

export async function schliesseZahlungAb(deps: Deps, token: unknown): Promise<Abschluss> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{5,64}$/.test(token)) return { ziel: "unbekannt" };

  let s: Suche;
  try {
    s = await suche(deps, { paypalOrderId: token });
  } catch {
    return { ziel: "fehler" };
  }
  if (!s.ok || !s.id || !s.nummer) return { ziel: "unbekannt" };
  const { id, nummer } = s;

  // Schon bezahlt (z. B. Webhook war schneller oder Seite neu geladen): nichts erneut buchen.
  if (s.zahlungsstatus === "bezahlt") {
    await nachBezahlt(deps, id, nummer, { benachrichtigt: s.benachrichtigt === true, bestaetigt: s.bestaetigt === true });
    return { ziel: "danke", nummer };
  }
  if (s.status === "storniert") return { ziel: "pruefen", nummer };

  let order;
  try {
    try {
      order = await deps.paypal.capture(token, `cap-${nummer}`);
    } catch (err) {
      if (err instanceof PayPalFehler && err.httpStatus === 422 && err.issue === "ORDER_ALREADY_CAPTURED") {
        order = await deps.paypal.holeOrder(token);
      } else if (err instanceof PayPalFehler && err.httpStatus === 422 && err.issue === "ORDER_NOT_APPROVED") {
        return { ziel: "abbruch", nummer };
      } else if (err instanceof PayPalFehler && err.httpStatus === 422) {
        await ereignis(deps, id, "zahlung_fehlgeschlagen", { issue: err.issue ?? "unbekannt" });
        return { ziel: "fehler", nummer };
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error("Shop: Capture fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
    await ereignis(deps, id, "fehler", { stufe: "capture" });
    return { ziel: "fehler", nummer };
  }

  const c = order.capture;
  if (!c || c.betragCent == null || (c.customId != null && c.customId !== nummer)) {
    await ereignis(deps, id, "fehler", { stufe: "capture_antwort", status: order.status });
    await deps.notifier.telegram(telegramPruefen(nummer, "Capture-Antwort unklar"));
    return { ziel: "pruefen", nummer };
  }

  return buche(deps, { orderId: token, captureId: c.captureId, betragCent: c.betragCent, waehrung: c.waehrung, status: c.status, quelle: "capture", id, nummer });
}

async function buche(
  deps: Deps,
  p: { orderId: string; captureId: string; betragCent: number; waehrung: string; status: string; quelle: "capture" | "webhook"; id: string; nummer: string },
): Promise<Abschluss> {
  let r: { ok: boolean; grund?: string; neu_bezahlt?: boolean; ausstehend?: boolean };
  try {
    r = await deps.db.rpc("shop_zahlung_buchen", {
      p_paypal_order_id: p.orderId,
      p_capture_id: p.captureId,
      p_betrag_cent: p.betragCent,
      p_waehrung: p.waehrung,
      p_capture_status: p.status,
      p_quelle: p.quelle,
    });
  } catch (err) {
    console.error("Shop: Buchung fehlgeschlagen:", err instanceof DbFehler ? err.message : "unbekannt");
    throw err;
  }
  if (r.ok && r.neu_bezahlt) {
    await nachBezahlt(deps, p.id, p.nummer, { benachrichtigt: false, bestaetigt: false });
    return { ziel: "danke", nummer: p.nummer };
  }
  if (r.ok && r.ausstehend) return { ziel: "danke", nummer: p.nummer };
  if (r.ok) {
    // bereits gebucht (anderer Weg war schneller): fehlende Benachrichtigungen mit ECHTEN Flags nachholen
    let flags = { benachrichtigt: true, bestaetigt: true };
    try {
      const s = await suche(deps, { id: p.id });
      if (s.ok) flags = { benachrichtigt: s.benachrichtigt === true, bestaetigt: s.bestaetigt === true };
    } catch {
      /* ohne Flags lieber nichts doppelt senden */
    }
    await nachBezahlt(deps, p.id, p.nummer, flags);
    return { ziel: "danke", nummer: p.nummer };
  }
  if (r.grund === "zahlung_fehlgeschlagen") return { ziel: "fehler", nummer: p.nummer };
  // Abweichungen (Betrag, doppelte Zahlung, storniert): von Hand pruefen, kein "bezahlt"
  await deps.notifier.telegram(telegramPruefen(p.nummer, r.grund ?? "unklar"));
  return { ziel: "pruefen", nummer: p.nummer };
}

/** Benachrichtigung an Alex und Bestaetigung an den Kunden; jeweils nur, wenn noch nicht erfolgt. */
async function nachBezahlt(
  deps: Deps,
  id: string,
  nummer: string,
  schon: { benachrichtigt: boolean; bestaetigt: boolean },
) {
  if (!schon.benachrichtigt) {
    const mail = alexMail("Bestellung", nummer, deps.env.adminUrl);
    const t = await deps.notifier.telegram(telegramBestellung(nummer));
    const m = await deps.notifier.mailAlex(mail.betreff, mail.text);
    if (t || m) {
      await deps.db.rpc("shop_markiere", { p_art: "bestellung_benachrichtigt", p_id: id }).catch(() => undefined);
    } else {
      await ereignis(deps, id, "benachrichtigung", { ergebnis: "kein_kanal_erreicht" });
    }
  }
  if (!schon.bestaetigt) {
    try {
      const d = await deps.db.rpc<Record<string, unknown> & { ok: boolean }>("shop_bestellung_mail_daten", { p_id: id });
      if (d.ok) {
        const b = d as unknown as MailBestellung & { email: string };
        const { betreff, text } = bestaetigungsMail(b, deps.pflichtangabenText, deps.pflichtangabenFreigegeben, { siteUrl: deps.env.siteUrl, agbText: deps.agbText });
        if (await deps.notifier.mailKunde(b.email, betreff, text)) {
          await deps.db.rpc("shop_markiere", { p_art: "bestellung_bestaetigt", p_id: id }).catch(() => undefined);
        } else {
          await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehlgeschlagen" });
        }
      }
    } catch {
      await ereignis(deps, id, "benachrichtigung", { ergebnis: "kundenmail_fehler" });
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Webhook (PAYMENT.CAPTURE.COMPLETED), Signatur von PayPal geprueft
// ---------------------------------------------------------------------------
export async function verarbeiteWebhook(deps: Deps, headers: Headers, rohBody: string): Promise<Antwort> {
  if (!deps.env.paypalWebhookId) return fehler(503, "nicht_eingerichtet", "Webhook nicht eingerichtet.");

  let event: unknown;
  try {
    event = JSON.parse(rohBody);
  } catch {
    return fehler(400, "ungueltig", "Ungültige Anfrage.");
  }
  if (!(await deps.paypal.pruefeWebhook(headers, event))) {
    return fehler(401, "signatur", "Signatur ungültig.");
  }

  const ev = obj(event);
  if (ev.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return { status: 200, body: { ok: true, ignoriert: true } };
  }
  const res = obj(ev.resource);
  const amount = obj(res.amount);
  const captureId = typeof res.id === "string" ? res.id : null;
  const betrag = typeof amount.value === "string" ? /^\d{1,7}(\.\d{1,2})?$/.exec(amount.value) : null;
  const waehrung = typeof amount.currency_code === "string" ? amount.currency_code : "";
  if (!captureId || !betrag) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  const [euro, rest = ""] = betrag[0].split(".");
  const betragCent = Number(euro) * 100 + Number(rest.padEnd(2, "0"));

  try {
    let orderId = typeof obj(obj(res.supplementary_data).related_ids).order_id === "string"
      ? (obj(obj(res.supplementary_data).related_ids).order_id as string)
      : null;
    let s: Suche | null = null;
    if (orderId) s = await suche(deps, { paypalOrderId: orderId });
    if ((!s || !s.ok) && typeof res.custom_id === "string" && /^PD-\d{4}-\d{4,}$/.test(res.custom_id)) {
      s = await suche(deps, { nummer: res.custom_id });
      orderId = s.paypal_order_id ?? null;
    }
    if (!s || !s.ok || !s.id || !s.nummer || !orderId) {
      // Nicht unsere Bestellung (andere PayPal-Nutzung des Kontos): bestaetigen, nicht wiederholen lassen.
      return { status: 200, body: { ok: true, ignoriert: true } };
    }
    const a = await buche(deps, {
      orderId, captureId, betragCent, waehrung, status: typeof res.status === "string" ? res.status : "COMPLETED",
      quelle: "webhook", id: s.id, nummer: s.nummer,
    });
    return { status: 200, body: { ok: true, ziel: a.ziel } };
  } catch {
    // DB-Fehler: 500, damit PayPal den Webhook erneut zustellt
    return fehler(500, "intern", "Verarbeitung fehlgeschlagen.");
  }
}
