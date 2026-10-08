import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { erzeugeFormToken } from "@/lib/shop/server/spam";

// Liefert ein signiertes Zeit-Token fuer Bestell- und Anfrageformular (Spam-Schutz).
// Das Formular holt es beim Anzeigen und sendet es beim Absenden mit.
// ?f=widerruf: die Widerrufsfunktion (§ 356a BGB) muss auch bei SHOP_AKTIV=false erreichbar bleiben,
// solange Widerrufsfristen laufen.
export async function GET(request: Request) {
  const env = leseEnv();
  const fuerWiderruf = new URL(request.url).searchParams.get("f") === "widerruf";
  if ((!env.shopAktiv && !fuerWiderruf) || !env.ipSalt) {
    return NextResponse.json({ ok: false, error: "Nicht aktiv" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true, token: erzeugeFormToken(env.ipSalt) }, { headers: { "Cache-Control": "no-store" } });
}
