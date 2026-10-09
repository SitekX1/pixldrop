import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { holeFreigabeDaten } from "@/lib/shop/server/freigabe";
import { clientIp, erzeugeBremse, ipHash } from "@/lib/shop/server/spam";

// GET /api/shop/freigabe/daten?b=<Bestell-UUID>&t=<Token aus dem Link>
// Daten fuer die Freigabe-Seite (/3d-druck/freigabe). Aendert NIE etwas (Link-Vorschauen duerfen nichts ausloesen).
// 200: { ok:true, aktion:"ok"|"nein", bestellnummer, status:"offen"|"freigegeben"|"abgelehnt", angefordertAm, entschiedenAm,
//        grund:string|null, positionen:[{name,menge,farbe,farbeHex,text,schrift,optionen,individuell}], gruende:[{id,label}] }
//      Keine Kundendaten. Ist status nicht "offen", ist schon entschieden worden.
// Fehler: { ok:false, code, error }  400 ungueltig | 403 link_ungueltig (falsch/abgelaufen/unbekannt, bewusst gleich) |
//         429 zu_viele | 503 nicht_eingerichtet / db
// Unabhaengig von SHOP_AKTIV: eine bezahlte Bestellung muss immer entscheidbar sein.

const bremse = erzeugeBremse(60_000, 30);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Freigabe nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Freigabe ist gerade nicht verfügbar." });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  const p = new URL(request.url).searchParams;
  const a = await holeFreigabeDaten(deps, { b: p.get("b"), t: p.get("t") });
  return antwort(a.status, a.body);
}
