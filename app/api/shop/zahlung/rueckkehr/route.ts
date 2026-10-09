import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { bestellDeps } from "@/lib/shop/server/deps";
import { schliesseZahlungAb } from "@/lib/shop/server/bestellung";

// GET /api/shop/zahlung/rueckkehr?token=<PayPal-Order-ID>&PayerID=...
// return_url der PayPal-Order. Fuehrt das Capture serverseitig aus (idempotent, Betragspruefung)
// und leitet auf die Danke-/Fehlerseite um. Der Client schickt nie einen Betrag.
export async function GET(request: Request) {
  const env = leseEnv();
  const site = env.siteUrl;
  const ziel = (pfad: string) => {
    const r = NextResponse.redirect(`${site}${pfad}`, 303);
    r.headers.set("Cache-Control", "no-store");
    return r;
  };
  if (!env.shopAktiv) return ziel("/3d-druck");

  let deps;
  try {
    deps = bestellDeps(env);
  } catch {
    return ziel("/3d-druck/bestellung?schritt=3&zahlung=fehler");
  }

  const token = new URL(request.url).searchParams.get("token");
  const r = await schliesseZahlungAb(deps, token);
  const nr = r.nummer ? encodeURIComponent(r.nummer) : "";
  switch (r.ziel) {
    case "danke":
      return ziel(`/3d-druck/danke?nr=${nr}${r.freigabe ? "&hinweis=freigabe" : ""}`);
    case "pruefen":
      return ziel(`/3d-druck/danke?nr=${nr}&hinweis=pruefung`);
    case "abbruch":
      return ziel("/3d-druck/bestellung?schritt=3&zahlung=abgebrochen");
    case "fehler":
      return ziel("/3d-druck/bestellung?schritt=3&zahlung=fehler");
    default:
      // keine Zuordnung zur Bestellung: sichtbarer Hinweis statt stiller Weiterleitung
      return ziel("/3d-druck/bestellung?schritt=3&zahlung=unklar");
  }
}
