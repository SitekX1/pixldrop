import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Besuchszählung: der Browser-Typ wird nur hier im Header ausgewertet; gespeichert werden
// ausschließlich "bot ja/nein" und eine grobe Geräteklasse. Keine IP, kein voller User-Agent.
const BOT = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|go-http|java\//i;

export function klassifiziere(ua: string): { bot: boolean; geraet: string } {
  const u = ua || "";
  const bot = u.length === 0 || BOT.test(u);
  const geraet = /ipad|tablet/i.test(u) ? "tablet" : /mobi|android|iphone/i.test(u) ? "handy" : "desktop";
  return { bot, geraet: bot ? "bot" : geraet };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { seite?: unknown; quelle?: unknown };
    const seite = typeof body.seite === "string" ? body.seite.slice(0, 120) : "";
    const quelle = typeof body.quelle === "string" ? body.quelle.slice(0, 40) : "direkt";
    if (!seite.startsWith("/")) return NextResponse.json({ ok: false }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return new NextResponse(null, { status: 204 }); // 204 darf keinen Body haben, sonst landet es im catch (400)
    const { bot, geraet } = klassifiziere(req.headers.get("user-agent") ?? "");
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    await supabase.from("pixldrop_link_clicks").insert({
      event_name: "shop-besuch",
      event_data: { seite, quelle, bot: bot ? "ja" : "nein", geraet },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
