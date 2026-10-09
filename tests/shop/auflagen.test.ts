import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb, verarbeiteWebhook } from "@/lib/shop/server/bestellung";
import { fuehreBereinigungAus } from "@/lib/shop/server/bereinigung";
import { bestaetigungsMail, enthaeltStandardware, PFLICHTANGABEN_PLATZHALTER, type MailBestellung } from "@/lib/shop/server/vorlagen";
import { AGB_TEXT } from "@/lib/shop/server/agb-text";
import { PayPalFehler } from "@/lib/shop/server/paypal";
import { pruefeKunde } from "@/lib/shop/server/validierung";
import { FakeDb, bestellEingabe, kontext, neueDeps, KUNDE } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };
const ctxZweiFarben = {
  ipHash: ctx.ipHash,
  kontext: kontext({ farben: [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }, { id: "weiss", name: "Weiß", hex: "#f4f1ea" }] }),
};
const wh = (extra: Record<string, unknown>, wert = "30.70") =>
  JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAP-W1", status: "COMPLETED", amount: { value: wert, currency_code: "EUR" }, ...extra } });

// ---------------------------------------------------------------- Routen
const ENV_NAMEN = ["SHOP_AKTIV", "CRON_SECRET", "SHOP_SUPABASE_URL", "SHOP_SUPABASE_ANON_KEY", "SHOP_API_SECRET", "SHOP_IP_SALT", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"];

async function mitEnv<T>(werte: Record<string, string>, fn: () => Promise<T>): Promise<{ ergebnis: T; fetchAufrufe: number }> {
  const alt = Object.fromEntries(ENV_NAMEN.map((n) => [n, process.env[n]]));
  const altFetch = globalThis.fetch;
  let aufrufe = 0;
  for (const n of ENV_NAMEN) delete process.env[n];
  Object.assign(process.env, werte);
  globalThis.fetch = (async () => { aufrufe++; throw new Error("Netzwerk im Test verboten"); }) as typeof fetch;
  try {
    return { ergebnis: await fn(), fetchAufrufe: aufrufe };
  } finally {
    globalThis.fetch = altFetch;
    for (const n of ENV_NAMEN) { if (alt[n] === undefined) delete process.env[n]; else process.env[n] = alt[n]; }
  }
}

test("Route Bestellung/Anfrage/Formtoken mit SHOP_AKTIV=false: 503, nichts gespeichert, nichts gesendet", async () => {
  const bestellung = await import("@/app/api/shop/bestellung/route");
  const anfrage = await import("@/app/api/shop/anfrage/route");
  const formtoken = await import("@/app/api/shop/formtoken/route");
  const { ergebnis, fetchAufrufe } = await mitEnv({ SHOP_AKTIV: "false" }, async () => {
    const a = await bestellung.POST(new Request("https://t.example/api/shop/bestellung", { method: "POST", body: JSON.stringify(bestellEingabe()) }));
    const b = await anfrage.POST(new Request("https://t.example/api/shop/anfrage", { method: "POST", body: new FormData() }));
    const c = await formtoken.GET(new Request("https://t.example/api/shop/formtoken"));
    return [a.status, b.status, c.status];
  });
  assert.deepEqual(ergebnis, [503, 503, 503]);
  assert.equal(fetchAufrufe, 0);
});

test("Route Cron: ohne/mit falschem Header 401, ohne CRON_SECRET ebenfalls", async () => {
  const cron = await import("@/app/api/shop/cron/bereinigung/route");
  const url = "https://t.example/api/shop/cron/bereinigung";
  const r1 = await mitEnv({ CRON_SECRET: "geheim-geheim-geheim" }, async () => (await cron.GET(new Request(url))).status);
  const r2 = await mitEnv({ CRON_SECRET: "geheim-geheim-geheim" }, async () =>
    (await cron.GET(new Request(url, { headers: { authorization: "Bearer falsch" } }))).status);
  const r3 = await mitEnv({}, async () => (await cron.GET(new Request(url, { headers: { authorization: "Bearer " } }))).status);
  assert.deepEqual([r1.ergebnis, r2.ergebnis, r3.ergebnis], [401, 401, 401]);
  assert.equal(r1.fetchAufrufe + r2.fetchAufrufe + r3.fetchAufrufe, 0);
});

test("Route Cron mit richtigem Header, aber DB-Fehler: 500", async () => {
  const cron = await import("@/app/api/shop/cron/bereinigung/route");
  const { ergebnis } = await mitEnv(
    { CRON_SECRET: "geheim-geheim-geheim", SHOP_SUPABASE_URL: "https://db.example", SHOP_SUPABASE_ANON_KEY: "anon", SHOP_API_SECRET: "s".repeat(40), SHOP_IP_SALT: "salz" },
    async () => (await cron.GET(new Request("https://t.example/c", { headers: { authorization: "Bearer geheim-geheim-geheim" } }))).status,
  );
  assert.equal(ergebnis, 500);
});

test("Bereinigung: ok:false von Liste oder DB -> Fehler (Cron antwortet 500)", async () => {
  const db = new FakeDb();
  const orig = db.rpc.bind(db);
  db.rpc = (async (n: string, a: Record<string, unknown>) => (n === "shop_bereinige_bilder_liste" ? { ok: false } : orig(n, a))) as typeof db.rpc;
  await assert.rejects(() => fuehreBereinigungAus(db));
  const db2 = new FakeDb();
  const orig2 = db2.rpc.bind(db2);
  db2.rpc = (async (n: string, a: Record<string, unknown>) => (n === "shop_bereinigen_extern" ? { ok: false } : orig2(n, a))) as typeof db2.rpc;
  await assert.rejects(() => fuehreBereinigungAus(db2));
});

// ---------------------------------------------------------------- Idempotenz
test("Parallele Requests mit gleichem Key: eine Bestellung, gleiche Nummer", async () => {
  const { db, deps } = neueDeps();
  const [a, b] = await Promise.all([legeBestellungAn(deps, bestellEingabe(), ctx), legeBestellungAn(deps, bestellEingabe(), ctx)]);
  assert.equal(db.bestellungen.length, 1);
  assert.equal(a.body.bestellnummer, b.body.bestellnummer);
});

test("Gleicher Key, anderer Warenkorb mit GLEICHER Summe oder anderen Kundendaten: key_konflikt", async () => {
  const { db, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctxZweiFarben);
  const andereFarbe = await legeBestellungAn(deps, bestellEingabe({ positionen: [{ slug: "koffein-pegel", menge: 2, farbeId: "weiss" }] }), ctxZweiFarben);
  assert.equal(andereFarbe.status, 409);
  const andereAdresse = await legeBestellungAn(deps, bestellEingabe({ kunde: { ...KUNDE, strasse: "Andere Str. 9" } }), ctxZweiFarben);
  assert.equal(andereAdresse.status, 409);
  assert.equal(db.bestellungen.length, 1);
});

test("PayPal-Order wird nur ersetzt, wenn PayPal sie als VOIDED/404 bestaetigt", async () => {
  const { db, paypal, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  // PayPal nicht erreichbar -> nicht ersetzen
  paypal.holeOrder = async () => { throw new PayPalFehler("order_holen_netz"); };
  const netz = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(netz.status, 502);
  assert.equal(db.bestellungen[0].paypal_order_id, "ORDER1TEST");
  // Order bereits abgeschlossen -> nicht ersetzen
  paypal.holeOrder = async (id: string) => ({ id, status: "COMPLETED", capture: null, links: [] });
  assert.equal((await legeBestellungAn(deps, bestellEingabe(), ctx)).status, 409);
  assert.equal(db.bestellungen[0].paypal_order_id, "ORDER1TEST");
  // VOIDED -> ersetzen
  paypal.holeOrder = async (id: string) => ({ id, status: "VOIDED", capture: null, links: [] });
  const neu = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(neu.status, 200);
  assert.equal(db.bestellungen[0].paypal_order_id, "ORDER2TEST");
});

// ---------------------------------------------------------------- Zahlung
test("Webhook-Fallback ueber custom_id (ohne supplementary_data)", async () => {
  const { db, notifier, deps } = neueDeps();
  const a = await legeBestellungAn(deps, bestellEingabe(), ctx);
  const w = await verarbeiteWebhook(deps, new Headers(), wh({ custom_id: a.body.bestellnummer }));
  assert.equal(w.status, 200);
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.equal(notifier.telegrams.length, 1);
});

test("Zahlung nach Storno wird nicht als bezahlt gebucht, Alex wird gewarnt", async () => {
  const { db, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  db.bestellungen[0].status = "storniert";
  const w = await verarbeiteWebhook(deps, new Headers(), wh({ supplementary_data: { related_ids: { order_id: "ORDER1TEST" } } }));
  assert.equal(w.status, 200);
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  assert.match(notifier.telegrams[0], /Zahlung prüfen: PD-2026-0001 \(storniert\)/);
  assert.equal((await schliesseZahlungAb(deps, "ORDER1TEST")).ziel, "pruefen");
});

test("PENDING bei Capture, spaeter Webhook COMPLETED: erst ausstehend ohne Meldung, dann bezahlt mit genau einer Meldung", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureStatus = "PENDING";
  assert.equal((await schliesseZahlungAb(deps, "ORDER1TEST")).ziel, "danke");
  assert.equal(db.bestellungen[0].zahlungsstatus, "ausstehend");
  assert.equal(notifier.telegrams.length, 0);
  const w = await verarbeiteWebhook(deps, new Headers(), wh({ id: "CAP-ORDER1TEST", supplementary_data: { related_ids: { order_id: "ORDER1TEST" } } }));
  assert.equal(w.status, 200);
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.equal(notifier.telegrams.length, 1);
});

test("Benachrichtigungsausfall nach Buchen: Zahlung bleibt gebucht, spaetere Rueckkehr holt die Meldung nach (Webhook-Pfad mit echten Flags)", async () => {
  const { db, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  notifier.telegramOk = false;
  notifier.alexMailOk = false;
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "danke");
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.equal(db.bestellungen[0].benachrichtigt, false);
  assert.ok(db.ereignisse.some((e) => e.art === "benachrichtigung"));
  notifier.telegramOk = true;
  notifier.alexMailOk = true;
  // Webhook trifft ein: bereits gebucht -> Nachholen anhand der echten Flags
  const w = await verarbeiteWebhook(deps, new Headers(), wh({ id: "CAP-ORDER1TEST", supplementary_data: { related_ids: { order_id: "ORDER1TEST" } } }));
  assert.equal(w.status, 200);
  assert.equal(notifier.telegrams.length, 1);
  assert.equal(db.bestellungen[0].benachrichtigt, true);
  // weiterer Webhook: nichts doppelt
  await verarbeiteWebhook(deps, new Headers(), wh({ id: "CAP-ORDER1TEST", supplementary_data: { related_ids: { order_id: "ORDER1TEST" } } }));
  assert.equal(notifier.telegrams.length, 1);
  assert.equal(notifier.kundenMails.length, 1);
});

// ---------------------------------------------------------------- Vorlagen / Eingaben
test("Bestaetigungsmail: bei freigegebenen Pflichtangaben nie mit Platzhalter", () => {
  const b = { nummer: "PD-2026-0001", name: "E", strasse: "S 1", plz: "86663", ort: "O", gesamt_cent: 3070, summe_waren_cent: 2580, versand_cent: 490, individuell: false, positionen: [] };
  const agbEcht = { agbText: "Echte AGB" };
  assert.throws(() => bestaetigungsMail(b, PFLICHTANGABEN_PLATZHALTER, true, agbEcht));
  assert.throws(() => bestaetigungsMail(b, "Echter Rechtstext", true, { lieferzeit: "5 Werktage" }), /Platzhalter/, "echter AGB_TEXT mit [PLATZHALTER blockiert");
  assert.throws(() => bestaetigungsMail(b, "Echter Rechtstext", true, { lieferzeit: "5 Werktage", agbText: "x [PLATZHALTER 2] y" }));
  assert.match(bestaetigungsMail(b, PFLICHTANGABEN_PLATZHALTER, false).text, /PLATZHALTER/);
  const echt = bestaetigungsMail(b, "Echter Rechtstext", true, { lieferzeit: "5 Werktage", agbText: "Echte AGB" }).text;
  assert.ok(echt.includes("Echter Rechtstext") && !echt.includes("PLATZHALTER"));
  assert.ok(echt.includes("ALLGEMEINE GESCHÄFTSBEDINGUNGEN") && echt.includes("Echte AGB"));
  assert.ok(AGB_TEXT.includes("[PLATZHALTER"), "AGB-Entwurf enthaelt noch Platzhalter (Guard greift)");
});

test("enthaeltStandardware nutzt das Positions-Flag, sonst Fallback", () => {
  const pos = (individuell?: boolean) => ({ name: "A", menge: 1, einzelpreis_cent: 100, individuell });
  const mk = (individuell: boolean, positionen: MailBestellung["positionen"]) => ({ individuell, positionen });
  assert.equal(enthaeltStandardware(mk(false, [pos(false)])), true);
  assert.equal(enthaeltStandardware(mk(true, [pos(true)])), false, "nur individuell");
  assert.equal(enthaeltStandardware(mk(true, [pos(true), pos(true)])), false, "zwei individuelle Positionen");
  assert.equal(enthaeltStandardware(mk(true, [pos(true), pos(false)])), true, "gemischt");
  assert.equal(enthaeltStandardware(mk(true, [pos(), pos()])), true, "ohne Flag: mehrere Positionen -> vorsichtig Standardware");
  assert.equal(enthaeltStandardware(mk(true, [pos()])), false, "ohne Flag, eine Position");
});

test("E-Mail mit Komma oder Semikolon wird abgelehnt", () => {
  const k = { name: "Max Muster", strasse: "Weg 1", plz: "86663", ort: "Ort" };
  assert.ok(!pruefeKunde({ ...k, email: "a@b.de,c@d.de" }).ok);
  assert.ok(!pruefeKunde({ ...k, email: "a@b.de;c@d.de" }).ok);
  assert.ok(pruefeKunde({ ...k, email: "a@b.de" }).ok);
});
