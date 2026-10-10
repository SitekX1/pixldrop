import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet, standardKontext } from "@/lib/shop/server/deps";
import { legeBestellungAn } from "@/lib/shop/server/bestellung";
import { holeEinstellungen, STANDARD_WUNSCHTEXT_PAUSE_TEXT, type ShopEinstellungen } from "@/lib/shop/server/einstellungen";

// Meldung bei pausierten Wunschtexten: Grundtext plus (falls gesetzt) das voraussichtliche Datum.
const WUNSCHTEXT_PAUSE_MELDUNG = (e: ShopEinstellungen) =>
  e.pauseBis ? `${STANDARD_WUNSCHTEXT_PAUSE_TEXT} Voraussichtlich wieder ab ${e.pauseBis}${/[.!?]$/.test(e.pauseBis) ? "" : "."}` : STANDARD_WUNSCHTEXT_PAUSE_TEXT;
import { clientIp, erzeugeBremse, honeypotLeer, ipHash, pruefeFormToken } from "@/lib/shop/server/spam";

// POST /api/shop/bestellung  (JSON)
// { token, website (Honeypot, leer lassen), idempotenzKey, positionen:[{slug,menge,farbeId,optionen,text,schriftId}],
//   kunde:{name,strasse,plz,ort,email,telefon?,hinweis?}, einwilligungen:{agb,widerruf?,verzicht?} }
// Antwort: { ok:true, bestellnummer, approveUrl } -> Browser leitet zu approveUrl (PayPal) weiter.
// Preise werden NIE vom Client uebernommen, sondern serverseitig aus lib/shop/produkte.ts berechnet.

const bremse = erzeugeBremse(60_000, 10);
const NO_STORE = { "Cache-Control": "no-store" };
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: NO_STORE });

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

  // Bestellpause (Panel-Reiter "Einstellungen"): verbindlich serverseitig; bestehende Bestellungen bleiben unberührt.
  const einst = await holeEinstellungen(env);
  if (einst.bestellungPausiert) {
    return antwort(503, { ok: false, code: "pausiert", error: einst.pauseText, pauseBis: einst.pauseBis });
  }

  const laenge = Number(request.headers.get("content-length") ?? 0);
  if (laenge > 50_000) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });

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
  if (pruefeFormToken(b.token, env.ipSalt!, { f: "shop", ip: hash }) !== "ok") {
    return antwort(400, { ok: false, code: "token", error: "Bitte lade die Seite neu und versuch es noch einmal." });
  }

  const kontext = await standardKontext();
  const a = await legeBestellungAn(deps, b, { ipHash: hash, kontext, wunschtextPausiert: einst.wunschtextPausiert, wunschtextPauseText: einst.wunschtextPausiert ? WUNSCHTEXT_PAUSE_MELDUNG(einst) : undefined });
  return antwort(a.status, a.body);
}
