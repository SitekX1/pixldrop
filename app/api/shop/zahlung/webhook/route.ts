import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { verarbeiteWebhook } from "@/lib/shop/server/bestellung";

// POST /api/shop/zahlung/webhook  (PayPal-Webhook PAYMENT.CAPTURE.COMPLETED)
// Absicherung zum Capture-Weg: Signatur wird bei PayPal geprueft (verify-webhook-signature),
// Buchung ist idempotent (gleiche DB-Funktion wie die Rueckkehr-Route).
// Antworten: 200 verarbeitet/ignoriert, 401 Signatur falsch, 500 -> PayPal stellt erneut zu.
export async function POST(request: Request) {
  const env = leseEnv();
  let deps;
  try {
    deps = bestellDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Webhook: Shop nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return NextResponse.json({ ok: false, error: "Nicht eingerichtet" }, { status: 503 });
  }
  const roh = await request.text();
  if (roh.length > 200_000) return NextResponse.json({ ok: false, error: "Zu groß" }, { status: 413 });
  const a = await verarbeiteWebhook(deps, request.headers, roh);
  return NextResponse.json(a.body, { status: a.status, headers: { "Cache-Control": "no-store" } });
}
