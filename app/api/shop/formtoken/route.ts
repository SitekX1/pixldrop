import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { erzeugeFormToken } from "@/lib/shop/server/spam";

// Liefert ein signiertes Zeit-Token fuer Bestell- und Anfrageformular (Spam-Schutz).
// Das Formular holt es beim Anzeigen und sendet es beim Absenden mit.
export async function GET() {
  const env = leseEnv();
  if (!env.shopAktiv || !env.ipSalt) {
    return NextResponse.json({ ok: false, error: "Nicht aktiv" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true, token: erzeugeFormToken(env.ipSalt) }, { headers: { "Cache-Control": "no-store" } });
}
