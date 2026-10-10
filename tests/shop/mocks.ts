// Test-Doubles: Fake-Datenbank (bildet die Entscheidungen der SQL-Funktionen nach), Fake-PayPal und
// Fake-Benachrichtiger. KEINE echte Zahlung, KEIN Netzwerk, KEINE echte Datenbank.
// Wichtig: Die Fake-DB prueft die Logik des TypeScript-Codes; das SQL selbst ist damit NICHT getestet.
import type { Db } from "@/lib/shop/server/db";
import type { Benachrichtiger } from "@/lib/shop/server/benachrichtigung";
import { PayPalFehler, type OrderEingabe, type PayPalClient, type PayPalOrder } from "@/lib/shop/server/paypal";
import { leseEnv, type ShopEnv } from "@/lib/shop/server/env";
import { PRODUKTE } from "@/lib/shop/produkte";
import type { Kontext } from "@/lib/shop/server/preise";
import type { Deps } from "@/lib/shop/server/bestellung";

type Row = Record<string, unknown>;

export interface FakeBestellung {
  id: string;
  nummer: string;
  key: string;
  gesamt_cent: number;
  status: string;
  zahlungsstatus: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  benachrichtigt: boolean;
  bestaetigt: boolean;
  hash: string;
  kunde: Row;
  positionen: Row[];
  /** Freigabe-Flow (Migration 10) */
  freigabe?: "offen" | "freigegeben" | "abgelehnt" | null;
  freigabeGrund?: string | null;
  eingang?: boolean;
  absage?: boolean;
  erinnert?: boolean;
  erstattung?: "erstattet" | "erstattung_offen" | null;
  angefordertVorH?: number;
}

export class FakeDb implements Db {
  bestellungen: FakeBestellung[] = [];
  ereignisse: { art: string; details: Row }[] = [];
  anfragen: { id: string; nummer: string; args: Row; pfade: string[]; fehler: boolean; benachrichtigt: boolean }[] = [];
  uploads: { pfad: string; mime: string; bytes: number }[] = [];
  entfernt: string[] = [];
  aufrufe: string[] = [];
  widerrufe: { id: string; nummer: string; eingegangen_am: string; args: Row; abgleich: string; bestaetigt: boolean; benachrichtigt: boolean }[] = [];
  widerrufGrund: string | null = null;
  /** Test: Stundenzaehler (global) und Zaehler je Adresse ueberschreiben; null = aus den gespeicherten Widerrufen. */
  zielAnzahlFest: number | null = null;
  stundeFest: number | null = null;
  zielAnzahlAusfall = false;
  /** Test: simuliert "Migration 10 nicht angewendet" (suche liefert keinen Schluessel freigabe_status). */
  ohneFreigabeMigration = false;
  uploadOk = true;
  entfernenOk = true;
  anfrageGrund: string | null = null;
  bereinigungListe: { id: string; pfade: string[] }[] = [];
  bereinigtMit: string[] | null = null;
  private n = 0;
  private a = 0;

  async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    this.aufrufe.push(name);
    return (this.dispatch(name, args) as T);
  }

  async upload(pfad: string, bytes: Uint8Array, mime: string) {
    if (!this.uploadOk) return false;
    this.uploads.push({ pfad, mime, bytes: bytes.length });
    return true;
  }

  async remove(pfad: string) {
    if (!this.entfernenOk) return false;
    this.entfernt.push(pfad);
    return true;
  }

  individuell(b: FakeBestellung): boolean {
    return b.positionen.some((x) => x.individuell === true);
  }

  private find(q: { id?: unknown; o?: unknown; n?: unknown }) {
    return this.bestellungen.find((b) =>
      (q.id != null && b.id === q.id) || (q.o != null && b.paypal_order_id === q.o) || (q.n != null && b.nummer === q.n));
  }

  private dispatch(name: string, p: Record<string, unknown>): Row {
    switch (name) {
      case "shop_bestellung_anlegen": {
        const pos = p.p_positionen as Row[];
        const gesamt = pos.reduce((s, x) => s + (x.menge as number) * (x.einzelpreis_cent as number), 0) + (p.p_versand_cent as number);
        const hash = JSON.stringify([pos, p.p_kunde, p.p_versand_cent]);
        const vorh = this.bestellungen.find((b) => b.key === p.p_idempotenz_key);
        if (vorh) {
          if (vorh.gesamt_cent !== gesamt || vorh.hash !== hash) return { ok: false, grund: "key_konflikt" };
          return { ok: true, wiederholt: true, id: vorh.id, nummer: vorh.nummer, gesamt_cent: vorh.gesamt_cent };
        }
        const dieseIp = this.bestellungen.filter((b) => b.kunde.__ip === p.p_ip_hash).length;
        if (dieseIp >= 5) return { ok: false, grund: "zu_viele" };
        const b: FakeBestellung = {
          id: `00000000-0000-4000-8000-${String(++this.n).padStart(12, "0")}`,
          nummer: `PD-2026-${String(this.n).padStart(4, "0")}`,
          key: p.p_idempotenz_key as string, gesamt_cent: gesamt, status: "neu", zahlungsstatus: "offen",
          paypal_order_id: null, paypal_capture_id: null, benachrichtigt: false, bestaetigt: false, hash,
          kunde: { ...(p.p_kunde as Row), __ip: p.p_ip_hash }, positionen: pos,
          freigabe: null, freigabeGrund: null, eingang: false, absage: false, erinnert: false, erstattung: null, angefordertVorH: 0,
        };
        this.bestellungen.push(b);
        this.ereignisse.push({ art: "angelegt", details: { gesamt_cent: gesamt } });
        return { ok: true, wiederholt: false, id: b.id, nummer: b.nummer, gesamt_cent: gesamt };
      }
      case "shop_bestellung_paypal_setzen": {
        const b = this.find({ id: p.p_id });
        if (!b || b.status !== "neu" || !["offen", "fehlgeschlagen"].includes(b.zahlungsstatus)) return { ok: false, grund: "nicht_moeglich" };
        if (b.paypal_order_id && b.paypal_order_id !== p.p_paypal_order_id && !p.p_ersetze_alt) return { ok: false, grund: "nicht_moeglich" };
        b.paypal_order_id = p.p_paypal_order_id as string;
        return { ok: true };
      }
      case "shop_bestellung_suche": {
        const b = this.find({ id: p.p_id, o: p.p_paypal_order_id, n: p.p_nummer });
        if (!b) return { ok: false, grund: "unbekannt" };
        return {
          ok: true, id: b.id, nummer: b.nummer, gesamt_cent: b.gesamt_cent, status: b.status, zahlungsstatus: b.zahlungsstatus,
          paypal_order_id: b.paypal_order_id, paypal_capture_id: b.paypal_capture_id, benachrichtigt: b.benachrichtigt, bestaetigt: b.bestaetigt,
          enthaelt_individuell: this.individuell(b),
          ...(this.ohneFreigabeMigration ? {} : { freigabe_status: b.freigabe ?? null, eingang_gesendet: b.eingang, absage_gesendet: b.absage, erstattung_status: b.erstattung ?? null }),
        };
      }
      case "shop_zahlung_buchen": {
        const b = this.find({ o: p.p_paypal_order_id });
        if (!b) return { ok: false, grund: "unbekannt" };
        if (p.p_waehrung !== "EUR" || p.p_betrag_cent !== b.gesamt_cent) {
          this.ereignisse.push({ art: "betrag_abweichung", details: { erwartet: b.gesamt_cent, gemeldet: p.p_betrag_cent } });
          return { ok: false, grund: "betrag_abweichung", id: b.id, nummer: b.nummer };
        }
        if (b.zahlungsstatus === "bezahlt") {
          if (b.paypal_capture_id === p.p_capture_id) return { ok: true, neu_bezahlt: false, id: b.id, nummer: b.nummer };
          this.ereignisse.push({ art: "doppelte_zahlung", details: {} });
          return { ok: false, grund: "doppelte_zahlung", id: b.id, nummer: b.nummer };
        }
        if (b.status === "storniert") return { ok: false, grund: "storniert", id: b.id, nummer: b.nummer };
        if (p.p_capture_status === "COMPLETED") {
          b.zahlungsstatus = "bezahlt";
          b.paypal_capture_id = p.p_capture_id as string;
          b.status = "bezahlt";
          if (this.individuell(b) && !this.ohneFreigabeMigration) { b.freigabe = "offen"; b.angefordertVorH = 0; }  // Trigger shop_tg_freigabe
          return { ok: true, neu_bezahlt: true, id: b.id, nummer: b.nummer };
        }
        if (p.p_capture_status === "PENDING") {
          b.zahlungsstatus = "ausstehend";
          return { ok: true, neu_bezahlt: false, ausstehend: true, id: b.id, nummer: b.nummer };
        }
        b.zahlungsstatus = "fehlgeschlagen";
        return { ok: false, grund: "zahlung_fehlgeschlagen", id: b.id, nummer: b.nummer };
      }
      case "shop_bestellung_mail_daten": {
        const b = this.find({ id: p.p_id });
        if (!b || b.zahlungsstatus !== "bezahlt" || b.bestaetigt) return { ok: false, grund: "nichts_zu_tun" };
        if ((b.freigabe ?? null) !== null && b.freigabe !== "freigegeben") return { ok: false, grund: "nichts_zu_tun" };  // DB-Sperre
        return {
          ok: true, nummer: b.nummer, gesamt_cent: b.gesamt_cent, summe_waren_cent: b.gesamt_cent - 490, versand_cent: 490,
          individuell: b.positionen.some((x) => x.individuell === true), name: b.kunde.name, strasse: b.kunde.strasse, plz: b.kunde.plz,
          ort: b.kunde.ort, email: b.kunde.email,
          positionen: b.positionen.map((x) => ({ name: x.name, menge: x.menge, einzelpreis_cent: x.einzelpreis_cent, farbe: x.farbe_name, text: x.text, schrift: x.schrift, optionen: x.optionen, individuell: x.individuell === true })),
        };
      }
      case "shop_markiere": {
        const b = this.find({ id: p.p_id });
        if (b && p.p_art === "bestellung_benachrichtigt") b.benachrichtigt = true;
        if (b && p.p_art === "bestellung_bestaetigt") b.bestaetigt = true;
        const an = this.anfragen.find((x) => x.id === p.p_id);
        if (an && p.p_art === "anfrage_benachrichtigt") an.benachrichtigt = true;
        return { ok: true };
      }
      case "shop_freigabe_daten": {
        const b = this.find({ id: p.p_id });
        if (!b || (b.freigabe ?? null) === null) return { ok: false, grund: "unbekannt" };
        return {
          ok: true, nummer: b.nummer, status: b.freigabe, angefordert_am: new Date(Date.now() - (b.angefordertVorH ?? 0) * 3_600_000).toISOString(), entschieden_am: b.freigabe === "offen" ? null : "2026-10-09T11:00:00Z",
          grund: b.freigabeGrund,
          positionen: b.positionen.map((x) => ({ name: x.name, menge: x.menge, farbe: x.farbe_name ?? null, farbe_hex: null, text: x.text ?? null, schrift: x.schrift ?? null, optionen: x.optionen ?? {}, individuell: x.individuell === true })),
        };
      }
      case "shop_freigabe_setzen": {
        const b = this.find({ id: p.p_id });
        if (!b || (b.freigabe ?? null) === null) return { ok: false, grund: "nicht_moeglich" };
        if (p.p_aktion === "nein" && !["marke", "unzulaessig", "unleserlich", "sonstiges", "frist"].includes(p.p_grund as string)) return { ok: false, grund: "ungueltige_eingabe" };
        let neu = false;
        if (b.freigabe === "offen") {
          if (b.zahlungsstatus !== "bezahlt") return { ok: false, grund: "nicht_moeglich" };
          neu = true;
          if (p.p_aktion === "ok") b.freigabe = "freigegeben";
          else { b.freigabe = "abgelehnt"; b.freigabeGrund = p.p_grund as string; b.status = "storniert"; }
        }
        return { ok: true, neu, id: b.id, nummer: b.nummer, status: b.freigabe, grund: b.freigabeGrund, erstattung_status: b.erstattung ?? null };
      }
      case "shop_freigabe_erstattung_setzen": {
        const b = this.find({ id: p.p_id });
        if (!b || b.freigabe !== "abgelehnt") return { ok: false, grund: "nicht_moeglich" };
        if (b.erstattung !== "erstattet") {
          b.erstattung = p.p_status as "erstattet" | "erstattung_offen";
          if (b.erstattung === "erstattet") b.zahlungsstatus = "erstattet";
        }
        return { ok: true };
      }
      case "shop_freigabe_mail_daten": {
        const b = this.find({ id: p.p_id });
        if (!b) return { ok: false, grund: "nichts_zu_tun" };
        if (p.p_art === "eingang" && (b.freigabe !== "offen" || b.eingang)) return { ok: false, grund: "nichts_zu_tun" };
        if (p.p_art === "absage" && (b.freigabe !== "abgelehnt" || b.absage)) return { ok: false, grund: "nichts_zu_tun" };
        return { ok: true, nummer: b.nummer, gesamt_cent: b.gesamt_cent, name: b.kunde.name, email: b.kunde.email, grund: b.freigabeGrund };
      }
      case "shop_freigabe_claim": {
        const b = this.find({ id: p.p_id });
        if (!b) return { ok: true, neu: false };
        const k = p.p_art === "eingang" ? "eingang" : p.p_art === "absage" ? "absage" : "bestaetigt";
        if (b[k]) return { ok: true, neu: false };
        b[k] = true;
        return { ok: true, neu: true };
      }
      case "shop_freigabe_claim_zurueck": {
        const b = this.find({ id: p.p_id });
        if (b) b[p.p_art === "eingang" ? "eingang" : p.p_art === "absage" ? "absage" : "bestaetigt"] = false;
        return { ok: true };
      }
      case "shop_freigabe_markiere": {
        const b = this.find({ id: p.p_id });
        if (b && p.p_art === "eingang_gesendet") b.eingang = true;
        if (b && p.p_art === "absage_gesendet") b.absage = true;
        if (b && p.p_art === "erinnert") b.erinnert = true;
        return { ok: true };
      }
      case "shop_freigabe_erinnerung_liste": {
        if (this.ohneFreigabeMigration) throw new Error("function does not exist");
        const l = this.bestellungen.filter((b) => b.freigabe === "offen" && !b.erinnert && (b.angefordertVorH ?? 0) >= (p.p_stunden as number));
        return { ok: true, bestellungen: l.map((b) => ({ id: b.id, nummer: b.nummer })) };
      }
      case "shop_freigabe_frist_liste": {
        if (this.ohneFreigabeMigration) throw new Error("function does not exist");
        const l = this.bestellungen.filter((b) => b.freigabe === "offen" && (b.angefordertVorH ?? 0) >= (p.p_stunden as number));
        return { ok: true, bestellungen: l.map((b) => ({ id: b.id, nummer: b.nummer })) };
      }
      case "shop_ereignis_schreiben":
        this.ereignisse.push({ art: p.p_art as string, details: p.p_details as Row });
        return { ok: true };
      case "shop_anfrage_anlegen": {
        if (this.anfrageGrund) return { ok: false, grund: this.anfrageGrund };
        const id = `11111111-1111-4111-8111-${String(++this.a).padStart(12, "0")}`;
        const nummer = `PA-2026-${String(this.a).padStart(4, "0")}`;
        this.anfragen.push({ id, nummer, args: p, pfade: [], fehler: false, benachrichtigt: false });
        return { ok: true, id, nummer };
      }
      case "shop_anfrage_bilder_setzen": {
        const an = this.anfragen.find((x) => x.id === p.p_id);
        if (!an) return { ok: false };
        an.pfade = p.p_pfade as string[];
        an.fehler = p.p_fehler as boolean;
        return { ok: true };
      }
      case "shop_widerruf_anlegen": {
        if (this.widerrufGrund) return { ok: false, grund: this.widerrufGrund };
        const vorh = this.widerrufe.find((w) => w.args.p_email === p.p_email && w.args.p_vertrag === p.p_vertrag && w.args.p_positionen === p.p_positionen);
        if (vorh) return { ok: true, wiederholt: true, id: vorh.id, nummer: vorh.nummer, eingegangen_am: vorh.eingegangen_am, bestaetigt: vorh.bestaetigt, abgleich: vorh.abgleich };
        const b = p.p_bestellnummer ? this.bestellungen.find((x) => x.nummer === p.p_bestellnummer) : undefined;
        const abgleich = !b ? "nicht_gefunden" : b.kunde.email === p.p_email ? "passt" : b.kunde.name === p.p_name ? "name_passt" : "abweichend";
        const w = {
          id: `22222222-2222-4222-8222-${String(this.widerrufe.length + 1).padStart(12, "0")}`,
          nummer: `WR-2026-${String(this.widerrufe.length + 1).padStart(4, "0")}`,
          eingegangen_am: "2026-10-08T12:03:21.000+00:00", args: p, abgleich, bestaetigt: false, benachrichtigt: false,
        };
        this.widerrufe.push(w);
        return { ok: true, wiederholt: false, id: w.id, nummer: w.nummer, eingegangen_am: w.eingegangen_am, bestaetigt: false, abgleich };
      }
      case "shop_widerruf_ziel_anzahl": {
        if (this.zielAnzahlAusfall) throw new Error("db weg");
        const anzahl = this.zielAnzahlFest ?? this.widerrufe.filter((w) => w.args.p_email === p.p_email && w.bestaetigt).length;
        return { ok: true, anzahl, stunde: this.stundeFest ?? this.widerrufe.length };
      }
      case "shop_widerruf_markiere": {
        const w = this.widerrufe.find((x) => x.id === p.p_id);
        if (w && p.p_art === "bestaetigt") w.bestaetigt = true;
        if (w && p.p_art === "benachrichtigt") w.benachrichtigt = true;
        return { ok: true };
      }
      case "shop_bereinige_bilder_liste":
        return { ok: true, anfragen: this.bereinigungListe };
      case "shop_bereinigen_extern":
        this.bereinigtMit = p.p_bild_ids as string[];
        return { ok: true, ergebnis: { anfragen_geloescht: this.bereinigtMit.length } };
      default:
        throw new Error("Fake-DB: unbekannte Funktion " + name);
    }
  }
}

export interface PayPalSkript {
  /** Betrag, den PayPal beim Capture meldet (Standard: Bestellbetrag) */
  captureBetragCent?: number;
  captureFehler?: PayPalFehler;
  erzeugenFehler?: boolean;
  captureStatus?: string;
  webhookGueltig: boolean;
}

export class FakePayPal implements PayPalClient {
  skript: PayPalSkript = { webhookGueltig: true };
  orders = new Map<string, OrderEingabe>();
  captures = 0;
  erzeugt = 0;
  /** Erstattungen: captureId/Betrag/Request-Id je Aufruf; Antwort steuerbar. */
  erstattungen: { captureId: string; betragCent: number; requestId: string }[] = [];
  erstattungFehler: PayPalFehler | null = null;
  erstattungStatus = "COMPLETED";
  statusAufHolen = "CREATED";
  private n = 0;

  approveUrl(id: string) {
    return `https://www.sandbox.paypal.com/checkoutnow?token=${id}`;
  }

  async erzeugeOrder(e: OrderEingabe) {
    if (this.skript.erzeugenFehler) throw new PayPalFehler("order_anlegen", 500);
    this.erzeugt++;
    const id = `ORDER${++this.n}TEST`;
    this.orders.set(id, e);
    return { id, approveUrl: this.approveUrl(id) };
  }

  async holeOrder(id: string): Promise<PayPalOrder> {
    return this.mitCapture(id, this.statusAufHolen);
  }

  async capture(id: string): Promise<PayPalOrder> {
    if (this.skript.captureFehler) throw this.skript.captureFehler;
    this.captures++;
    return this.mitCapture(id, this.skript.captureStatus ?? "COMPLETED");
  }

  private mitCapture(id: string, status: string): PayPalOrder {
    const e = this.orders.get(id);
    if (!e) throw new PayPalFehler("order_holen", 404);
    return {
      id, status, links: [],
      capture: status === "COMPLETED" || status === "PENDING"
        ? { captureId: `CAP-${id}`, status, betragCent: this.skript.captureBetragCent ?? e.gesamtCent, waehrung: "EUR", customId: e.nummer }
        : null,
    };
  }

  async erstatte(captureId: string, betragCent: number, requestId: string) {
    this.erstattungen.push({ captureId, betragCent, requestId });
    if (this.erstattungFehler) throw this.erstattungFehler;
    return { refundId: `REFUND-${this.erstattungen.length}`, status: this.erstattungStatus };
  }

  async pruefeWebhook() {
    return this.skript.webhookGueltig;
  }
}

export class FakeNotifier implements Benachrichtiger {
  telegrams: string[] = [];
  alexMails: { betreff: string; text: string }[] = [];
  kundenMails: { an: string; betreff: string; text: string; html?: string; anhaenge?: { filename: string; content: Buffer; contentType: string }[] }[] = [];
  kundenMailOk = true;
  telegramOk = true;
  alexMailOk = true;
  async telegram(text: string) { if (this.telegramOk) this.telegrams.push(text); return this.telegramOk; }
  async mailAlex(betreff: string, text: string) { if (this.alexMailOk) this.alexMails.push({ betreff, text }); return this.alexMailOk; }
  async mailKunde(an: string, betreff: string, text: string, anhaenge?: { filename: string; content: Buffer; contentType: string }[], html?: string) { if (!this.kundenMailOk) return false; this.kundenMails.push({ an, betreff, text, html, anhaenge }); return true; }
}

export const testEnv = (extra: Record<string, string> = {}): ShopEnv =>
  leseEnv({ SHOP_AKTIV: "true", PAYPAL_ENV: "sandbox", SHOP_SITE_URL: "https://test.example", SHOP_ADMIN_URL: "https://admin.example/shop", PAYPAL_WEBHOOK_ID: "WH-TEST", ...extra });

export function neueDeps(extra: Partial<Deps> = {}) {
  const db = new FakeDb();
  const paypal = new FakePayPal();
  const notifier = new FakeNotifier();
  const deps: Deps = { db, paypal, notifier, env: testEnv(), zufall: () => "xyz12345", ...extra };
  return { db, paypal, notifier, deps };
}

export const katalogMitPreis = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
export const kontext = (extra: Partial<Kontext> = {}): Kontext => ({
  produkte: katalogMitPreis,
  farben: [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }],
  versandCent: 490,
  bestellbar: () => true,
  ...extra,
});

export const KUNDE = { name: "Erika Beispiel", strasse: "Teststraße 1", plz: "86663", ort: "Asbach-Bäumenheim", email: "erika@example.org" };

export const bestellEingabe = (extra: Record<string, unknown> = {}) => ({
  idempotenzKey: "key-0123456789abcdef",
  positionen: [{ slug: "koffein-pegel", menge: 2, farbeId: "schwarz" }],
  kunde: KUNDE,
  einwilligungen: { agb: true },
  ...extra,
});
