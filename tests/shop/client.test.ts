import { test } from "node:test";
import assert from "node:assert/strict";
import { baueBestellung, bestellnummerOk, istPaypalUrl, sendeBestellung, sendeAnfrage } from "../../lib/shop/client";

const auswahl = { slug: "x", farbeId: "mintgruen", optionen: { a: "b" }, text: "", schriftId: null, menge: 2 };
const kunde = { name: " Max ", strasse: "Weg 1", plz: "86663", ort: "Ort", email: "a@b.de", hinweis: "" };

test("Bestell-Payload: Honeypot, Key, ohne Text Verzicht-Einwilligung nur wenn gesetzt", () => {
  const b = baueBestellung({ token: "t", idempotenzKey: "k".repeat(20), auswahl, kunde, agb: true, verzicht: false });
  assert.equal(b.website, "");
  assert.deepEqual(b.einwilligungen, { agb: true });
  assert.equal(b.kunde.name, "Max");
  assert.equal("hinweis" in b.kunde, false);
  assert.equal(b.positionen[0].schriftId, null);
  const m = baueBestellung({ token: "t", idempotenzKey: "k".repeat(20), auswahl: { ...auswahl, text: "Montag", schriftId: "f" }, kunde, agb: true, verzicht: true });
  assert.deepEqual(m.einwilligungen, { agb: true, verzicht: true });
});
test("Bestellnummer und PayPal-URL", () => {
  assert.equal(bestellnummerOk("PD-2026-0001"), "PD-2026-0001");
  assert.equal(bestellnummerOk("123"), "123");
  assert.equal(bestellnummerOk("<script>"), null);
  assert.equal(istPaypalUrl("https://www.sandbox.paypal.com/checkoutnow?token=1"), true);
  assert.equal(istPaypalUrl("https://evil.example/paypal.com"), false);
  assert.equal(istPaypalUrl("http://www.paypal.com/x"), false);
});
test("API-Antworten: Erfolg, Feldfehler, Netzfehler", async () => {
  const ok = (async () => new Response(JSON.stringify({ ok: true, approveUrl: "https://www.paypal.com/x" }), { status: 200 })) as typeof fetch;
  const r = await sendeBestellung({}, ok);
  assert.equal(r.ok && r.approveUrl, "https://www.paypal.com/x");
  const bad = (async () => new Response(JSON.stringify({ ok: false, code: "kunde_ungueltig", error: "Bitte prüfe", felder: { plz: "falsch" } }), { status: 422 })) as typeof fetch;
  const e = await sendeBestellung({}, bad);
  assert.equal(!e.ok && e.fehler.felder?.plz, "falsch");
  const netz = (async () => { throw new Error("x"); }) as typeof fetch;
  const n = await sendeAnfrage(new FormData(), netz);
  assert.equal(!n.ok && n.fehler.code, "netz");
  const gross = (async () => new Response("<html>", { status: 413 })) as typeof fetch;
  const g = await sendeAnfrage(new FormData(), gross);
  assert.equal(!g.ok && /zu groß/.test(g.fehler.meldung), true);
});
