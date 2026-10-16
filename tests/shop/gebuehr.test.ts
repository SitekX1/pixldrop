import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb } from "@/lib/shop/server/bestellung";
import { holeGebuehr } from "@/lib/shop/server/gebuehr";
import { pruefeAdminZugriff } from "@/lib/shop/server/erstattung";
import { PayPalFehler, erzeugePayPal } from "@/lib/shop/server/paypal";
import { bestellEingabe, kontext, neueDeps } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };

async function bezahlt() {
  const t = neueDeps();
  assert.equal((await legeBestellungAn(t.deps, bestellEingabe(), ctx)).status, 200);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  const b = t.db.bestellungen[0];
  return { ...t, b, id: b.id };
}
const los = (t: { deps: unknown }, body: unknown) => holeGebuehr(t.deps as never, body);

test("Gebühr: Erfolg liefert Gebühr, Netto und Brutto, fragt die Capture-ID ab", async () => {
  const t = await bezahlt();
  t.paypal.gebuehrAntwort = { status: "COMPLETED", bruttoCent: t.b.gesamt_cent, waehrung: "EUR", gebuehrCent: 134, nettoCent: t.b.gesamt_cent - 134 };
  const a = await los(t, { id: t.id });
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, { ok: true, gebuehr_cent: 134, netto_cent: t.b.gesamt_cent - 134, brutto_cent: t.b.gesamt_cent });
  assert.deepEqual(t.paypal.gebuehrAbfragen, [t.b.paypal_capture_id]);
});

test("Gebühr: PayPal liefert keine Gebühr = gebuehr_cent null", async () => {
  const t = await bezahlt();
  t.paypal.gebuehrAntwort = { status: "COMPLETED", bruttoCent: null, waehrung: "EUR", gebuehrCent: null, nettoCent: null };
  const a = await los(t, { id: t.id });
  assert.equal(a.status, 200);
  assert.deepEqual(a.body, { ok: true, gebuehr_cent: null, netto_cent: null, brutto_cent: t.b.gesamt_cent });
});

test("Gebühr: nicht bezahlt = 409, unbekannt = 404, kein PayPal-Aufruf", async () => {
  const t = neueDeps();
  await legeBestellungAn(t.deps, bestellEingabe(), ctx);
  const b = t.db.bestellungen[0];
  const a = await los(t, { id: b.id });
  assert.equal(a.status, 409);
  assert.equal(a.body.code, "nicht_bezahlt");
  const n = await los(t, { id: "11111111-2222-4333-8444-555555555555" });
  assert.equal(n.status, 404);
  assert.equal(n.body.code, "nicht_gefunden");
  assert.equal(t.paypal.gebuehrAbfragen.length, 0);
});

test("Gebühr: PayPal-Fehler und Betragsabweichung = 502 ohne Details", async () => {
  const t = await bezahlt();
  t.paypal.gebuehrFehler = new PayPalFehler("gebuehr", 500, "INTERNAL_SERVICE_ERROR");
  const a = await los(t, { id: t.id });
  assert.equal(a.status, 502);
  assert.deepEqual(a.body, { ok: false, code: "paypal", error: "PayPal-Abfrage nicht möglich." });
  t.paypal.gebuehrFehler = null;
  t.paypal.gebuehrAntwort = { status: "COMPLETED", bruttoCent: t.b.gesamt_cent + 1, waehrung: "EUR", gebuehrCent: 100, nettoCent: null };
  assert.equal((await los(t, { id: t.id })).status, 502);
});

test("Gebühr: ungültige Eingabe = 400", async () => {
  const t = await bezahlt();
  for (const body of [null, [], "x", {}, { id: "abc" }, { id: t.id, extra: 1 }, { id: 5 }]) {
    assert.equal((await los(t, body)).status, 400, JSON.stringify(body));
  }
  assert.equal(t.paypal.gebuehrAbfragen.length, 0);
});

test("Gebühr: falsches oder fehlendes Secret = 401/503", () => {
  const s = "s".repeat(40);
  assert.equal(pruefeAdminZugriff(s, null)?.status, 401);
  assert.equal(pruefeAdminZugriff(s, "falsch")?.status, 401);
  assert.equal(pruefeAdminZugriff(undefined, s)?.status, 503);
  assert.equal(pruefeAdminZugriff(s, s), null);
});

// Echter Client mit gefaktem fetch: strenges Parsen
function client(capture: unknown) {
  const f = (async (url: string) => {
    if (String(url).includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "t", expires_in: 300 }), { status: 200 });
    return new Response(JSON.stringify(capture), { status: 200 });
  }) as never;
  return erzeugePayPal({ env: "sandbox", clientId: "a", clientSecret: "b" }, f);
}
const cap = (breakdown: unknown, cur = "EUR") => ({ status: "COMPLETED", amount: { currency_code: cur, value: "20.00" }, seller_receivable_breakdown: breakdown });
const eur = (value: string, c = "EUR") => ({ currency_code: c, value });

test("Gebühr-Client: liest paypal_fee und net_amount streng", async () => {
  const r = await client(cap({ paypal_fee: eur("0.9"), net_amount: eur("19.10") })).holeCaptureGebuehr("CAPTURE12345");
  assert.deepEqual(r, { status: "COMPLETED", bruttoCent: 2000, waehrung: "EUR", gebuehrCent: 90, nettoCent: 1910 });
  const keine = await client(cap({})).holeCaptureGebuehr("CAPTURE12345");
  assert.equal(keine.gebuehrCent, null);
});

test("Gebühr-Client: falsche Währung, krumme oder zu hohe Gebühr werfen", async () => {
  await assert.rejects(client(cap({ paypal_fee: eur("1.00") }, "USD")).holeCaptureGebuehr("CAPTURE12345"), PayPalFehler);
  for (const v of ["1e2", "-1.00", "1.234", "abc", "100.01", "12345678"]) {
    await assert.rejects(client(cap({ paypal_fee: eur(v) })).holeCaptureGebuehr("CAPTURE12345"), PayPalFehler, v);
  }
  await assert.rejects(client(cap({ paypal_fee: eur("1.00", "USD") })).holeCaptureGebuehr("CAPTURE12345"), PayPalFehler);
  await assert.rejects(client(cap({})).holeCaptureGebuehr("../x"), PayPalFehler);
});
