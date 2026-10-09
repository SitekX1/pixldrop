import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { verarbeiteKontakt } from "@/lib/shop/server/kontakt";
import { clientIp, erzeugeBremse, honeypotLeer, ipHash, pruefeFormToken } from "@/lib/shop/server/spam";

// POST /api/shop/kontakt  (JSON)  { token, website:"" (Honeypot), name, email, nachricht }
// Antwort: 200 { ok:true } | { ok:false, code, error, felder? } mit 400 (Token/Honeypot/JSON), 413, 422 (Felder), 429, 503.
// Unabhaengig von SHOP_AKTIV. Token: GET /api/shop/formtoken?f=kontakt
// Rate-Limit: In-Memory-Bremse je Instanz + DB-Zaehler (je IP-Hash und global) in shop_kontakt_zaehlen.

const bremse = erzeugeBremse(60_000, 6);
const NO_STORE = { "Cache-Control": "no-store" };
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: NO_STORE });

const NICHT_VERFUEGBAR = "Das Kontaktformular ist gerade nicht verfügbar. Bitte schreibe an as@sitekx.de.";
const MAX_BYTES = 12_000;

export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop Kontakt nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: NICHT_VERFUEGBAR });
  }

  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });
  }
  let roh: string;
  try {
    roh = await request.text();
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  if (roh.length > MAX_BYTES) return antwort(413, { ok: false, code: "zu_gross", error: "Anfrage zu groß." });

  let body: unknown;
  try {
    body = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }
  const b = body as Record<string, unknown>;

  if (!honeypotLeer(b.website)) return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  if (pruefeFormToken(b.token, env.ipSalt!, { f: "kontakt", ip: hash }) !== "ok") {
    return antwort(400, { ok: false, code: "token", error: "Bitte lade die Seite neu und versuch es noch einmal." });
  }

  const a = await verarbeiteKontakt(deps, b, { ipHash: hash });
  return antwort(a.status, a.body);
}
