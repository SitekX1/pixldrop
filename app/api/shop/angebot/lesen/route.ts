import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { liesAngebot } from "@/lib/shop/server/angebot";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";
import { clientIp, erzeugeBremse, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/angebot/lesen  (JSON)  Request: { t:<Token aus dem Link> }   (POST, damit das Token nicht in Query-Logs landet)
// 200: { ok:true, anfragenummer, name, beschreibung, farbe, preisCent, versandCent, gesamtCent, lieferzeit, text, gueltigBis,
//        zahlungOffen:boolean, pausiert:boolean, pauseText:string|null }
//      (pausiert=true: Seite zeigt Hinweis statt Annahme; Lesen bleibt moeglich)
// Fehler: { ok:false, code, error[, anfragenummer] }  404 ungueltig | 410 abgelaufen | 409 bereits_angenommen | 413 | 429 zu_viele | 503
// Aendert nichts. Unabhaengig von SHOP_AKTIV.

const bremse = erzeugeBremse(60_000, 20);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Angebot nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Das Angebot ist gerade nicht verfügbar." });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });
  const roh = await leseBegrenzt(request, 500);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let t: unknown;
  try {
    t = (JSON.parse(roh) as Record<string, unknown> | null)?.t;
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const a = await liesAngebot(deps, t);
  if (a.status === 200) {
    const einst = await holeEinstellungen(env);
    a.body.pausiert = einst.bestellungPausiert;
    a.body.pauseText = einst.bestellungPausiert ? einst.pauseText : null;
  }
  return antwort(a.status, a.body);
}
