import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { clientIp, erzeugeBremse, erzeugeFormToken, ipHash } from "@/lib/shop/server/spam";

// Liefert ein signiertes Zeit-Token (30 Minuten gueltig, mind. 3 s alt) fuer Bestell-, Anfrage-, Kontakt- und
// Widerrufsformular (Spam-Schutz). Das Token ist an die Formularart UND den IP-Hash gebunden.
// Das Formular holt es beim Anzeigen und sendet es beim Absenden mit (bei "token"-Fehler holt der Client neu).
// ?f=widerruf / ?f=kontakt: muessen auch bei SHOP_AKTIV=false erreichbar bleiben, solange Widerrufsfristen
// laufen (§ 356a BGB). Alles andere (kein/unbekanntes f) = "shop" (Bestellung + Anfrage).
// IP-Bremse: 30 Abrufe je Minute und IP (pro Serverless-Instanz).

const bremse = erzeugeBremse(60_000, 30);
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const env = leseEnv();
  const param = new URL(request.url).searchParams.get("f");
  const f = param === "widerruf" || param === "kontakt" ? param : "shop";
  const immerErreichbar = f !== "shop";
  if ((!env.shopAktiv && !immerErreichbar) || !env.ipSalt) {
    return NextResponse.json({ ok: false, error: "Nicht aktiv" }, { status: 503, headers: NO_STORE });
  }
  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) {
    return NextResponse.json({ ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." }, { status: 429, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, token: erzeugeFormToken(env.ipSalt, { f, ip: hash }) }, { headers: NO_STORE });
}
