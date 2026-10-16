import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { pruefeAdminZugriff } from "@/lib/shop/server/erstattung";
import { holeGebuehr } from "@/lib/shop/server/gebuehr";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/admin/gebuehr  (JSON)  Request: { id:<Bestell-UUID> }
// Aufrufer: NUR das Admin Panel mit Header x-shop-admin-secret (SHOP_ADMIN_SECRET, Konstantzeit-Vergleich). Nur lesend.
// 200: { ok:true, gebuehr_cent:int|null, netto_cent:int|null, brutto_cent:int }
// Fehler: { ok:false, code, error } 400 ungueltig | 401 nicht_berechtigt | 404 nicht_gefunden | 409 nicht_bezahlt |
//         413 zu_gross | 429 zu_viele | 502 paypal | 503 nicht_eingerichtet / db
// Unabhaengig von SHOP_AKTIV.

const bremse = erzeugeBremse(60_000, 20);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt ?? "gebuehr") ?? "unbekannt";
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });
  if (!env.adminSecret) console.error("Shop Gebühr nicht eingerichtet, es fehlt: SHOP_ADMIN_SECRET");
  const zugriff = pruefeAdminZugriff(env.adminSecret, request.headers.get("x-shop-admin-secret"));
  if (zugriff) return antwort(zugriff.status, zugriff.body);
  let deps;
  try {
    deps = bestellDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Gebühr nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Gebührenabfrage ist nicht eingerichtet." });
  }
  const roh = await leseBegrenzt(request, 500);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const a = await holeGebuehr(deps, body);
  return antwort(a.status, a.body);
}
