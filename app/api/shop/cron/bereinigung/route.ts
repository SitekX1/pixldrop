import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, bestellDeps } from "@/lib/shop/server/deps";
import { fuehreBereinigungAus } from "@/lib/shop/server/bereinigung";
import { gleichGeheim } from "@/lib/shop/server/spam";

// GET /api/shop/cron/bereinigung  (Vercel Cron, aktuell taeglich 03:30 = Hobby-Plan)
// ACHTUNG Frist-Automatik: Wunschtext-Freigaben muessen binnen 24 h entschieden sein; offene Freigaben > 23 h werden hier
// automatisch abgesagt. Dafuer muesste der Cron STUENDLICH laufen ("0 * * * *", Vercel Pro). Im Hobby-Plan greift die Frist
// zusaetzlich "lazy" beim Oeffnen/Entscheiden ueber den Freigabe-Link (lib/shop/server/freigabe.ts).
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
    // PayPal wird fuer die Frist-Automatik (automatische Absage + Erstattung) gebraucht; fehlt die Konfiguration, laeuft der Rest weiter.
    let paypal;
    try { paypal = bestellDeps(env).paypal; } catch { paypal = undefined; }
    const r = await fuehreBereinigungAus(deps.db, { env: deps.env, notifier: deps.notifier, paypal });
    return NextResponse.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Shop-Bereinigung fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
    return NextResponse.json({ ok: false, error: "Bereinigung fehlgeschlagen" }, { status: 500 });
  }
}
