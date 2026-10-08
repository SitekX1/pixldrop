import { NextResponse } from "next/server";
import { leseEnv } from "@/lib/shop/server/env";
import { anfrageDeps, NichtEingerichtet } from "@/lib/shop/server/deps";
import { legeAnfrageAn, type HochgeladenesBild } from "@/lib/shop/server/anfrage";
import { MAX_BILDER } from "@/lib/shop/server/bild";
import { clientIp, erzeugeBremse, honeypotLeer, ipHash, pruefeFormToken } from "@/lib/shop/server/spam";
import { holeLagerFarben } from "@/lib/shop/farben";

// POST /api/shop/anfrage  (multipart/form-data)
// Felder: token, website (Honeypot, leer), beschreibung, breite, tiefe, hoehe, farbe, name, email,
//         datenschutz=true, rechte=true (Pflicht, wenn Bilder dabei), bilder (bis 3 Dateien)
// Grenze: Vercel erlaubt Request-Bodies bis ca. 4,5 MB, daher insgesamt hoechstens ca. 4 MB Bilder.

const bremse = erzeugeBremse(60_000, 5);
const NO_STORE = { "Cache-Control": "no-store" };
const antwort = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: NO_STORE });

export async function POST(request: Request) {
  const env = leseEnv();
  if (!env.shopAktiv) return antwort(503, { ok: false, code: "nicht_aktiv", error: "Die Anfrage ist noch nicht aktiv." });

  let deps;
  try {
    deps = anfrageDeps(env);
  } catch (err) {
    if (err instanceof NichtEingerichtet) console.error("Shop nicht eingerichtet, es fehlen:", err.fehlend.join(", "));
    return antwort(503, { ok: false, code: "nicht_eingerichtet", error: "Die Anfrage ist noch nicht eingerichtet." });
  }

  const hash = ipHash(clientIp(request.headers) ?? "unbekannt", env.ipSalt)!;
  if (bremse(hash)) return antwort(429, { ok: false, code: "zu_viele", error: "Zu viele Anfragen. Bitte warte kurz." });

  const laenge = Number(request.headers.get("content-length") ?? 0);
  if (laenge > 4_500_000) {
    return antwort(413, { ok: false, code: "zu_gross", error: "Die Bilder sind zusammen zu groß (höchstens ca. 4 MB)." });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  }

  if (!honeypotLeer(form.get("website"))) return antwort(400, { ok: false, code: "ungueltig", error: "Ungültige Anfrage." });
  if (pruefeFormToken(form.get("token"), env.ipSalt!) !== "ok") {
    return antwort(400, { ok: false, code: "token", error: "Bitte lade die Seite neu und versuch es noch einmal." });
  }

  const dateien = form.getAll("bilder").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (dateien.length > MAX_BILDER) {
    return antwort(422, { ok: false, code: "bilder", error: `Es sind höchstens ${MAX_BILDER} Bilder möglich.` });
  }
  const bilder: HochgeladenesBild[] = [];
  for (const f of dateien) {
    bilder.push({ bytes: new Uint8Array(await f.arrayBuffer()), typ: f.type, name: f.name });
  }

  const felder: Record<string, unknown> = {};
  for (const k of ["beschreibung", "breite", "tiefe", "hoehe", "farbe", "name", "email", "datenschutz", "rechte"]) {
    const v = form.get(k);
    felder[k] = typeof v === "string" ? v : undefined;
  }

  const a = await legeAnfrageAn(deps, felder, bilder, { ipHash: hash, farben: await holeLagerFarben() });
  return antwort(a.status, a.body);
}
