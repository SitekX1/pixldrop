import { test } from "node:test";
import assert from "node:assert/strict";
import { legeBestellungAn, schliesseZahlungAb, verarbeiteWebhook } from "@/lib/shop/server/bestellung";
import {
  ERINNERUNG_NACH_STUNDEN, FREIGABE_GUELTIG_SEK, entscheideFreigabe, erinnereOffeneFreigaben, freigabeLinks,
  holeFreigabeDaten, pruefeFreigabeToken, signiereFreigabe,
} from "@/lib/shop/server/freigabe";
import { fuehreBereinigungAus } from "@/lib/shop/server/bereinigung";
import { legeAnfrageAn } from "@/lib/shop/server/anfrage";
import { PayPalFehler } from "@/lib/shop/server/paypal";
import { bestellEingabe, kontext, neueDeps, testEnv, type FakePayPal } from "./mocks";

const SCHLUESSEL = "freigabe-test-schluessel-0123456789abcdef";
const ctx = { ipHash: "ip-hash-0123456789abcdef", kontext: kontext() };
const UUID_A = "00000000-0000-4000-8000-000000000001";
const UUID_B = "00000000-0000-4000-8000-000000000002";

const mitText = {
  positionen: [{ slug: "spruch-untersetzer", menge: 1, farbeId: "schwarz", text: "Montag", schriftId: "oswald" }],
  einwilligungen: { agb: true, verzicht: true },
};

function webhookBody(orderId: string, captureId: string, wert: string) {
  return JSON.stringify({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: { id: captureId, status: "COMPLETED", amount: { value: wert, currency_code: "EUR" }, supplementary_data: { related_ids: { order_id: orderId } } },
  });
}

async function wunschBestellung() {
  const t = neueDeps({ env: testEnv({ SHOP_API_SECRET: SCHLUESSEL }) });
  const a = await legeBestellungAn(t.deps, bestellEingabe(mitText), ctx);
  assert.equal(a.status, 200);
  return { ...t, paypal: t.paypal as FakePayPal, id: t.db.bestellungen[0].id, nummer: t.db.bestellungen[0].nummer };
}

async function bezahlteWunschBestellung() {
  const t = await wunschBestellung();
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  return t;
}

function linksAusTelegram(text: string) {
  const ok = /Freigeben: (\S+)/.exec(text)?.[1];
  const nein = /Ablehnen: (\S+)/.exec(text)?.[1];
  assert.ok(ok && nein, "Telegram enthaelt beide Links");
  return { ok: ok!, nein: nein! };
}
const param = (url: string, name: string) => new URL(url).searchParams.get(name)!;

test("Token: Signatur passt nur zu Bestellung, Aktion und Schluessel", () => {
  const jetzt = 1_800_000_000_000;
  const t = signiereFreigabe(SCHLUESSEL, UUID_A, "ok", jetzt);
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "ok", t, jetzt), "ok");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "nein", t, jetzt), "ungueltig");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_B, "ok", t, jetzt), "ungueltig");
  assert.equal(pruefeFreigabeToken("anderer-schluessel-0123456789abcdef", UUID_A, "ok", t, jetzt), "ungueltig");
  const [ablauf, mac] = t.split(".");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "ok", `${Number(ablauf) + 100000}.${mac}`, jetzt), "ungueltig");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "ok", `${ablauf}.${mac.slice(0, -1)}${mac.endsWith("A") ? "B" : "A"}`, jetzt), "ungueltig");
  for (const kaputt of [undefined, null, 5, "", "abc", `${ablauf}.kurz`, ablauf]) {
    assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "ok", kaputt, jetzt), "ungueltig");
  }
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, "kein-uuid", "ok", t, jetzt), "ungueltig");
});

test("Token: 7 Tage gueltig, danach abgelaufen", () => {
  const jetzt = 1_800_000_000_000;
  const t = signiereFreigabe(SCHLUESSEL, UUID_A, "nein", jetzt);
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "nein", t, jetzt + (FREIGABE_GUELTIG_SEK - 1) * 1000), "ok");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "nein", t, jetzt + (FREIGABE_GUELTIG_SEK + 1) * 1000), "abgelaufen");
});

test("Links: eigener Schluessel hat Vorrang, ohne Schluessel keine Links", () => {
  assert.equal(freigabeLinks(testEnv(), UUID_A), null);
  const l = freigabeLinks(testEnv({ SHOP_API_SECRET: SCHLUESSEL }), UUID_A)!;
  assert.match(l.ok, /^https:\/\/test\.example\/3d-druck\/freigabe\?b=[0-9a-f-]{36}&a=ok&t=\d+\.[A-Za-z0-9_-]{43}$/);
  const eigen = freigabeLinks(testEnv({ SHOP_API_SECRET: SCHLUESSEL, SHOP_FREIGABE_SECRET: "eigener-schluessel-0123456789abcdef" }), UUID_A)!;
  assert.equal(pruefeFreigabeToken("eigener-schluessel-0123456789abcdef", UUID_A, "ok", param(eigen.ok, "t")), "ok");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, UUID_A, "ok", param(eigen.ok, "t")), "ungueltig");
});

test("Wunschtext bezahlt: nur Eingangsbestaetigung ohne Anhaenge, Telegram mit zwei Links ohne Kundendaten", async () => {
  const { db, notifier, nummer } = await bezahlteWunschBestellung();
  assert.equal(db.bestellungen[0].freigabe, "offen");
  assert.equal(notifier.kundenMails.length, 1);
  const m = notifier.kundenMails[0];
  assert.match(m.betreff, /ich prüfe deinen Text/);
  assert.match(m.text, /noch kein Vertragsschluss/);
  assert.match(m.text, /24 Stunden/);
  assert.match(m.text, /\/3d-druck\/agb/);
  assert.equal(m.anhaenge, undefined);
  assert.equal(db.bestellungen[0].bestaetigt, false);
  assert.equal(notifier.telegrams.length, 1);
  const tg = notifier.telegrams[0];
  assert.match(tg, new RegExp(`^Wunschtext prüfen und freigeben: ${nummer}`));
  assert.doesNotMatch(tg, /Erika|Teststraße|Montag|@/);
  const l = linksAusTelegram(tg);
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, param(l.ok, "b"), "ok", param(l.ok, "t")), "ok");
  assert.equal(pruefeFreigabeToken(SCHLUESSEL, param(l.nein, "b"), "nein", param(l.nein, "t")), "ok");
});

test("Wunschtext: Webhook und Rueckkehr -> genau eine Eingangsmail, eine Telegram, keine Vertragsmail", async () => {
  const t = await wunschBestellung();
  const w = await verarbeiteWebhook(t.deps, new Headers(), webhookBody("ORDER1TEST", "CAP-ORDER1TEST", "17.80"));
  assert.equal(w.status, 200);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  await verarbeiteWebhook(t.deps, new Headers(), webhookBody("ORDER1TEST", "CAP-ORDER1TEST", "17.80"));
  assert.equal(t.notifier.kundenMails.length, 1);
  assert.equal(t.notifier.telegrams.length, 1);
  assert.equal(t.db.bestellungen[0].bestaetigt, false);
});

test("Standardbestellung unveraendert: Vertragsbestaetigung, kein Freigabe-Flow", async () => {
  const t = neueDeps({ env: testEnv({ SHOP_API_SECRET: SCHLUESSEL }) });
  await legeBestellungAn(t.deps, bestellEingabe(), ctx);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  assert.equal(t.db.bestellungen[0].freigabe ?? null, null);
  assert.equal(t.notifier.kundenMails.length, 1);
  assert.match(t.notifier.kundenMails[0].betreff, /Bestellbestätigung/);
  assert.match(t.notifier.telegrams[0], /^Neue Bestellung/);
});

test("Fallback: Freigabe-Migration fehlt -> keine Kundenmail, Alex wird gewarnt", async () => {
  const t = await wunschBestellung();
  t.db.ohneFreigabeMigration = true;
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  assert.equal(t.notifier.kundenMails.length, 0);
  assert.match(t.notifier.telegrams[0], /Zahlung prüfen/);
});

test("Fallback: ohne Schluessel keine Links, Warnung an Alex, Eingangsmail geht trotzdem", async () => {
  const t = neueDeps();
  await legeBestellungAn(t.deps, bestellEingabe(mitText), ctx);
  await schliesseZahlungAb(t.deps, "ORDER1TEST");
  assert.equal(t.notifier.kundenMails.length, 1);
  assert.match(t.notifier.telegrams[0], /Schlüssel fehlt/);
});

test("Freigabe-Daten: Wunschtext/Schrift, keine Kundendaten, GET aendert nichts; Aktion aus Token", async () => {
  const { db, deps, id } = await bezahlteWunschBestellung();
  const links = freigabeLinks(deps.env, id)!;
  const a = await holeFreigabeDaten(deps, { b: id, t: param(links.nein, "t") });
  assert.equal(a.status, 200);
  assert.equal(a.body.aktion, "nein");
  assert.equal(a.body.status, "offen");
  const pos = a.body.positionen as { text: string; schrift: string; individuell: boolean }[];
  assert.equal(pos[0].text, "Montag");
  assert.equal(pos[0].schrift, "oswald");
  assert.doesNotMatch(JSON.stringify(a.body), /Erika|Teststraße|erika@|86663|Asbach/);
  assert.equal((a.body.gruende as unknown[]).length, 4);
  assert.equal(db.bestellungen[0].freigabe, "offen");
  assert.equal((await holeFreigabeDaten(deps, { b: id, t: param(links.ok, "t") })).body.aktion, "ok");
});

test("Freigabe-Daten: ungueltig/abgelaufen/unbekannt -> gleiche generische 403", async () => {
  const { deps, id } = await bezahlteWunschBestellung();
  const gut = param(freigabeLinks(deps.env, id)!.ok, "t");
  const alt = signiereFreigabe(SCHLUESSEL, id, "ok", Date.now() - (FREIGABE_GUELTIG_SEK + 60) * 1000);
  const r = await Promise.all([
    holeFreigabeDaten(deps, { b: id, t: gut.slice(0, -2) + "AA" }),
    holeFreigabeDaten(deps, { b: id, t: alt }),
    holeFreigabeDaten(deps, { b: UUID_B, t: signiereFreigabe(SCHLUESSEL, UUID_B, "ok") }),
  ]);
  for (const a of r) {
    assert.equal(a.status, 403);
    assert.equal(a.body.code, "link_ungueltig");
    assert.equal(a.body.error, r[0].body.error);
  }
  assert.equal((await holeFreigabeDaten(deps, { b: null, t: null })).status, 400);
  assert.equal((await holeFreigabeDaten(neueDeps().deps, { b: id, t: gut })).status, 503);
});

test("Freigeben: Vertragsbestaetigung mit PDFs genau einmal, Wiederholung doppelt nichts, Ablehnen danach gesperrt", async () => {
  const { db, deps, notifier, paypal, id } = await bezahlteWunschBestellung();
  const l = freigabeLinks(deps.env, id)!;
  const e = { b: id, t: param(l.ok, "t"), aktion: "ok" };
  const r = await entscheideFreigabe(deps, e);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, status: "freigegeben", neu: true, mail: true });
  assert.equal(db.bestellungen[0].bestaetigt, true);
  assert.equal(notifier.kundenMails.length, 2);
  assert.match(notifier.kundenMails[1].betreff, /Bestellbestätigung/);
  assert.ok((notifier.kundenMails[1].anhaenge?.length ?? 0) >= 1);
  assert.equal(paypal.erstattungen.length, 0);

  const r2 = await entscheideFreigabe(deps, e);
  assert.equal(r2.body.neu, false);
  assert.equal(notifier.kundenMails.length, 2);

  const nein = await entscheideFreigabe(deps, { b: id, t: param(l.nein, "t"), aktion: "nein", grund: "marke" });
  assert.equal(nein.status, 409);
  assert.equal(nein.body.code, "bereits_entschieden");
  assert.equal(db.bestellungen[0].freigabe, "freigegeben");
  assert.equal(paypal.erstattungen.length, 0);
});

test("Entscheidung: Token nur fuer eigene Aktion, Eingabefehler, unbezahlt", async () => {
  const { db, deps, id } = await bezahlteWunschBestellung();
  const l = freigabeLinks(deps.env, id)!;
  assert.equal((await entscheideFreigabe(deps, { b: id, t: param(l.ok, "t"), aktion: "nein", grund: "marke" })).status, 403);
  assert.equal(db.bestellungen[0].freigabe, "offen");
  for (const kaputt of [null, "x", { b: id }, { b: id, t: "x", aktion: "vielleicht" }, { b: 5, t: "x", aktion: "ok" }]) {
    assert.equal((await entscheideFreigabe(deps, kaputt)).status, 400);
  }
  const u = await wunschBestellung();
  const lu = freigabeLinks(u.deps.env, u.id)!;
  const r = await entscheideFreigabe(u.deps, { b: u.id, t: param(lu.ok, "t"), aktion: "ok" });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, "nicht_moeglich");
  assert.equal(u.notifier.kundenMails.length, 0);
});

test("Freigeben: Mailfehler -> Freigabe steht, Bestaetigung wird bei Wiederholung nachgeholt", async () => {
  const { db, deps, notifier, id } = await bezahlteWunschBestellung();
  const l = freigabeLinks(deps.env, id)!;
  const e = { b: id, t: param(l.ok, "t"), aktion: "ok" };
  const orig = notifier.mailKunde.bind(notifier);
  let aus = true;
  notifier.mailKunde = (async (...a: Parameters<typeof orig>) => (aus ? false : orig(...a))) as typeof orig;
  const r = await entscheideFreigabe(deps, e);
  assert.equal(r.body.mail, false);
  assert.equal(db.bestellungen[0].freigabe, "freigegeben");
  aus = false;
  const r2 = await entscheideFreigabe(deps, e);
  assert.equal(r2.body.neu, false);
  assert.equal(r2.body.mail, true);
  assert.equal(db.bestellungen[0].bestaetigt, true);
});

test("Ablehnen: Grund Pflicht, Absage-Mail, volle Erstattung inkl. Versand, Wiederholung erstattet nicht doppelt", async () => {
  const { db, deps, paypal, notifier, id, nummer } = await bezahlteWunschBestellung();
  const l = freigabeLinks(deps.env, id)!;
  const t = param(l.nein, "t");
  assert.equal((await entscheideFreigabe(deps, { b: id, t, aktion: "nein" })).body.code, "grund_fehlt");
  assert.equal((await entscheideFreigabe(deps, { b: id, t, aktion: "nein", grund: "weil" })).status, 422);
  assert.equal(db.bestellungen[0].freigabe, "offen");

  const r = await entscheideFreigabe(deps, { b: id, t, aktion: "nein", grund: "marke" });
  assert.deepEqual(r.body, { ok: true, status: "abgelehnt", neu: true, erstattung: "erstattet", mail: true });
  assert.equal(paypal.erstattungen.length, 1);
  assert.equal(paypal.erstattungen[0].captureId, "CAP-ORDER1TEST");
  assert.equal(paypal.erstattungen[0].betragCent, db.bestellungen[0].gesamt_cent);
  assert.equal(paypal.erstattungen[0].requestId, `refund-${nummer}`);
  assert.equal(db.bestellungen[0].status, "storniert");
  assert.equal(db.bestellungen[0].zahlungsstatus, "erstattet");
  const absage = notifier.kundenMails[notifier.kundenMails.length - 1];
  assert.match(absage.betreff, /Erstattung erfolgt/);
  assert.match(absage.text, /geschützte Marke, ein Logo/);
  assert.equal(absage.anhaenge, undefined);
  assert.equal(db.bestellungen[0].bestaetigt, false);

  const mails = notifier.kundenMails.length;
  const r2 = await entscheideFreigabe(deps, { b: id, t, aktion: "nein", grund: "marke" });
  assert.equal(r2.body.neu, false);
  assert.equal(paypal.erstattungen.length, 1);
  assert.equal(notifier.kundenMails.length, mails);

  const ok = await entscheideFreigabe(deps, { b: id, t: param(l.ok, "t"), aktion: "ok" });
  assert.equal(ok.status, 409);
  assert.equal(db.bestellungen[0].bestaetigt, false);
});

test("Ablehnen: Refund-Fehler -> erstattung_offen, Telegram 'bitte in PayPal erstatten', Absage trotzdem; Wiederholung zieht nach", async () => {
  const { db, deps, paypal, notifier, id, nummer } = await bezahlteWunschBestellung();
  paypal.erstattungFehler = new PayPalFehler("erstattung", 500);
  const l = freigabeLinks(deps.env, id)!;
  const e = { b: id, t: param(l.nein, "t"), aktion: "nein", grund: "unleserlich" };
  const r = await entscheideFreigabe(deps, e);
  assert.equal(r.status, 200);
  assert.equal(r.body.erstattung, "erstattung_offen");
  assert.equal(r.body.mail, true);
  assert.equal(db.bestellungen[0].erstattung, "erstattung_offen");
  assert.equal(db.bestellungen[0].zahlungsstatus, "bezahlt");
  assert.match(notifier.telegrams[notifier.telegrams.length - 1], new RegExp(`${nummer}.*bitte in PayPal erstatten`));
  assert.match(notifier.kundenMails[notifier.kundenMails.length - 1].text, /sauber und lesbar/);

  paypal.erstattungFehler = null;
  const r2 = await entscheideFreigabe(deps, e);
  assert.equal(r2.body.erstattung, "erstattet");
  assert.equal(r2.body.neu, false);
  assert.equal(paypal.erstattungen[0].requestId, paypal.erstattungen[1].requestId);
});

test("Ablehnen: CAPTURE_FULLY_REFUNDED gilt als erledigt, Status FAILED nicht", async () => {
  const a = await bezahlteWunschBestellung();
  a.paypal.erstattungFehler = new PayPalFehler("erstattung", 422, "CAPTURE_FULLY_REFUNDED");
  const la = freigabeLinks(a.deps.env, a.id)!;
  assert.equal((await entscheideFreigabe(a.deps, { b: a.id, t: param(la.nein, "t"), aktion: "nein", grund: "sonstiges" })).body.erstattung, "erstattet");
  const b = await bezahlteWunschBestellung();
  b.paypal.erstattungStatus = "FAILED";
  const lb = freigabeLinks(b.deps.env, b.id)!;
  assert.equal((await entscheideFreigabe(b.deps, { b: b.id, t: param(lb.nein, "t"), aktion: "nein", grund: "sonstiges" })).body.erstattung, "erstattung_offen");
});

test("Erinnerung: nur > 20 h, einmalig, mit Links; fehlende Migration bricht nichts", async () => {
  const { db, deps, notifier, nummer } = await bezahlteWunschBestellung();
  const vorher = notifier.telegrams.length;
  assert.equal(await erinnereOffeneFreigaben(deps), 0);
  db.bestellungen[0].angefordertVorH = ERINNERUNG_NACH_STUNDEN + 1;
  assert.equal(await erinnereOffeneFreigaben(deps), 1);
  const tg = notifier.telegrams[notifier.telegrams.length - 1];
  assert.match(tg, new RegExp(`Erinnerung: Bestellung ${nummer}`));
  linksAusTelegram(tg);
  assert.equal(await erinnereOffeneFreigaben(deps), 0);
  assert.equal(notifier.telegrams.length, vorher + 1);
  db.ohneFreigabeMigration = true;
  assert.equal(await erinnereOffeneFreigaben(deps), 0);
});

test("Bereinigung: Erinnerung eingebunden, Fehler dort bricht nicht ab", async () => {
  const { db, deps, notifier } = await bezahlteWunschBestellung();
  db.bestellungen[0].angefordertVorH = 30;
  assert.equal((await fuehreBereinigungAus(db, { env: deps.env, notifier })).freigabeErinnerungen, 1);
  assert.equal((await fuehreBereinigungAus(db)).freigabeErinnerungen, undefined);
  db.ohneFreigabeMigration = true;
  assert.equal((await fuehreBereinigungAus(db, { env: deps.env, notifier })).freigabeErinnerungen, 0);
});

test("Anfrage: Speicher-Deckel -> 503 speicher_voll mit Hinweis ohne Bilder", async () => {
  const t = neueDeps();
  t.db.anfrageGrund = "speicher_voll";
  const felder = { name: "Erika Beispiel", email: "erika@example.org", beschreibung: "Ein Halter fuer meine Kopfhoerer, 12 cm breit.", datenschutz: "true" };
  const r = await legeAnfrageAn({ db: t.db, notifier: t.notifier, env: t.deps.env }, felder, [], { ipHash: "ip-hash-0123456789abcdef", farben: null });
  assert.equal(r.status, 503);
  assert.equal(r.body.code, "speicher_voll");
  assert.match(String(r.body.error), /ohne Bilder/);
});

test("Rueckkehr: Wunschtext -> freigabe-Flag fuer ?hinweis=freigabe, Standard nicht", async () => {
  const w = await wunschBestellung();
  assert.equal((await schliesseZahlungAb(w.deps, "ORDER1TEST")).freigabe, true);
  const t = neueDeps({ env: testEnv({ SHOP_API_SECRET: SCHLUESSEL }) });
  await legeBestellungAn(t.deps, bestellEingabe(), ctx);
  assert.equal((await schliesseZahlungAb(t.deps, "ORDER1TEST")).freigabe, undefined);
});

test("Freigabe-Daten: zeilen-Array (Einzeltext eine Zeile, Tischschild zwei Zeilen)", async () => {
  const { db, deps, id } = await bezahlteWunschBestellung();
  const t = param(freigabeLinks(deps.env, id)!.ok, "t");
  const einfach = (await holeFreigabeDaten(deps, { b: id, t })).body.positionen as { zeilen: string[]; text: string }[];
  assert.deepEqual(einfach[0].zeilen, ["Montag"]);
  const { PRODUKTE } = await import("@/lib/shop/produkte");
  const schild = PRODUKTE.find((p) => (p.personalisierung?.zeilen?.length ?? 0) > 1);
  if (schild) {
    db.bestellungen[0].positionen[0] = { ...db.bestellungen[0].positionen[0], name: schild.name, text: "Hallo / Welt" };
    const z = (await holeFreigabeDaten(deps, { b: id, t })).body.positionen as { zeilen: string[]; text: string }[];
    assert.deepEqual(z[0].zeilen, ["Hallo", "Welt"]);
    assert.equal(z[0].text, "Hallo / Welt");
  }
});

test("Parallel: zweimal gleichzeitig Ablehnen/Freigeben -> genau eine Absage bzw. eine Bestaetigung", async () => {
  const a = await bezahlteWunschBestellung();
  const la = freigabeLinks(a.deps.env, a.id)!;
  const e = { b: a.id, t: param(la.nein, "t"), aktion: "nein", grund: "marke" };
  const vorher = a.notifier.kundenMails.length;
  await Promise.all([entscheideFreigabe(a.deps, e), entscheideFreigabe(a.deps, e)]);
  assert.equal(a.notifier.kundenMails.length, vorher + 1);

  const b = await bezahlteWunschBestellung();
  const lb = freigabeLinks(b.deps.env, b.id)!;
  const eb = { b: b.id, t: param(lb.ok, "t"), aktion: "ok" };
  const vb = b.notifier.kundenMails.length;
  await Promise.all([entscheideFreigabe(b.deps, eb), entscheideFreigabe(b.deps, eb)]);
  assert.equal(b.notifier.kundenMails.length, vb + 1);
});

test("Parallel: Capture und Webhook gleichzeitig -> genau eine Eingangsmail; Sendefehler gibt den Claim frei", async () => {
  const t = await wunschBestellung();
  await Promise.all([
    schliesseZahlungAb(t.deps, "ORDER1TEST"),
    verarbeiteWebhook(t.deps, new Headers(), webhookBody("ORDER1TEST", "CAP-ORDER1TEST", "17.80")),
  ]);
  assert.equal(t.notifier.kundenMails.length, 1);

  const f = await wunschBestellung();
  const orig = f.notifier.mailKunde.bind(f.notifier);
  let aus = true;
  f.notifier.mailKunde = (async (...x: Parameters<typeof orig>) => (aus ? false : orig(...x))) as typeof orig;
  await schliesseZahlungAb(f.deps, "ORDER1TEST");
  assert.equal(f.db.bestellungen[0].eingang, false, "Claim zurueckgenommen");
  aus = false;
  await schliesseZahlungAb(f.deps, "ORDER1TEST");
  assert.equal(f.notifier.kundenMails.length, 1);
});
