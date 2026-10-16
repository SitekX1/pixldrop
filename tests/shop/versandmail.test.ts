import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb } from "@/lib/shop/server/bestellung";
import { adminSecretOk, normalisiereSendungsnummer, sendeVersandmail, trackingLink, versandMail } from "@/lib/shop/server/versandmail";
import { bestellEingabe, kontext, neueDeps } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };

async function bezahlt(versandart?: string) {
  const t = neueDeps();
  const a = await legeBestellungAn(t.deps, bestellEingabe(versandart ? { versandart } : {}), ctx);
  assert.equal(a.status, 200);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  const b = t.db.bestellungen[0];
  t.notifier.kundenMails.length = 0; // Bestellbestaetigung ausblenden
  return { ...t, b, id: b.id };
}
const los = (t: { deps: { db: unknown; env: unknown; notifier: unknown } }, body: unknown) => sendeVersandmail(t.deps as never, body);

test("Admin-Secret: konstante Zeit, zu kurz/fehlend/falsch = abgelehnt", () => {
  const s = "x".repeat(32);
  assert.equal(adminSecretOk(s, s), true);
  assert.equal(adminSecretOk(s, s + "y"), false);
  assert.equal(adminSecretOk(s, null), false);
  assert.equal(adminSecretOk(undefined, "irgendwas"), false);
  assert.equal(adminSecretOk("kurz", "kurz"), false, "unter 32 Zeichen ist die Route gesperrt");
});

test("Sendungsnummer: normalisiert, nur Buchstaben/Ziffern, Laenge 6-40", () => {
  assert.deepEqual(normalisiereSendungsnummer("0034 1234-5678 90"), { ok: true, nr: "00341234567890" });
  assert.deepEqual(normalisiereSendungsnummer("  "), { ok: true, nr: null });
  assert.deepEqual(normalisiereSendungsnummer(null), { ok: true, nr: null });
  assert.deepEqual(normalisiereSendungsnummer("jjd0001"), { ok: true, nr: "JJD0001" });
  for (const x of ["123", "abc/def123", "a".repeat(41), "12345678?x=1", 5, "ä12345678"]) assert.equal(normalisiereSendungsnummer(x).ok, false, String(x));
});

test("Tracking-Link: DHL und Hermes mit Nummer, Brief/ohne Nummer keiner", () => {
  assert.equal(trackingLink("dhl", "00341234567890"), "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=00341234567890");
  assert.equal(trackingLink("hermes", "12345678901234"), "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#12345678901234");
  assert.equal(trackingLink("brief", "12345678901234"), null);
  assert.equal(trackingLink("dhl", null), null);
  // Versandart nicht festgelegt (Bestellung aus Angebot): Anbieter am Nummernformat erkennen
  assert.match(trackingLink("paket", "JD014600003SD") ?? "", /dhl\.de.*JD014600003SD/);
  assert.match(trackingLink(null, "003404567890123456") ?? "x", /^x$/);
  assert.match(trackingLink("paket", "12345678901234") ?? "", /myhermes\.de/);
  assert.equal(trackingLink("paket", "ABC123XYZ"), null);
  assert.equal(trackingLink("brief", "JD014600003SD"), null);
  assert.equal(trackingLink("dhl", "a b&c=1"), null);
});

test("Mail: Hermes mit Nummer + Link in Text und HTML; Brief ohne Nummer; Name wird escaped", () => {
  const b = { nummer: "PD-2026-0042", name: "Erika <b>M</b>", strasse: "Weg 1", plz: "86663", ort: "Asbach-Bäumenheim", versandart: "hermes", sendungsnummer: "12345678901234" };
  const m = versandMail(b, "https://pixldrop.de");
  assert.equal(m.betreff, "Deine Bestellung PD-2026-0042 ist unterwegs");
  assert.match(m.text, /Sendungsnummer: 12345678901234/);
  assert.match(m.text, /Sendung verfolgen: https:\/\/www\.myhermes\.de\/.*#12345678901234/);
  assert.match(m.text, /as@sitekx\.de/);
  assert.match(m.html, /href="https:\/\/www\.myhermes\.de\//);
  assert.ok(!m.html.includes("<b>M</b>") && m.html.includes("&lt;b&gt;"));
  const brief = versandMail({ ...b, versandart: "brief", sendungsnummer: null }, "https://pixldrop.de");
  assert.ok(!/Sendungsnummer:|verfolgen:/.test(brief.text));
  assert.match(brief.text, /keine Sendungsverfolgung/);
  const ohne = versandMail({ ...b, versandart: "dhl", sendungsnummer: null }, "https://pixldrop.de");
  assert.ok(!/Sendungsnummer:/.test(ohne.text) && !ohne.html.includes("href=\"https://www.dhl"));
});

test("Versendet: Status 'versendet', Nummer gespeichert, genau eine Mail an die Kundenadresse, Wiederholung sendet nicht nochmal", async () => {
  const t = await bezahlt("dhl");
  const r = await los(t, { id: t.id, sendungsnummer: "0034 1234 5678 90" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, status: "versendet", mail: "gesendet" });
  assert.equal(t.b.status, "versendet");
  assert.equal(t.b.sendungsnummer, "00341234567890");
  assert.equal(t.notifier.kundenMails.length, 1);
  const m = t.notifier.kundenMails[0];
  assert.equal(m.an, "erika@example.org");
  assert.match(m.text, /piececode=00341234567890/);
  assert.ok(m.html && m.html.includes("piececode=00341234567890"));
  const r2 = await los(t, { id: t.id, sendungsnummer: "00341234567890" });
  assert.equal((r2.body as { mail: string }).mail, "schon");
  assert.equal(t.notifier.kundenMails.length, 1);
});

test("Parallel: zwei gleichzeitige Klicks -> genau eine Mail", async () => {
  const t = await bezahlt("hermes");
  const [a, b] = await Promise.all([los(t, { id: t.id }), los(t, { id: t.id })]);
  assert.equal(t.notifier.kundenMails.length, 1);
  assert.deepEqual([a, b].map((x) => (x.body as { mail: string }).mail).sort(), ["gesendet", "schon"]);
});

test("Mailfehler: Status steht trotzdem, mail 'fehler'; erneuter Versuch sendet; 'erneut' sendet bewusst nochmal", async () => {
  const t = await bezahlt("hermes");
  t.notifier.kundenMailOk = false;
  const r = await los(t, { id: t.id, sendungsnummer: "12345678901234" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, status: "versendet", mail: "fehler" });
  assert.equal(t.b.status, "versendet");
  assert.equal(t.b.versandmail, false, "Claim zurueckgenommen");
  t.notifier.kundenMailOk = true;
  const r2 = await los(t, { id: t.id });
  assert.equal((r2.body as { mail: string }).mail, "gesendet");
  assert.equal(t.notifier.kundenMails.length, 1);
  assert.equal(((await los(t, { id: t.id })).body as { mail: string }).mail, "schon");
  const r3 = await los(t, { id: t.id, erneut: true, sendungsnummer: "99999999999999" });
  assert.equal((r3.body as { mail: string }).mail, "gesendet");
  assert.equal(t.notifier.kundenMails.length, 2);
  assert.match(t.notifier.kundenMails[1].text, /99999999999999/);
});

test("Nicht moeglich: unbezahlt, storniert, Freigabe offen, erstattet, unbekannt, ungueltige Eingaben -> keine Mail, kein Statuswechsel", async () => {
  const t = neueDeps();
  await legeBestellungAn(t.deps, bestellEingabe(), ctx);
  const b = t.db.bestellungen[0];
  const u = await los(t, { id: b.id });
  assert.equal(u.status, 409);
  assert.equal(u.body.grund, "nicht_bezahlt");
  assert.equal(b.status, "neu");
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  t.notifier.kundenMails.length = 0;
  b.freigabe = "offen";
  assert.equal((await los(t, { id: b.id })).body.grund, "freigabe_offen");
  b.freigabe = null; b.erstattetCent = b.gesamt_cent;
  assert.equal((await los(t, { id: b.id })).body.grund, "erstattet");
  b.erstattetCent = 0; b.status = "storniert";
  assert.equal((await los(t, { id: b.id })).body.grund, "storniert");
  assert.equal(t.notifier.kundenMails.length, 0);
  assert.equal((await los(t, { id: "00000000-0000-4000-8000-0000000000ff" })).status, 404);
  for (const body of [null, [], {}, { id: "x" }, { id: b.id, extra: 1 }, { id: b.id, erneut: "ja" }]) assert.equal((await los(t, body)).status, 400, JSON.stringify(body));
  const ung = await los(t, { id: b.id, sendungsnummer: "ab/../" });
  assert.equal(ung.status, 422);
  assert.equal(ung.body.code, "sendungsnummer_ungueltig");
});

test("DB nicht erreichbar / Migration fehlt -> 503 db, keine Mail", async () => {
  const t = await bezahlt("hermes");
  t.db.rpc = (async () => { throw new Error("x"); }) as never;
  const r = await los(t, { id: t.id });
  assert.ok(r.status === 500 || r.status === 503);
  assert.equal(t.notifier.kundenMails.length, 0);
});
