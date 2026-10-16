import "server-only";
// PayPal-Erstattung aus dem Admin Panel (Panel: Bestellungen > Erstattung > "Per PayPal erstatten und verbuchen").
// Ablauf: Panel-Route (Session + Admin) -> POST /api/shop/admin/erstatten (Header x-shop-admin-secret) -> erstatteBestellung:
//   shop_erstattung_daten (nur lesen: bezahlt? Capture-ID? noch erstattbar? anonymisiert? ereignis_id schon verbucht?)
//   -> PayPal-Refund mit Request-Id "refund-<nummer>-<ereignis_id>" (gleiche UUID = gleiche Erstattung, nie doppelt).
// Der Shop-Stand (erstattet_cent, Ereignis) wird HIER NICHT geschrieben: das macht wie bisher die Panel-Buchungsroute
// (shop_erstattung_anwenden, idempotent ueber dieselbe ereignis_id). So gibt es keine doppelte Zaehlung und keine neue Schreib-RPC.
// Kein Kundenmail-Versand (die Widerrufs-Abwicklung kommuniziert Alex selbst).
import type { Db } from "./db";
import type { Antwort } from "./bestellung";
import { PayPalFehler, type PayPalClient } from "./paypal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERLAUBT = ["id", "betrag_cent", "ereignis_id", "grund"];
const MAX_CENT = 200_000; // wie gesamt_cent-Check der Tabelle

export interface ErstattungDeps {
  db: Db;
  paypal: PayPalClient;
}

interface Daten {
  ok: boolean;
  grund?: string;
  nummer?: string;
  bezahlt?: boolean;
  paypal_capture_id?: string | null;
  gesamt_cent?: number;
  erstattet_cent?: number;
  anonymisiert?: boolean;
  ereignis_angewendet?: boolean;
}

const fehler = (status: number, code: string, error: string, extra: Record<string, unknown> = {}): Antwort => ({
  status,
  body: { ok: false, code, error, ...extra },
});

/** Nur kurze PayPal-Fehlercodes (z. B. INSTRUMENT_DECLINED) weitergeben, nie freien Text. */
const sauberesIssue = (i: string | undefined) => (i && /^[A-Z0-9_]{3,64}$/.test(i) ? i : undefined);

/** Body: { id:<Bestell-UUID>, betrag_cent:1..noch erstattbar, ereignis_id:<UUID>, grund:3..200 Zeichen }. */
export async function erstatteBestellung(deps: ErstattungDeps, body: unknown): Promise<Antwort> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => !ERLAUBT.includes(k))) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  if (typeof b.id !== "string" || !UUID.test(b.id) || typeof b.ereignis_id !== "string" || !UUID.test(b.ereignis_id)) {
    return fehler(400, "ungueltig", "Ungültige Anfrage.");
  }
  const betrag = b.betrag_cent;
  if (typeof betrag !== "number" || !Number.isInteger(betrag) || betrag < 1 || betrag > MAX_CENT) {
    return fehler(422, "ungueltig", "Ungültiger Betrag.");
  }
  const grund = typeof b.grund === "string" ? b.grund.trim() : "";
  if (grund.length < 3 || grund.length > 200) return fehler(422, "ungueltig", "Der Grund muss 3 bis 200 Zeichen lang sein.");
  const id = b.id;
  const ereignisId = b.ereignis_id.toLowerCase();

  let d: Daten;
  try {
    d = await deps.db.rpc<Daten>("shop_erstattung_daten", { p_id: id, p_ereignis_id: ereignisId });
  } catch (err) {
    console.error("Shop Erstattung: Lesen fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
    return fehler(503, "db", "Gerade nicht möglich. Es wurde nichts erstattet.");
  }
  if (!d.ok) {
    if (d.grund === "nicht_gefunden") return fehler(404, "nicht_moeglich", "Bestellung nicht gefunden.", { grund: "nicht_gefunden" });
    if (d.grund === "ungueltige_eingabe") return fehler(422, "ungueltig", "Ungültige Anfrage.");
    return fehler(503, "db", "Gerade nicht möglich. Es wurde nichts erstattet.");
  }
  if (typeof d.nummer !== "string" || typeof d.gesamt_cent !== "number" || typeof d.erstattet_cent !== "number") {
    return fehler(503, "db", "Gerade nicht möglich. Es wurde nichts erstattet.");
  }

  // Dieselbe ereignis_id ist im Shop schon verbucht: PayPal wurde damals erstattet, nichts mehr tun (idempotent).
  if (d.ereignis_angewendet === true) {
    return { status: 200, body: { ok: true, bereits_erstattet: true, refund_id: null, status: "bereits_verbucht", erstattet_cent: d.erstattet_cent } };
  }
  if (d.anonymisiert === true) return fehler(409, "nicht_moeglich", "Die Bestellung ist anonymisiert.", { grund: "anonymisiert" });
  if (d.bezahlt !== true) return fehler(409, "nicht_moeglich", "Die Bestellung ist nicht bezahlt.", { grund: "nicht_bezahlt" });
  if (!d.paypal_capture_id) return fehler(409, "nicht_moeglich", "Zu dieser Bestellung gibt es keine PayPal-Zahlung.", { grund: "keine_capture" });
  const rest = d.gesamt_cent - d.erstattet_cent;
  if (betrag > rest) {
    return fehler(409, "nicht_moeglich", "Der Betrag ist höher als der noch erstattbare Rest.", { grund: "betrag_zu_hoch", noch_erstattbar_cent: Math.max(rest, 0) });
  }

  try {
    const r = await deps.paypal.erstatte(d.paypal_capture_id, betrag, `refund-${d.nummer}-${ereignisId}`);
    if (r.status !== "COMPLETED" && r.status !== "PENDING") {
      console.error("Shop Erstattung: PayPal-Status", r.status, d.nummer);
      return fehler(502, "paypal_fehler", "PayPal hat die Erstattung nicht ausgeführt.", { issue: sauberesIssue(r.status) });
    }
    console.info("Shop Erstattung ausgelöst:", d.nummer, r.refundId, betrag);
    return { status: 200, body: { ok: true, bereits_erstattet: false, refund_id: r.refundId, status: r.status, erstattet_cent: d.erstattet_cent + betrag } };
  } catch (err) {
    if (err instanceof PayPalFehler) {
      const issue = sauberesIssue(err.issue);
      console.error("Shop Erstattung fehlgeschlagen:", d.nummer, err.stufe, err.httpStatus ?? "", issue ?? "");
      // PayPal sagt: Zahlung ist schon voll erstattet / Betrag zu hoch (z. B. von Hand in PayPal): keine neue Erstattung moeglich
      if (err.httpStatus === 422 && (issue === "CAPTURE_FULLY_REFUNDED" || issue === "REFUND_AMOUNT_EXCEEDED")) {
        return fehler(409, "nicht_moeglich", "PayPal meldet: Die Zahlung ist bereits (teilweise) erstattet. Bitte in PayPal prüfen.", { grund: "paypal_schon_erstattet", issue });
      }
      return fehler(502, "paypal_fehler", "PayPal hat die Erstattung nicht ausgeführt. Es wurde nichts gebucht.", issue ? { issue } : {});
    }
    console.error("Shop Erstattung: unerwarteter Fehler", err instanceof Error ? err.message : "unbekannt");
    return fehler(502, "paypal_fehler", "PayPal hat die Erstattung nicht ausgeführt. Es wurde nichts gebucht.");
  }
}
