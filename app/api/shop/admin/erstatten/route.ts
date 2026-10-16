import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { adminSecretOk } from "@/lib/shop/server/versandmail";
import { erstatteBestellung } from "@/lib/shop/server/erstattung";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/admin/erstatten  (JSON)  Request: { id:<Bestell-UUID>, betrag_cent:int, ereignis_id:<UUID>, grund:string(3..200) }
// Aufrufer: NUR das Admin Panel (Route /api/shop/erstatten, dort Session + Admin-Pruefung) mit Header x-shop-admin-secret
// (SHOP_ADMIN_SECRET, mind. 32 Zeichen, Konstantzeit-Vergleich). Ohne gueltiges Secret: 401, nichts passiert.
// Loest eine PayPal-Erstattung aus (Request-Id "refund-<nummer>-<ereignis_id>": dieselbe ereignis_id erstattet NIE zweimal).
// Der Shop-Stand wird danach ueber die Panel-Buchungsroute (shop_erstattung_anwenden, gleiche ereignis_id) nachgezogen.
// 200: { ok:true, bereits_erstattet:boolean, refund_id:string|null, status, erstattet_cent }
// Fehler: { ok:false, code, error } 400/422 ungueltig | 401 nicht_berechtigt | 404/409 nicht_moeglich | 413 zu_gross | 429 zu_viele |
//         502 paypal_fehler (mit issue) | 503 nicht_eingerichtet / db
// Unabhaengig von SHOP_AKTIV (eigene Aktion von Alex).

const bremse = erzeugeBremse(60_000, 10);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt ?? "erstatten") ?? "unbekannt";
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });
  if (!env.adminSecret) {
    console.error("Shop Erstattung nicht eingerichtet, es fehlt: SHOP_ADMIN_SECRET");
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Erstattung ist nicht eingerichtet." });
  }
  if (!adminSecretOk(env.adminSecret, request.headers.get("x-shop-admin-secret"))) {
    return antwort(401, { ok: false, code: "nicht_berechtigt", error: "Nicht berechtigt." });
  }
  let deps;
  try {
    deps = bestellDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Erstattung nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Erstattung ist nicht eingerichtet." });
  }
  const roh = await leseBegrenzt(request, 1500);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const a = await erstatteBestellung(deps, body);
  return antwort(a.status, a.body);
}
