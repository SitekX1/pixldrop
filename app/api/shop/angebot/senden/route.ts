import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { sendeAngebot } from "@/lib/shop/server/angebot";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";
import { VERSAND_CENT } from "@/lib/shop/config";

// POST /api/shop/angebot/senden  (JSON)  Request: { id:<Anfrage-UUID> }
// Aufrufer: Admin Panel, NACHDEM es per RPC shop_angebot_anfordern (nur eingeloggt) die Sendeanforderung gesetzt hat.
// Ohne diese Anforderung in der DB passiert nichts (409 nicht_moeglich); jede Anforderung erlaubt genau EINEN Versand.
// Vorschau-Deployments sind durch Vercel geschuetzt: das Panel sendet dafuer den Header x-vercel-protection-bypass.
// 200: { ok:true, gesendet:true, statusGespeichert:boolean, gueltigBis }
// Fehler: { ok:false, code, error }  400 ungueltig | 409 nicht_moeglich | 413 zu_gross | 422 ungueltig | 429 zu_viele |
//         500 intern | 502 mail | 503 nicht_eingerichtet / db / versand_fehlt
// Unabhaengig von SHOP_AKTIV (Alex' eigene Aktion).

const bremse = erzeugeBremse(60_000, 10);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Angebot nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Der Angebotsversand ist nicht eingerichtet." });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  const roh = await leseBegrenzt(request, 500);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const einst = await holeEinstellungen(env);
  const a = await sendeAngebot(deps, body, { versandCent: VERSAND_CENT, lieferzeit: einst.lieferzeit });
  return antwort(a.status, a.body);
}
