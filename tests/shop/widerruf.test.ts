import { test } from "node:test";
import assert from "node:assert/strict";
import { verarbeiteWiderruf } from "@/lib/shop/server/widerruf";
import { pruefeWiderruf } from "@/lib/shop/server/validierung";
import { ablehnungsMail, bestaetigungsMail, PFLICHTANGABEN_PLATZHALTER, widerrufEingangsMail, type MailBestellung } from "@/lib/shop/server/vorlagen";
import { FakeDb, FakeNotifier, testEnv, KUNDE } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef" };
const eingabe = (extra: Record<string, unknown> = {}) => ({
  name: "Erika Beispiel", vertrag: "PD-2026-0001", email: "Erika@Example.org", ...extra,
});

function aufbau() {
  const db = new FakeDb();
  const notifier = new FakeNotifier();
  return { db, notifier, deps: { db, notifier, env: testEnv() } };
}

test("Widerruf ohne confirm: nur Zusammenfassung, nichts gespeichert, nichts gesendet", async () => {
  const { db, notifier, deps } = aufbau();
  const a = await verarbeiteWiderruf(deps, eingabe(), ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.schritt, "pruefen");
  assert.equal((a.body.zusammenfassung as { ganzerVertrag: boolean }).ganzerVertrag, true);
  assert.equal(db.widerrufe.length, 0);
  assert.equal(notifier.kundenMails.length + notifier.telegrams.length, 0);
});

test("Widerruf mit confirm: gespeichert, Eingangsbestätigung mit Inhalt + Datum/Uhrzeit, Alex nur mit Nummer", async () => {
  const { db, notifier, deps } = aufbau();
  const a = await verarbeiteWiderruf(deps, eingabe({ confirm: true, positionen: ["1 x Koffein-Pegel"] }), ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.widerrufsnummer, "WR-2026-0001");
  assert.equal(a.body.eingangsbestaetigung, true);
  assert.equal(db.widerrufe.length, 1);
  assert.equal(db.widerrufe[0].args.p_email, "erika@example.org");
  assert.equal(db.widerrufe[0].args.p_bestellnummer, "PD-2026-0001");
  const m = notifier.kundenMails[0];
  assert.equal(m.an, "erika@example.org");
  assert.match(m.text, /Eingegangen am: 08\.10\.2026, 14:03:21 Uhr/);
  assert.match(m.text, /Erika Beispiel/);
  assert.match(m.text, /PD-2026-0001/);
  assert.match(m.text, /1 x Koffein-Pegel/);
  assert.match(m.text, /erika@example\.org/);
  const alex = notifier.telegrams.join() + notifier.alexMails.map((x) => x.betreff + x.text).join();
  assert.ok(!alex.includes("Erika") && !alex.includes("erika@"));
  assert.ok(db.widerrufe[0].bestaetigt && db.widerrufe[0].benachrichtigt);
});

test("Antwort verrät nicht, ob die Bestellnummer existiert (gleiche Form, kein Abgleich)", async () => {
  const { db, deps } = aufbau();
  db.bestellungen.push({
    id: "b1", nummer: "PD-2026-0001", key: "k", gesamt_cent: 1000, status: "bezahlt", zahlungsstatus: "bezahlt",
    paypal_order_id: null, paypal_capture_id: null, benachrichtigt: true, bestaetigt: true, hash: "h", kunde: { ...KUNDE }, positionen: [],
  });
  const gefunden = await verarbeiteWiderruf(deps, eingabe({ confirm: true, email: KUNDE.email, name: KUNDE.name }), ctx);
  const unbekannt = await verarbeiteWiderruf(deps, eingabe({ confirm: true, vertrag: "PD-2026-9999", email: "x@example.org" }), ctx);
  assert.deepEqual(Object.keys(gefunden.body).sort(), Object.keys(unbekannt.body).sort());
  assert.equal(JSON.stringify(gefunden.body).includes("abgleich"), false);
  assert.equal(db.widerrufe[0].abgleich, "passt");
  assert.equal(db.widerrufe[1].abgleich, "nicht_gefunden");
});

test("Doppelklick: zweite Anfrage legt nichts neu an und sendet keine zweite Mail", async () => {
  const { db, notifier, deps } = aufbau();
  await verarbeiteWiderruf(deps, eingabe({ confirm: true }), ctx);
  const b = await verarbeiteWiderruf(deps, eingabe({ confirm: true }), ctx);
  assert.equal(b.status, 200);
  assert.equal(db.widerrufe.length, 1);
  assert.equal(notifier.kundenMails.length, 1);
  assert.equal(notifier.telegrams.length, 1);
});

test("Mailversand scheitert: Widerruf bleibt gespeichert, Antwort meldet es, Alex wird gewarnt", async () => {
  const { db, notifier, deps } = aufbau();
  notifier.mailKunde = async () => false;
  const a = await verarbeiteWiderruf(deps, eingabe({ confirm: true }), ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.eingangsbestaetigung, false);
  assert.equal(db.widerrufe.length, 1);
  assert.match(notifier.telegrams[0], /FEHLGESCHLAGEN/);
  assert.match(notifier.alexMails[0].text, /NICHT versendet/);
});

test("Ungültige Eingaben, Rate-Limit und DB-Ausfall", async () => {
  const { db, deps } = aufbau();
  const u = await verarbeiteWiderruf(deps, eingabe({ confirm: true, email: "kaputt", name: "" }), ctx);
  assert.equal(u.status, 422);
  assert.ok((u.body.felder as Record<string, string>).email && (u.body.felder as Record<string, string>).name);
  db.widerrufGrund = "zu_viele";
  assert.equal((await verarbeiteWiderruf(deps, eingabe({ confirm: true }), ctx)).status, 429);
  db.widerrufGrund = null;
  db.rpc = async () => { throw new Error("db weg"); };
  const x = await verarbeiteWiderruf(deps, eingabe({ confirm: true }), ctx);
  assert.equal(x.status, 503);
  assert.match(String(x.body.error), /as@sitekx\.de/);
});

test("pruefeWiderruf: Positionen als Liste/Text, Bestellnummer wird erkannt, Steuerzeichen abgelehnt", () => {
  const r = pruefeWiderruf({ name: "Ab", vertrag: "Bestellung pd-2026-0042 vom Montag", email: "a@b.de", positionen: ["A", "B"] });
  assert.ok(r.ok && r.wert.bestellnummer === "PD-2026-0042" && r.wert.positionen === "A\nB");
  assert.ok(pruefeWiderruf({ name: "Ab", vertrag: "Kaufvertrag vom 1.10.", email: "a@b.de" }).ok);
  assert.equal(pruefeWiderruf({ name: "Ab\nCc", vertrag: "PD-2026-0001", email: "a@b.de" }).ok, false);
});

test("Route Widerruf: Honeypot gefüllt -> 400, kein Token -> 400, falscher Inhalt, kein DB-Zugriff", async () => {
  const route = await import("@/app/api/shop/widerruf/route");
  const env = ["SHOP_SUPABASE_URL", "SHOP_SUPABASE_ANON_KEY", "SHOP_API_SECRET", "SHOP_IP_SALT", "SHOP_AKTIV"];
  const alt = Object.fromEntries(env.map((n) => [n, process.env[n]]));
  const altFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = (async () => { fetches++; throw new Error("verboten"); }) as typeof fetch;
  Object.assign(process.env, { SHOP_SUPABASE_URL: "https://x.example", SHOP_SUPABASE_ANON_KEY: "a", SHOP_API_SECRET: "s".repeat(40), SHOP_IP_SALT: "salz-salz-salz", SHOP_AKTIV: "false" });
  try {
    const post = (b: unknown) => route.POST(new Request("https://t.example/api/shop/widerruf", { method: "POST", body: JSON.stringify(b) }));
    assert.equal((await post({ ...eingabe(), website: "http://spam" })).status, 400);
    assert.equal((await post({ ...eingabe(), token: "kaputt" })).status, 400);
    assert.equal(fetches, 0);
  } finally {
    globalThis.fetch = altFetch;
    for (const n of env) { if (alt[n] === undefined) delete process.env[n]; else process.env[n] = alt[n]; }
  }
});

const bestellung: MailBestellung = {
  nummer: "PD-2026-0001", name: "Erika", strasse: "Teststr. 1", plz: "86663", ort: "Asbach",
  gesamt_cent: 1780, summe_waren_cent: 1290, versand_cent: 490, individuell: false,
  positionen: [{ name: "Koffein-Pegel", menge: 1, einzelpreis_cent: 1290 }],
  erstellt_am: "2026-10-08T10:00:00Z", bezahlt_am: "2026-10-08T10:05:00Z", capture_id: "CAP-123456",
};

test("Bestellbestätigung: Annahme, Vertragsschluss, Übersicht, Transaktion, Kontakt, Widerrufslink", () => {
  const { betreff, text } = bestaetigungsMail(bestellung, undefined, false, { siteUrl: "https://pixldrop.de/", lieferzeit: "5 bis 7 Werktage" });
  assert.match(betreff, /^Bestellbestätigung PD-2026-0001/);
  assert.match(text, /nehme deine Bestellung hiermit an/);
  assert.match(text, /Kaufvertrag zustande gekommen/);
  assert.match(text, /vom 08\.10\.2026/);
  assert.match(text, /Transaktion CAP-123456/);
  assert.match(text, /Gesamtpreis: 17,80/);
  assert.match(text, /Lieferzeit: 5 bis 7 Werktage ab heute/);
  assert.match(text, /as@sitekx\.de/);
  assert.match(text, /https:\/\/pixldrop\.de\/3d-druck\/widerruf/);
});

test("Platzhalter-Guard: Platzhalter-Block blockiert freigegebene Mail, Echttext (Lieferzeit aus config) geht durch", () => {
  assert.throws(() => bestaetigungsMail(bestellung, PFLICHTANGABEN_PLATZHALTER, true));
  assert.doesNotThrow(() => bestaetigungsMail(bestellung, "Echter Rechtstext", true));
  assert.doesNotThrow(() => bestaetigungsMail(bestellung, undefined, true, { siteUrl: "https://pixldrop.de" }));
});

test("Rechtsblock: Belehrung und Formular fuer Standard, nur Hinweis bei individuell", () => {
  const std = bestaetigungsMail(bestellung, undefined, false, { siteUrl: "https://pixldrop.de/" }).text;
  assert.match(std, /Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter/);
  assert.match(std, /MUSTER-WIDERRUFSFORMULAR/);
  assert.match(std, /https:\/\/pixldrop\.de\/3d-druck\/agb/);
  const ind = bestaetigungsMail({ ...bestellung, individuell: true }, undefined, false, { siteUrl: "https://pixldrop.de" }).text;
  assert.match(ind, /kein Widerrufsrecht.*§ 312g Abs\. 2 Nr\. 1 BGB/);
  assert.ok(!ind.includes("MUSTER-WIDERRUFSFORMULAR"));
});

test("Ablehnungs- und Widerrufsmail: Inhalt", () => {
  const a = ablehnungsMail({ nummer: "PD-2026-0001", name: "Erika", gesamt_cent: 1780 }, "Farbe vergriffen");
  assert.match(a.text, /kein Kaufvertrag|Kaufvertrag ist dadurch nicht zustande gekommen/);
  assert.match(a.text, /17,80/);
  assert.match(a.text, /erstatte ich dir unverzüglich über PayPal/);
  const w = widerrufEingangsMail({ nummer: "WR-2026-0001", name: "E", vertragAngabe: "V", positionen: null, email: "e@x.de", eingegangenAm: "2026-01-15T11:00:00Z" });
  assert.match(w.text, /12:00:00 Uhr/);
  assert.match(w.text, /der gesamte Vertrag/);
});
