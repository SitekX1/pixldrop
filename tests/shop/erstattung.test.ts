import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb } from "@/lib/shop/server/bestellung";
import { erstatteBestellung } from "@/lib/shop/server/erstattung";
import { PayPalFehler } from "@/lib/shop/server/paypal";
import { bestellEingabe, kontext, neueDeps } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };
const EV = "11111111-2222-4333-8444-555555555555";
const EV2 = "66666666-2222-4333-8444-555555555555";

async function bezahlt() {
  const t = neueDeps();
  const a = await legeBestellungAn(t.deps, bestellEingabe(), ctx);
  assert.equal(a.status, 200);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  const b = t.db.bestellungen[0];
  return { ...t, b, id: b.id };
}
const los = (t: { deps: { db: unknown; paypal: unknown } }, body: unknown) => erstatteBestellung(t.deps as never, body);
const ok = (t: { id: string }, extra: Record<string, unknown> = {}) => ({ id: t.id, betrag_cent: 500, ereignis_id: EV, grund: "Kulanz", ...extra });

test("Erstattung: Teilbetrag geht an PayPal mit Capture-ID und fester Request-Id", async () => {
  const t = await bezahlt();
  const a = await los(t, ok(t));
  assert.equal(a.status, 200);
  assert.equal(a.body.ok, true);
  assert.equal(a.body.bereits_erstattet, false);
  assert.equal(a.body.refund_id, "REFUND-1");
  assert.equal(a.body.erstattet_cent, 500);
  assert.equal(t.paypal.erstattungen.length, 1);
  assert.deepEqual(t.paypal.erstattungen[0], { captureId: t.b.paypal_capture_id, betragCent: 500, requestId: `refund-${t.b.nummer}-${EV}` });
});

test("Erstattung: Wiederholung vor der Buchung nutzt dieselbe Request-Id (PayPal erstattet nicht doppelt)", async () => {
  const t = await bezahlt();
  await los(t, ok(t));
  await los(t, ok(t));
  assert.equal(t.paypal.erstattungen.length, 2, "Aufruf wiederholt sich, aber mit identischer Request-Id");
  assert.equal(t.paypal.erstattungen[0].requestId, t.paypal.erstattungen[1].requestId);
});

test("Erstattung: ereignis_id schon verbucht = 200 bereits_erstattet, KEIN PayPal-Aufruf", async () => {
  const t = await bezahlt();
  t.b.angewendeteEreignisse = [EV];
  t.b.erstattetCent = 500;
  const a = await los(t, ok(t));
  assert.equal(a.status, 200);
  assert.equal(a.body.ok, true);
  assert.equal(a.body.bereits_erstattet, true);
  assert.equal(a.body.erstattet_cent, 500);
  assert.equal(t.paypal.erstattungen.length, 0);
});

test("Erstattung: Betragsgrenzen (0, negativ, Komma, zu gross, ueber Rest)", async () => {
  const t = await bezahlt();
  for (const betrag of [0, -5, 1.5, "500", null, 200001]) {
    const a = await los(t, ok(t, { betrag_cent: betrag }));
    assert.equal(a.status, 422, String(betrag));
  }
  const rest = t.b.gesamt_cent;
  const zuviel = await los(t, ok(t, { betrag_cent: rest + 1 }));
  assert.equal(zuviel.status, 409);
  assert.equal(zuviel.body.grund, "betrag_zu_hoch");
  assert.equal(zuviel.body.noch_erstattbar_cent, rest);
  t.b.erstattetCent = rest - 100;
  assert.equal((await los(t, ok(t, { betrag_cent: 101 }))).status, 409);
  assert.equal((await los(t, ok(t, { betrag_cent: 100 }))).status, 200, "genau der Rest geht");
  assert.equal(t.paypal.erstattungen.length, 1);
});

test("Erstattung: Eingaben streng (unbekanntes Feld, schlechte UUID, Grund zu kurz/lang)", async () => {
  const t = await bezahlt();
  assert.equal((await los(t, ok(t, { extra: 1 }))).status, 400);
  assert.equal((await los(t, ok(t, { id: "abc" }))).status, 400);
  assert.equal((await los(t, ok(t, { ereignis_id: "abc" }))).status, 400);
  assert.equal((await los(t, ok(t, { grund: "ab" }))).status, 422);
  assert.equal((await los(t, ok(t, { grund: "x".repeat(201) }))).status, 422);
  assert.equal((await los(t, null)).status, 400);
  assert.equal(t.paypal.erstattungen.length, 0);
});

test("Erstattung: nicht bezahlt, ohne Capture, anonymisiert, unbekannt = 409/404 und kein PayPal-Aufruf", async () => {
  const t = await bezahlt();
  t.b.zahlungsstatus = "offen";
  assert.equal((await los(t, ok(t))).status, 409);
  t.b.zahlungsstatus = "bezahlt";
  t.b.paypal_capture_id = null;
  assert.equal((await los(t, ok(t))).body.grund, "keine_capture");
  t.b.paypal_capture_id = "CAP-X12345";
  t.b.anonymisiert = true;
  assert.equal((await los(t, ok(t))).body.grund, "anonymisiert");
  const u = await los(t, ok(t, { id: "99999999-2222-4333-8444-555555555555" }));
  assert.equal(u.status, 404);
  assert.equal(t.paypal.erstattungen.length, 0);
});

test("Erstattung: PayPal-Fehler = 502 mit kurzem issue, nichts Internes", async () => {
  const t = await bezahlt();
  t.paypal.erstattungFehler = new PayPalFehler("erstattung", 422, "INSTRUMENT_DECLINED");
  const a = await los(t, ok(t));
  assert.equal(a.status, 502);
  assert.equal(a.body.code, "paypal_fehler");
  assert.equal(a.body.issue, "INSTRUMENT_DECLINED");
  assert.ok(!JSON.stringify(a.body).includes("erstattung"), "keine Stufen-/Interna-Namen");
  t.paypal.erstattungFehler = new PayPalFehler("erstattung", 500);
  const b = await los(t, ok(t));
  assert.equal(b.status, 502);
  assert.equal(b.body.issue, undefined);
  t.paypal.erstattungFehler = null;
  t.paypal.erstattungStatus = "FAILED";
  assert.equal((await los(t, ok(t))).status, 502);
});

test("Erstattung: PayPal meldet schon voll erstattet = 409, nicht 502", async () => {
  const t = await bezahlt();
  t.paypal.erstattungFehler = new PayPalFehler("erstattung", 422, "CAPTURE_FULLY_REFUNDED");
  const a = await los(t, ok(t));
  assert.equal(a.status, 409);
  assert.equal(a.body.grund, "paypal_schon_erstattet");
});

test("Erstattung: zweite Teilerstattung mit neuer ereignis_id bekommt neue Request-Id", async () => {
  const t = await bezahlt();
  await los(t, ok(t));
  t.b.erstattetCent = 500;
  t.b.angewendeteEreignisse = [EV];
  await los(t, ok(t, { ereignis_id: EV2, betrag_cent: 300 }));
  assert.equal(t.paypal.erstattungen.length, 2);
  assert.notEqual(t.paypal.erstattungen[0].requestId, t.paypal.erstattungen[1].requestId);
});

test("Erstattung: DB nicht erreichbar / Migration 16 fehlt = 503, nichts erstattet", async () => {
  const t = await bezahlt();
  const kaputt = { ...t.deps, db: { rpc: async () => { throw new Error("netz"); } } };
  const a = await erstatteBestellung(kaputt as never, ok(t));
  assert.equal(a.status, 503);
  assert.equal(t.paypal.erstattungen.length, 0);
});
