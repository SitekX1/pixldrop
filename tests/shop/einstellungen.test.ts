import test from "node:test";
import assert from "node:assert/strict";
import { holeEinstellungen, leereEinstellungenCache, normalisiere, FALLBACK, STANDARD_PAUSE_TEXT } from "@/lib/shop/server/einstellungen";
import { leseEnv } from "@/lib/shop/server/env";
import { agbKlartext } from "@/lib/shop/agb-daten";

const env = leseEnv({ SHOP_SUPABASE_URL: "https://x.supabase.co", SHOP_SUPABASE_ANON_KEY: "k" });

test("normalisiere: Pausetext mit Datum, Bool-Werte, Fallbacks", () => {
  const e = normalisiere({ lieferzeit_text: "5-7 Werktage", bestellung_pausiert: true, pause_text: "Grund.", pause_bis: "Montag, 20.10.", wunschtext_pausiert: "true" });
  assert.equal(e.lieferzeit, "5-7 Werktage");
  assert.equal(e.bestellungPausiert, true);
  assert.equal(e.wunschtextPausiert, true);
  assert.equal(e.pauseText, "Grund. Voraussichtlich wieder ab Montag, 20.10.");
  const leer = normalisiere(null);
  assert.equal(leer.bestellungPausiert, false);
  assert.equal(leer.pauseText, STANDARD_PAUSE_TEXT);
  assert.equal(leer.lieferzeit, FALLBACK.lieferzeit);
});

test("holeEinstellungen: liest per RPC, cached, Fehler -> Fallback (nicht pausiert)", async () => {
  leereEinstellungenCache();
  let n = 0;
  const ok = (async () => { n++; return new Response(JSON.stringify({ bestellung_pausiert: true, pause_text: "X" }), { status: 200 }); }) as unknown as typeof fetch;
  const a = await holeEinstellungen(env, ok, 1000);
  const b = await holeEinstellungen(env, ok, 2000);
  assert.equal(a.bestellungPausiert, true);
  assert.equal(b.bestellungPausiert, true);
  assert.equal(n, 1, "zweiter Aufruf kommt aus dem Cache");
  leereEinstellungenCache();
  const kaputt = (async () => { throw new Error("netz"); }) as unknown as typeof fetch;
  const c = await holeEinstellungen(env, kaputt, 5000);
  assert.equal(c.bestellungPausiert, false);
  assert.equal(c.lieferzeit, FALLBACK.lieferzeit);
  leereEinstellungenCache();
});

test("AGB-Klartext übernimmt die Lieferzeit aus den Einstellungen", () => {
  assert.ok(agbKlartext("9 Werktage").includes("9 Werktage"));
  assert.ok(!agbKlartext("9 Werktage").includes("3-5 Werktage"));
});
