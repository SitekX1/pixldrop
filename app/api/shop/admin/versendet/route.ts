import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { adminSecretOk, sendeVersandmail } from "@/lib/shop/server/versandmail";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/admin/versendet  (JSON)  Request: { id:<Bestell-UUID>, sendungsnummer?:string|null, erneut?:boolean }
// Aufrufer: NUR das Admin Panel (Route /api/shop/versendet, dort Session + Admin-Pruefung) mit Header x-shop-admin-secret
// (Umgebungsvariable SHOP_ADMIN_SECRET, mind. 32 Zeichen; Vergleich in konstanter Zeit). Ohne gueltiges Secret: 401, nichts passiert.
// Setzt die Bestellung auf "versendet" (nur wenn bezahlt, nicht storniert/erstattet, Freigabe nicht offen) und schickt dem Kunden
// GENAU EINE Mail "Deine Bestellung ist unterwegs" (mit Sendungsnummer + Tracking-Link bei Hermes/DHL). erneut:true sendet bewusst nochmal.
// 200: { ok:true, status:"versendet"|..., mail:"gesendet"|"schon"|"fehler" }   mail:"fehler" = Status steht, Mail ging NICHT raus (erneut senden)
// Fehler: { ok:false, code, error }  400 ungueltig | 401 nicht_berechtigt | 404/409 nicht_moeglich | 413 zu_gross | 422 ungueltig / sendungsnummer_ungueltig |
//         429 zu_viele | 500 intern | 503 nicht_eingerichtet / db
// Unabhaengig von SHOP_AKTIV (Alex' eigene Aktion).

const bremse = erzeugeBremse(60_000, 20);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt ?? "versendet") ?? "unbekannt";
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });
  if (!env.adminSecret) {
    console.error("Shop Versandmail nicht eingerichtet, es fehlt: SHOP_ADMIN_SECRET");
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Der Versandmail-Versand ist nicht eingerichtet." });
  }
  if (!adminSecretOk(env.adminSecret, request.headers.get("x-shop-admin-secret"))) {
    return antwort(401, { ok: false, code: "nicht_berechtigt", error: "Nicht berechtigt." });
  }
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Versandmail nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Der Versandmail-Versand ist nicht eingerichtet." });
  }
  const roh = await leseBegrenzt(request, 600);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const a = await sendeVersandmail(deps, body);
  return antwort(a.status, a.body);
}
