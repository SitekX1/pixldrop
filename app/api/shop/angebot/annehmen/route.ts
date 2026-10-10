import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { nimmAngebotAn } from "@/lib/shop/server/angebot";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";
import { clientIp, erzeugeBremse, honeypotLeer, ipHash, leseBegrenzt } from "@/lib/shop/server/spam";

// POST /api/shop/angebot/annehmen  (JSON)
// { t:<Token>, website (Honeypot, leer), kunde:{name,strasse,plz,ort,telefon?,hinweis?}, einwilligungen:{agb:true, verzicht:true} }
// Die E-Mail-Adresse wird NICHT abgefragt (kommt aus der Anfrage, dorthin ging der Link). Der Preis kommt aus der DB.
// 200: { ok:true, bestellnummer, approveUrl } -> Browser leitet zu approveUrl (PayPal) weiter (wie /api/shop/bestellung).
//      { ok:true, bereitsBezahlt:true, bestellnummer }
// Fehler: { ok:false, code, error[, felder] }  404 ungueltig | 410 abgelaufen | 409 bereits_angenommen / nicht_moeglich |
//         422 kunde_ungueltig / einwilligung_fehlt | 429 zu_viele | 502 zahlungsdienst |
//         503 pausiert (error = Pausetext) / nicht_aktiv / nicht_eingerichtet / db / texte_fehlen
// Abbruch bei PayPal fuehrt zurueck auf /3d-druck/angebot/<token>?zahlung=abgebrochen (Token bleibt gueltig bis bezahlt/abgelaufen).

const bremse = erzeugeBremse(60_000, 8);
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const env = leseEnv();
  if (!env.shopAktiv) return antwort(503, { ok: false, code: "nicht_aktiv", error: "Der Shop ist noch nicht aktiv." });
  let deps;
  try {
    deps = bestellDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Der Shop ist noch nicht eingerichtet." });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  // Bestellpause: verbindlich serverseitig, auch fuer Angebote (bestehende Bestellungen bleiben unberuehrt).
  const einst = await holeEinstellungen(env);
  if (einst.bestellungPausiert) {
    return antwort(503, { ok: false, code: "pausiert", error: einst.pauseText, pauseBis: einst.pauseBis });
  }

  const roh = await leseBegrenzt(request, 20_000);
  if (roh === null) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  if (!honeypotLeer((body as Record<string, unknown>).website)) return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });

  const a = await nimmAngebotAn(deps, body, { ipHash: hash, pausiert: false });
  return antwort(a.status, a.body);
}
