import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { verarbeiteWiderruf } from "@/lib/shop/server/widerruf";
import { clientIp, erzeugeBremse, honeypotLeer, ipHash, pruefeFormToken } from "@/lib/shop/server/spam";

// POST /api/shop/widerruf  (JSON)  - elektronische Widerrufsfunktion, § 356a BGB
// Request:  { token, website:"" (Honeypot), name, vertrag (Bestellnummer PD-JJJJ-NNNN oder freie Angabe),
//             positionen? (String oder String[]; leer = ganzer Vertrag), email, confirm? (true = absenden) }
// Antwort ohne confirm:true  -> 200 { ok:true, schritt:"pruefen", zusammenfassung:{name,vertrag,ganzerVertrag,positionen,email} }
// Antwort mit  confirm:true  -> 200 { ok:true, widerrufsnummer, eingegangenAm (ISO), eingegangenAmText, eingangsbestaetigung:boolean, zusammenfassung }
// Fehler: { ok:false, code, error, felder? } mit 400 (Token/Honeypot/JSON), 413, 422 (Felder), 429, 503.
// Unabhaengig von SHOP_AKTIV: Widerrufe muessen waehrend laufender Fristen immer moeglich sein.
// Token: GET /api/shop/formtoken?f=widerruf

const bremse = erzeugeBremse(60_000, 6);
const NO_STORE = { "Cache-Control": "no-store" };
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: NO_STORE });

const NICHT_VERFUEGBAR = "Die Widerrufsfunktion ist gerade nicht verfügbar. Bitte schreibe deinen Widerruf an as@sitekx.de.";

export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Widerruf nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: NICHT_VERFUEGBAR });
  }

  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  const laenge = Number(request.headers.get("content-length") ?? 0);
  if (laenge > 20_000) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const b = body as Record<string, unknown>;

  if (!honeypotLeer(b.website)) return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  if (pruefeFormToken(b.token, env.ipSalt!) !== "ok") {
    return antwort(400, { ok: false, code: "token", error: "Bitte lade die Seite neu und versuch es noch einmal." });
  }

  const a = await verarbeiteWiderruf(deps, b, { ipHash: hash });
  return antwort(a.status, a.body);
}
