import { NextResponse } from "next/server";
import { AKTION_FEHLER, pruefeAktionscode } from "@/lib/shop/aktion";
import { clientIp, erzeugeBremse } from "@/lib/shop/server/spam";
import { leseEnv } from "@/lib/shop/server/env";

// GET /api/shop/aktion?code=WEIHNACHTEN10 -> { ok:true, code, prozent, bis } | { ok:false, error }
// Nur Vorschau fuer den Warenkorb; verbindlich rechnet der Server bei der Bestellung (lib/shop/server/preise.ts).
const bremse = erzeugeBremse(60_000, 20);
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const env = leseEnv();
  if (bremse(clientIp(request.headers) ?? env.ipSalt ?? "unbekannt")) {
    return NextResponse.json({ ok: false, error: "Zu viele Versuche. Bitte warte kurz." }, { status: 429, headers: NO_STORE });
  }
  const p = pruefeAktionscode(new URL(request.url).searchParams.get("code"));
  if (!p.ok) return NextResponse.json({ ok: false, error: AKTION_FEHLER[p.grund] }, { status: 200, headers: NO_STORE });
  return NextResponse.json({ ok: true, code: p.aktion.code, prozent: p.aktion.prozent, bis: p.aktion.bis }, { headers: NO_STORE });
}
