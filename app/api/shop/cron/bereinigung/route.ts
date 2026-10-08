import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps } from "@/lib/shop/server/deps";
import { fuehreBereinigungAus } from "@/lib/shop/server/bereinigung";
import { gleichGeheim } from "@/lib/shop/server/spam";

// GET /api/shop/cron/bereinigung  (Vercel Cron, taeglich)
// Vercel sendet "Authorization: Bearer <CRON_SECRET>", wenn die Variable CRON_SECRET gesetzt ist.
// Loescht faellige Anfragebilder und ruft die DB-Bereinigung (Anonymisierung) auf.
export async function GET(request: Request) {
  const env = leseEnv();
  const erwartet = env.cronSecret;
  const kopf = request.headers.get("authorization") ?? "";
  if (!erwartet || !gleichGeheim(kopf, `Bearer ${erwartet}`)) {
    return NextResponse.json({ ok: false, error: "Nicht berechtigt" }, { status: 401 });
  }
  try {
    const deps = anfrageDeps(env);
    const r = await fuehreBereinigungAus(deps.db);
    return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Shop-Bereinigung fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
    return NextResponse.json({ ok: false, error: "Bereinigung fehlgeschlagen" }, { status: 500 });
  }
}
