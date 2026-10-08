import { test } from "node:test";
import assert from "node:assert/strict";
import { fuegeHinzu, aendereMenge, entferne, anzahlStuecke, zwischensummeCent, MAX_POSITIONEN_KORB, type Auswahl } from "../../lib/shop/auswahl";
import { baueBestellung, sendeKontakt, holeKontaktToken } from "../../lib/shop/client";

const a = (slug: string, o: Partial<Auswahl> = {}): Auswahl => ({ slug, farbeId: "rot", optionen: {}, text: "", schriftId: null, menge: 1, ...o });

test("Warenkorb: gleiche Konfiguration addiert Menge, andere Position neu", () => {
  let k = fuegeHinzu([], a("schild", { text: "A\nB" })).korb;
  k = fuegeHinzu(k, a("schild", { text: "A\nB", menge: 2 })).korb;
  assert.equal(k.length, 1);
  assert.equal(k[0].menge, 3);
  k = fuegeHinzu(k, a("schild", { text: "A\nC" })).korb;
  k = fuegeHinzu(k, a("untersetzer")).korb;
  assert.equal(k.length, 3);
  assert.equal(anzahlStuecke(k), 5);
});
test("Warenkorb: Menge begrenzt, Entfernen, Positionslimit, Summe", () => {
  let k = fuegeHinzu([], a("x", { menge: 15 })).korb;
  k = fuegeHinzu(k, a("x", { menge: 15 })).korb;
  assert.equal(k[0].menge, 20);
  assert.equal(aendereMenge(k, 0, 0)[0].menge, 1);
  assert.equal(aendereMenge(k, 0, 99)[0].menge, 20);
  assert.equal(entferne(k, 0).length, 0);
  let voll = [] as Auswahl[];
  for (let i = 0; i < MAX_POSITIONEN_KORB; i++) voll = fuegeHinzu(voll, a("p" + i)).korb;
  const r = fuegeHinzu(voll, a("neu"));
  assert.equal(r.ok, false);
  assert.equal(r.korb.length, MAX_POSITIONEN_KORB);
  assert.equal(zwischensummeCent([a("p", { menge: 2 }), a("q")], (s) => (s === "p" ? 990 : 500)), 2480);
  assert.equal(zwischensummeCent([a("p")], () => null), null);
});
test("Bestell-Payload: mehrere Positionen, Text nur bei Positionen mit Text", () => {
  const kunde = { name: "M", strasse: "W 1", plz: "86663", ort: "O", email: "a@b.de", hinweis: "" };
  const b = baueBestellung({ token: "t", idempotenzKey: "k".repeat(20), auswahl: [a("schild", { text: " Hi ", schriftId: "f" }), a("untersetzer", { menge: 3, schriftId: "f" })], kunde, agb: true, verzicht: true });
  assert.equal(b.positionen.length, 2);
  assert.equal(b.positionen[0].text, "Hi");
  assert.equal(b.positionen[1].text, "");
  assert.equal(b.positionen[1].schriftId, null);
  assert.equal(b.positionen[1].menge, 3);
});
test("Kontakt: Token, Erfolg, Feldfehler 422, 429, 503, Netz", async () => {
  const res = (status: number, body: object) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  assert.equal(await holeKontaktToken((async (u: string) => { assert.match(String(u), /f=kontakt/); return new Response(JSON.stringify({ ok: true, token: "tk" })); }) as unknown as typeof fetch), "tk");
  const daten = { name: " Max ", email: "a@b.de", nachricht: " Hallo " };
  let body: Record<string, unknown> = {};
  const ok = await sendeKontakt({ token: "t", website: "", daten }, (async (_u: string, i: RequestInit) => { body = JSON.parse(String(i.body)); return new Response(JSON.stringify({ ok: true })); }) as unknown as typeof fetch);
  assert.equal(ok.ok, true);
  assert.deepEqual(body, { token: "t", website: "", name: "Max", email: "a@b.de", nachricht: "Hallo" });
  const f422 = await sendeKontakt({ token: "t", website: "", daten }, res(422, { ok: false, code: "eingabe", error: "Bitte prüfen.", felder: { email: "Ungültig" } }));
  assert.ok(!f422.ok && f422.fehler.felder?.email === "Ungültig");
  const f429 = await sendeKontakt({ token: "t", website: "", daten }, res(429, { ok: false }));
  assert.ok(!f429.ok && f429.fehler.code === "zu_oft");
  const f503 = await sendeKontakt({ token: "t", website: "", daten }, res(503, { ok: false, code: "x", error: "intern" }));
  assert.ok(!f503.ok && /nicht erreichbar/.test(f503.fehler.meldung));
  const netz = await sendeKontakt({ token: "t", website: "", daten }, (async () => { throw new Error("x"); }) as unknown as typeof fetch);
  assert.ok(!netz.ok && netz.fehler.code === "netz");
});
