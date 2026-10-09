import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { entscheideFreigabe } from "@/lib/shop/server/freigabe";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/freigabe  (JSON)  Request: { b:<Bestell-UUID>, t:<Token>, aktion:"ok"|"nein", grund?:"marke"|"unzulaessig"|"unleserlich"|"sonstiges" }
// grund ist bei aktion "nein" Pflicht, bei "ok" wird er ignoriert. Das Token gilt nur fuer die Aktion aus dem Link.
// 200: { ok:true, status:"freigegeben", neu:boolean, mail:boolean }
//      { ok:true, status:"abgelehnt", neu:boolean, erstattung:"erstattet"|"erstattung_offen", mail:boolean }
//      neu:false = Entscheidung stand schon so fest (Wiederholung; fehlende Mail/Erstattung wird nachgeholt, nie doppelt).
// Fehler: { ok:false, code, error }  400 ungueltig | 403 link_ungueltig | 409 bereits_entschieden ({status}) / nicht_moeglich |
//         409 frist_abgelaufen (nur "ok": > 23,5 h nach Anforderung; die Bestellung wird dabei automatisch abgesagt und erstattet) |
//         413 zu_gross | 422 grund_fehlt / ungueltig | 429 zu_viele | 503 nicht_eingerichtet / db
// Unabhaengig von SHOP_AKTIV.

const bremse = erzeugeBremse(60_000, 10);
const MAX_BYTES = 2_000;
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = bestellDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Freigabe nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Freigabe ist gerade nicht verfügbar." });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  const roh = await leseBegrenzt(request, MAX_BYTES);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const a = await entscheideFreigabe(deps, body);
  return antwort(a.status, a.body);
}
