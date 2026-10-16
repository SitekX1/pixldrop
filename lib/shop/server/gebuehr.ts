import "server-only";
// PayPal-Gebuehr einer Bestellung (Panel: Einnahme verbuchen). Ablauf: Route /api/shop/admin/gebuehr (Header x-shop-admin-secret)
// -> shop_erstattung_daten (reine Lesefunktion, Wegwerf-ereignis_id) -> PayPal GET /v2/payments/captures/{id}.
// Es wird nichts geschrieben und nie die PayPal-Rohantwort weitergegeben.
import { randomUUID } from "node:crypto";
import type { Antwort } from "./bestellung";
import type { ErstattungDeps } from "./erstattung";
import { PayPalFehler } from "./paypal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fehler = (status: number, code: string, error: string): Antwort => ({ status, body: { ok: false, code, error } });

interface Daten {
  ok: boolean;
  grund?: string;
  bezahlt?: boolean;
  paypal_capture_id?: string | null;
  gesamt_cent?: number;
}

/** Body: { id:<Bestell-UUID> }. 200 { ok, gebuehr_cent|null, netto_cent|null, brutto_cent }. */
export async function holeGebuehr(deps: ErstattungDeps, body: unknown): Promise<Antwort> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fehler(400, "ungueltig", "Ungültige Anfrage.");
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some((k) => k !== "id") || typeof b.id !== "string" || !UUID.test(b.id)) {
    return fehler(400, "ungueltig", "Ungültige Anfrage.");
  }
  let d: Daten;
  try {
    d = await deps.db.rpc<Daten>("shop_erstattung_daten", { p_id: b.id.toLowerCase(), p_ereignis_id: randomUUID() });
  } catch (err) {
    console.error("Shop Gebühr: Lesen fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
    return fehler(503, "db", "Gerade nicht möglich.");
  }
  if (!d.ok) {
    if (d.grund === "nicht_gefunden") return fehler(404, "nicht_gefunden", "Bestellung nicht gefunden.");
    if (d.grund === "ungueltige_eingabe") return fehler(400, "ungueltig", "Ungültige Anfrage.");
    return fehler(503, "db", "Gerade nicht möglich.");
  }
  if (d.bezahlt !== true || !d.paypal_capture_id) return fehler(409, "nicht_bezahlt", "Die Bestellung ist nicht per PayPal bezahlt.");
  if (typeof d.gesamt_cent !== "number") return fehler(503, "db", "Gerade nicht möglich.");
  try {
    const c = await deps.paypal.holeCaptureGebuehr(d.paypal_capture_id);
    // Brutto laut PayPal muss zum Bestellbetrag passen, sonst gehoert die Zahlung nicht (mehr) zu dieser Bestellung
    if (c.waehrung !== "EUR" || (c.bruttoCent !== null && c.bruttoCent !== d.gesamt_cent)) {
      console.error("Shop Gebühr: Betrag/Währung weicht ab");
      return fehler(502, "paypal", "PayPal-Abfrage nicht möglich.");
    }
    return { status: 200, body: { ok: true, gebuehr_cent: c.gebuehrCent, netto_cent: c.nettoCent, brutto_cent: d.gesamt_cent } };
  } catch (err) {
    if (err instanceof PayPalFehler) console.error("Shop Gebühr: PayPal-Fehler", err.stufe, err.httpStatus ?? "");
    else console.error("Shop Gebühr: unerwarteter Fehler", err instanceof Error ? err.message : "unbekannt");
    return fehler(502, "paypal", "PayPal-Abfrage nicht möglich.");
  }
}
