import { test } from "node:test";
import assert from "node:assert/strict";
import { freigabeFehler, holeFreigabeDaten, sendeFreigabe } from "../../lib/shop/client";

const antwort = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
const P = { b: "00000000-0000-4000-8000-000000000001", t: "tok" };

test("Fehlerabbildung nach Status und Code", () => {
  assert.equal(freigabeFehler(403, { code: "link_ungueltig" }).code, "ungueltig");
  assert.equal(freigabeFehler(403, { code: "link_abgelaufen" }).meldung, "Link ungültig oder abgelaufen.");
  const b = freigabeFehler(409, { code: "bereits_entschieden", status: "abgelehnt" });
  assert.equal(b.code, "bereits_entschieden");
  assert.equal(b.status, "abgelehnt");
  assert.equal(freigabeFehler(409, { code: "nicht_moeglich" }).code, "nicht_moeglich");
  assert.equal(freigabeFehler(429, {}).code, "zu_oft");
  assert.equal(freigabeFehler(503, {}).code, "nicht_erreichbar");
  assert.equal(freigabeFehler(500, { error: "Kaputt" }).meldung, "Kaputt");
});

test("GET: Erfolg, Fehler, Netz, kaputte Antwort", async () => {
  let url = "";
  const f = (async (u: string) => { url = u; return new Response(JSON.stringify({ ok: true, aktion: "nein", bestellnummer: "PD-2026-0001", status: "offen", positionen: [], gruende: [{ id: "marke", label: "Marke" }] }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await holeFreigabeDaten({ b: P.b, t: "a&b" }, f);
  assert.equal(r.ok && r.daten.aktion, "nein");
  assert.match(url, /t=a%26b/);
  const e = await holeFreigabeDaten(P, antwort(403, { ok: false, code: "link_ungueltig", error: "x" }));
  assert.equal(!e.ok && e.fehler.code, "ungueltig");
  const n = await holeFreigabeDaten(P, (async () => { throw new Error("x"); }) as typeof fetch);
  assert.equal(!n.ok && n.fehler.code, "netz");
  const k = await holeFreigabeDaten(P, antwort(200, { ok: true }));
  assert.equal(!k.ok && k.fehler.code, "fehler");
});

test("POST: Freigabe, Ablehnung mit Grund, Fehler", async () => {
  let body = "";
  const f = (async (_u: string, i: RequestInit) => { body = String(i.body); return new Response(JSON.stringify({ ok: true, status: "abgelehnt", neu: true, erstattung: "erstattung_offen", mail: false }), { status: 200 }); }) as unknown as typeof fetch;
  const a = await sendeFreigabe({ ...P, aktion: "nein", grund: "marke" }, f);
  assert.deepEqual(a.ok && a.daten, { status: "abgelehnt", neu: true, mail: false, erstattung: "erstattung_offen" });
  assert.deepEqual(JSON.parse(body), { b: P.b, t: "tok", aktion: "nein", grund: "marke" });
  const o = await sendeFreigabe({ ...P, aktion: "ok", grund: "ignoriert" }, antwort(200, { ok: true, status: "freigegeben", neu: true, mail: true }));
  assert.deepEqual(o.ok && o.daten, { status: "freigegeben", neu: true, mail: true });
  const c = await sendeFreigabe({ ...P, aktion: "ok" }, antwort(409, { ok: false, code: "bereits_entschieden", status: "freigegeben" }));
  assert.equal(!c.ok && c.fehler.status, "freigegeben");
  const z = await sendeFreigabe({ ...P, aktion: "ok" }, antwort(429, { ok: false, code: "zu_oft" }));
  assert.equal(!z.ok && z.fehler.code, "zu_oft");
  const n = await sendeFreigabe({ ...P, aktion: "ok" }, (async () => { throw new Error("x"); }) as typeof fetch);
  assert.equal(!n.ok && n.fehler.code, "netz");
});
