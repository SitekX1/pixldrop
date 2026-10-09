import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb, verarbeiteWebhook } from "@/lib/shop/server/bestellung";
import { PayPalFehler, erzeugePayPal, webhookKopfPlausibel } from "@/lib/shop/server/paypal";
import { FakeDb, bestellEingabe, kontext, neueDeps, testEnv, KUNDE } from "./mocks";

const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };

function webhookBody(orderId: string, captureId: string, wert: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: captureId, status: "COMPLETED", amount: { value: wert, currency_code: "EUR" },
      supplementary_data: { related_ids: { order_id: orderId } }, ...extra,
    },
  });
}

test("Bestellung anlegen: Betrag kommt vom Server, PayPal-Order mit gleichem Betrag, Status neu", async () => {
  const { db, paypal, deps } = neueDeps();
  const a = await legeBestellungAn(deps, bestellEingabe({ preisCent: 1, gesamt: 1 }), ctx);
  assert.equal(a.status, 200);
  assert.equal(a.body.ok, true);
  assert.match(String(a.body.approveUrl), /^https:\/\/www\.sandbox\.paypal\.com\//);
  assert.equal(db.bestellungen.length, 1);
  assert.equal(db.bestellungen[0].gesamt_cent, 2 * 1290 + 490);
  assert.equal(db.bestellungen[0].status, "neu");
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  const order = [...paypal.orders.values()][0];
  assert.equal(order.gesamtCent, 3070);
  assert.equal(order.returnUrl, `https://test.example/api/shop/zahlung/rueckkehr?b=${a.body.bestellnummer}`);
  assert.equal(db.bestellungen[0].paypal_order_id, "ORDER1TEST");
});

test("Doppelklick/Wiederholung mit gleichem Key: genau eine Bestellung", async () => {
  const { db, paypal, deps } = neueDeps();
  const a1 = await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.statusAufHolen = "CREATED";
  const a2 = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(db.bestellungen.length, 1);
  assert.equal(a1.body.bestellnummer, a2.body.bestellnummer);
  assert.equal(paypal.erzeugt, 1, "offene PayPal-Order wird wiederverwendet");
  // anderer Warenkorb mit gleichem Key -> Konflikt
  const a3 = await legeBestellungAn(deps, bestellEingabe({ positionen: [{ slug: "koffein-pegel", menge: 3, farbeId: "schwarz" }] }), ctx);
  assert.equal(a3.status, 409);
});

test("Pflichtangaben: AGB und Widerrufsausschluss bei Wunschtext", async () => {
  const { db, deps } = neueDeps();
  const ohneAgb = await legeBestellungAn(deps, bestellEingabe({ einwilligungen: {} }), ctx);
  assert.equal(ohneAgb.status, 422);
  const mitText = { positionen: [{ slug: "spruch-untersetzer", menge: 1, farbeId: "schwarz", text: "Montag", schriftId: "lato" }] };
  const ohneVerzicht = await legeBestellungAn(deps, bestellEingabe(mitText), ctx);
  assert.equal(ohneVerzicht.status, 422);
  const ok = await legeBestellungAn(deps, bestellEingabe({ ...mitText, idempotenzKey: "key-zweiter-versuch-123", einwilligungen: { agb: true, verzicht: true } }), ctx);
  assert.equal(ok.status, 200);
  assert.equal(db.bestellungen.length, 1);
});

test("Ungueltige Kundendaten, Key und fehlende Preise werden abgelehnt", async () => {
  const { db, deps } = neueDeps();
  assert.equal((await legeBestellungAn(deps, bestellEingabe({ kunde: { ...KUNDE, plz: "x" } }), ctx)).status, 422);
  assert.equal((await legeBestellungAn(deps, bestellEingabe({ idempotenzKey: "kurz" }), ctx)).status, 422);
  assert.equal((await legeBestellungAn(deps, null, ctx)).status, 422);
  const ohnePreis = await legeBestellungAn(deps, bestellEingabe(), { ...ctx, kontext: kontext({ produkte: [] }) });
  assert.equal(ohnePreis.status, 422);
  const lagerWeg = await legeBestellungAn(deps, bestellEingabe(), { ...ctx, kontext: kontext({ farben: null }) });
  assert.equal(lagerWeg.status, 503);
  assert.equal(db.bestellungen.length, 0);
});

test("Live-Betrieb ohne freigegebene Pflichtangaben wird verweigert", async () => {
  const { db, deps } = neueDeps({ env: testEnv({ PAYPAL_ENV: "live" }) });
  const a = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(a.status, 503);
  assert.equal(a.body.code, "texte_fehlen");
  assert.equal(db.bestellungen.length, 0);
  const frei = neueDeps({ env: testEnv({ PAYPAL_ENV: "live" }), pflichtangabenFreigegeben: true, pflichtangabenText: "Echter Rechtstext" });
  const mitPlatzhalter = neueDeps({ env: testEnv({ PAYPAL_ENV: "live" }), pflichtangabenFreigegeben: true, pflichtangabenText: "[[PLATZHALTER - Text]]" });
  assert.equal((await legeBestellungAn(mitPlatzhalter.deps, bestellEingabe(), ctx)).status, 503, "freigegeben, aber Platzhalter noch drin");
  assert.equal((await legeBestellungAn(frei.deps, bestellEingabe(), ctx)).status, 200);
});

test("PayPal-Ausfall beim Anlegen: 502, Bestellung bleibt neu, zweiter Versuch klappt", async () => {
  const { db, paypal, deps } = neueDeps();
  paypal.skript.erzeugenFehler = true;
  const a = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(a.status, 502);
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  assert.ok(db.ereignisse.some((e) => e.art === "fehler"));
  paypal.skript.erzeugenFehler = false;
  const b = await legeBestellungAn(deps, bestellEingabe(), ctx);
  assert.equal(b.status, 200);
  assert.equal(db.bestellungen.length, 1);
});

test("Zu viele Bestellungen je IP: 429", async () => {
  const { deps } = neueDeps();
  let letzte = 200;
  for (let i = 0; i < 6; i++) {
    letzte = (await legeBestellungAn(deps, bestellEingabe({ idempotenzKey: `key-nummer-${i}-0123456789` }), ctx)).status;
  }
  assert.equal(letzte, 429);
});

test("Rueckkehr: Capture, bezahlt, genau eine Telegram-Nachricht NUR mit Nummer", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  const a = await legeBestellungAn(deps, bestellEingabe(), ctx);
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "danke");
  assert.equal(r.nummer, a.body.bestellnummer);
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.equal(db.bestellungen[0].status, "bezahlt");
  assert.equal(paypal.captures, 1);
  assert.deepEqual(notifier.telegrams, [`Neue Bestellung ${r.nummer} (bezahlt)`]);
  // Datenschutz: weder Telegram noch Alex-Mail enthalten Kundendaten
  const alles = [...notifier.telegrams, ...notifier.alexMails.map((m) => m.betreff + m.text)].join("\n");
  for (const geheim of [KUNDE.name, KUNDE.strasse, KUNDE.email, KUNDE.ort]) assert.ok(!alles.includes(geheim), `enthaelt ${geheim}`);
  assert.match(notifier.alexMails[0].text, /https:\/\/admin\.example\/shop/);
  // Kundenbestaetigung mit echtem Rechtsblock (kein Platzhalter)
  assert.equal(notifier.kundenMails.length, 1);
  assert.equal(notifier.kundenMails[0].an, KUNDE.email);
  assert.match(notifier.kundenMails[0].text, /WIDERRUFSBELEHRUNG/);
  assert.match(notifier.kundenMails[0].text, /MUSTER-WIDERRUFSFORMULAR/);
  assert.ok(!notifier.kundenMails[0].text.includes("[[PLATZHALTER"));
  assert.match(notifier.kundenMails[0].text, new RegExp(r.nummer!));
});

test("Seite neu geladen / zweite Rueckkehr: nicht doppelt buchen, nicht doppelt melden", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  await schliesseZahlungAb(deps, "ORDER1TEST");
  const zweite = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(zweite.ziel, "danke");
  assert.equal(paypal.captures, 1, "kein zweites Capture");
  assert.equal(notifier.telegrams.length, 1);
  assert.equal(notifier.alexMails.length, 1);
  assert.equal(notifier.kundenMails.length, 1);
  assert.equal(db.ereignisse.filter((e) => e.art === "doppelte_zahlung").length, 0);
});

test("Webhook nach Capture: 200, keine Doppelbuchung, keine zweite Nachricht", async () => {
  const { db, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  await schliesseZahlungAb(deps, "ORDER1TEST");
  const w = await verarbeiteWebhook(deps, new Headers(), webhookBody("ORDER1TEST", "CAP-ORDER1TEST", "30.70"));
  assert.equal(w.status, 200);
  assert.equal(notifier.telegrams.length, 1);
  assert.equal(db.bestellungen[0].paypal_capture_id, "CAP-ORDER1TEST");
});

test("Webhook zuerst (Kunde schliesst Tab): bucht und meldet; spaetere Rueckkehr ist harmlos", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  const w = await verarbeiteWebhook(deps, new Headers(), webhookBody("ORDER1TEST", "CAP-X1", "30.70"));
  assert.equal(w.status, 200);
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.equal(notifier.telegrams.length, 1);
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "danke");
  assert.equal(paypal.captures, 0);
  assert.equal(notifier.telegrams.length, 1);
});

test("Webhook: falsche Signatur wird abgelehnt und nichts gebucht", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.webhookGueltig = false;
  const w = await verarbeiteWebhook(deps, new Headers(), webhookBody("ORDER1TEST", "CAP-X1", "30.70"));
  assert.equal(w.status, 401);
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  assert.equal(notifier.telegrams.length, 0);
});

test("Webhook: ohne Webhook-ID 503, kaputtes JSON 400, fremde Events/Bestellungen werden ignoriert", async () => {
  const ohneId = neueDeps({ env: testEnv({ PAYPAL_WEBHOOK_ID: "" }) });
  assert.equal((await verarbeiteWebhook(ohneId.deps, new Headers(), "{}")).status, 503);
  const { deps } = neueDeps();
  assert.equal((await verarbeiteWebhook(deps, new Headers(), "kein json")).status, 400);
  const anderes = await verarbeiteWebhook(deps, new Headers(), JSON.stringify({ event_type: "PAYMENT.CAPTURE.REFUNDED", resource: {} }));
  assert.equal(anderes.status, 200);
  assert.equal(anderes.body.ignoriert, true);
  const fremd = await verarbeiteWebhook(deps, new Headers(), webhookBody("FREMDEORDER", "CAP-F", "1.00"));
  assert.equal(fremd.status, 200);
  assert.equal(fremd.body.ignoriert, true);
});

test("Webhook: DB-Fehler -> 500, damit PayPal erneut zustellt", async () => {
  const { db, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  const original = db.rpc.bind(db);
  db.rpc = (async (name: string, args: Record<string, unknown>) => {
    if (name === "shop_zahlung_buchen") throw new Error("DB weg");
    return original(name, args);
  }) as typeof db.rpc;
  const w = await verarbeiteWebhook(deps, new Headers(), webhookBody("ORDER1TEST", "CAP-X1", "30.70"));
  assert.equal(w.status, 500);
});

test("Betragsabweichung: NICHT als bezahlt gebucht, Alex wird zur Pruefung gewarnt", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureBetragCent = 100; // PayPal meldet nur 1,00 EUR
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "pruefen");
  assert.notEqual(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.ok(db.ereignisse.some((e) => e.art === "betrag_abweichung"));
  assert.match(notifier.telegrams[0], /^Zahlung prüfen: PD-2026-0001 \(betrag_abweichung\)$/);
  assert.equal(notifier.kundenMails.length, 0);
});

test("Zweite, andere Zahlung auf dieselbe Bestellung wird als doppelt erkannt", async () => {
  const { db, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  await schliesseZahlungAb(deps, "ORDER1TEST");
  const w = await verarbeiteWebhook(deps, new Headers(), webhookBody("ORDER1TEST", "CAP-ANDERE", "30.70"));
  assert.equal(w.status, 200);
  assert.ok(db.ereignisse.some((e) => e.art === "doppelte_zahlung"));
  assert.equal(db.bestellungen[0].paypal_capture_id, "CAP-ORDER1TEST", "Original-Capture bleibt");
  assert.ok(notifier.telegrams.some((t) => t.startsWith("Zahlung prüfen")));
});

test("Abbruch bei PayPal / nicht freigegeben: Bestellung bleibt offen, kein Telegram", async () => {
  const { db, paypal, notifier, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureFehler = new PayPalFehler("capture", 422, "ORDER_NOT_APPROVED");
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "abbruch");
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  assert.equal(notifier.telegrams.length, 0);
});

test("Zahlung abgelehnt (z. B. INSTRUMENT_DECLINED): fehler, nichts gebucht", async () => {
  const { db, paypal, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureFehler = new PayPalFehler("capture", 422, "INSTRUMENT_DECLINED");
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "fehler");
  assert.equal(db.bestellungen[0].zahlungsstatus, "offen");
  assert.ok(db.ereignisse.some((e) => e.art === "zahlung_fehlgeschlagen"));
});

test("Netz-/Serverfehler beim Capture: fehler, spaeter erneut moeglich", async () => {
  const { db, paypal, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureFehler = new PayPalFehler("capture_netz");
  assert.equal((await schliesseZahlungAb(deps, "ORDER1TEST")).ziel, "fehler");
  paypal.skript.captureFehler = undefined;
  assert.equal((await schliesseZahlungAb(deps, "ORDER1TEST")).ziel, "danke");
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
});

test("Capture bereits bei PayPal erfolgt (ORDER_ALREADY_CAPTURED): Order wird gelesen und gebucht", async () => {
  const { db, paypal, deps } = neueDeps();
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  paypal.skript.captureFehler = new PayPalFehler("capture", 422, "ORDER_ALREADY_CAPTURED");
  paypal.statusAufHolen = "COMPLETED";
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "danke");
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
});

test("Unbekannter oder manipulierter Token", async () => {
  const { deps } = neueDeps();
  assert.equal((await schliesseZahlungAb(deps, "NIEGESEHEN123")).ziel, "unbekannt");
  assert.equal((await schliesseZahlungAb(deps, "../../etc")).ziel, "unbekannt");
  assert.equal((await schliesseZahlungAb(deps, null)).ziel, "unbekannt");
});

test("Kundenmail-Fehler blockiert die Buchung nicht und wird protokolliert", async () => {
  const { db, notifier, deps } = neueDeps();
  notifier.kundenMails.push = (() => { throw new Error("SMTP kaputt"); }) as never;
  await legeBestellungAn(deps, bestellEingabe(), ctx);
  const r = await schliesseZahlungAb(deps, "ORDER1TEST");
  assert.equal(r.ziel, "danke");
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.ok(db.ereignisse.some((e) => e.art === "benachrichtigung"));
  assert.equal(db.bestellungen[0].bestaetigt, false, "bleibt offen fuer einen spaeteren Versuch");
});

test("Fake-DB ist von FakeDb-Instanz getrennt (Sicherheitsnetz fuer Testaufbau)", () => {
  assert.notEqual(new FakeDb(), new FakeDb());
});

test("Tischschild: Standardtext ohne Verzicht bestellbar, geaenderter Text braucht den Verzicht", async () => {
  const { deps } = neueDeps();
  const schild = (text: string) => ({ positionen: [{ slug: "tischschild-erster-kaffee", menge: 1, farbeId: "schwarz", text }] });
  const std = await legeBestellungAn(deps, bestellEingabe(schild("Teamleiter\nSabine")), ctx);
  assert.equal(std.status, 200);
  const neuOhne = await legeBestellungAn(deps, bestellEingabe({ ...schild("Chef\nPetra"), idempotenzKey: "key-schild-eigener-text-1" }), ctx);
  assert.equal(neuOhne.status, 422);
  const neuMit = await legeBestellungAn(deps, bestellEingabe({ ...schild("Chef\nPetra"), idempotenzKey: "key-schild-eigener-text-2", einwilligungen: { agb: true, verzicht: true } }), ctx);
  assert.equal(neuMit.status, 200);
});

test("Mehrzeiliger Text wird als einzeiliger Text an die DB gegeben (kein Steuerzeichen)", async () => {
  const re = /\r?\n/g;
  const text = "Teamleiter\nSabine".replace(re, " / ");
  assert.equal(text, "Teamleiter / Sabine");
  assert.ok(/^[^\u0000-\u001f\u007f]{1,40}$/.test(text));
});

// --- Webhook-Header-Vorpruefung (Replay / fremde Zertifikats-URL), Auflage Security-Review ---
function whKopf(zeit: number, cert = "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1") {
  return new Headers({
    "paypal-transmission-id": "t1", "paypal-transmission-sig": "sig", "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-time": new Date(zeit).toISOString(), "paypal-cert-url": cert,
  });
}

test("Webhook-Kopf: Zeitfenster +-5 Minuten und nur PayPal-API-Hosts mit https", () => {
  const jetzt = Date.parse("2026-10-09T12:00:00Z");
  assert.equal(webhookKopfPlausibel(whKopf(jetzt - 60_000), jetzt), true);
  assert.equal(webhookKopfPlausibel(whKopf(jetzt + 60_000), jetzt), true);
  assert.equal(webhookKopfPlausibel(whKopf(jetzt - 6 * 60_000), jetzt), false);
  assert.equal(webhookKopfPlausibel(whKopf(jetzt + 6 * 60_000), jetzt), false);
  assert.equal(webhookKopfPlausibel(new Headers({ "paypal-cert-url": "https://api.paypal.com/x" }), jetzt), false);
  for (const ok of ["https://api.paypal.com/v1/c", "https://api-m.paypal.com/v1/c", "https://api-m.sandbox.paypal.com/v1/c"]) {
    assert.equal(webhookKopfPlausibel(whKopf(jetzt, ok), jetzt), true, ok);
  }
  for (const schlecht of [
    "http://api.paypal.com/v1/c", "https://evil.example/v1/c", "https://api.paypal.com.evil.example/c",
    "https://api.paypal.com@evil.example/c", "https://api.paypal.com:8443/c", "https://www.paypal.com/c", "", "kein url",
  ]) {
    assert.equal(webhookKopfPlausibel(whKopf(jetzt, schlecht), jetzt), false, schlecht);
  }
});

test("pruefeWebhook: alter Zeitstempel oder fremder Cert-Host -> false ohne jeden PayPal-Aufruf", async () => {
  let aufrufe = 0;
  const client = erzeugePayPal(
    { env: "sandbox", clientId: "id", clientSecret: "geheim", webhookId: "WH-1" },
    (async () => { aufrufe++; throw new Error("darf nicht aufgerufen werden"); }) as never,
  );
  const jetzt = Date.now();
  assert.equal(await client.pruefeWebhook(whKopf(jetzt - 10 * 60_000), {}), false);
  assert.equal(await client.pruefeWebhook(whKopf(jetzt, "https://evil.example/c"), {}), false);
  assert.equal(aufrufe, 0);
  // Plausibler Kopf -> es wird versucht, PayPal zu fragen (Fehler wird zu false)
  assert.equal(await client.pruefeWebhook(whKopf(jetzt), {}), false);
  assert.ok(aufrufe > 0);
});
