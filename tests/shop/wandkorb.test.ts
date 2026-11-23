import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE } from "@/lib/shop/produkte";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";
import { versandOptionen } from "@/lib/shop/versand";
import { pruefeWandKonfiguration, wandZeilenPreise } from "@/lib/shop/wand";

const ctx = (extra: Partial<Kontext> = {}): Kontext => ({ produkte: PRODUKTE, farben: [], bestellbar: () => true, ...extra });
const zeile = (o: Record<string, unknown> = {}) => ({ text: "Emil", schrift: "libre-baskerville", hoeheCm: 10, farbe: "schwarz", ...o });
const pos = (wand: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  slug: "wandbuchstaben", menge: 1, wand: { zeilen: [zeile()], oberflaeche: "glatt", dickeMm: 10, ...wand }, ...extra,
});

test("Wand-Warenkorb: Preis kommt vom Server, eine Zeile = eine Position", () => {
  const r = berechneWarenkorb([pos()], ctx(), "hermes");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.wert.positionen.length, 1);
  assert.equal(r.wert.summeWarenCent, 4 * 612);
  assert.equal(r.wert.positionen[0].text, "Emil");
  assert.equal(r.wert.positionen[0].individuell, true);
  assert.equal(r.wert.individuell, true);
  assert.equal(r.wert.gesamtCent, r.wert.summeWarenCent + r.wert.versandCent);
});

test("Wand-Warenkorb: Rabatt wird auf die Zeilen verteilt, Summe stimmt genau", () => {
  const e = { zeilen: [zeile({ text: "Willkommen", hoeheCm: 15 }), zeile({ text: "Zuhause", hoeheCm: 10, farbe: "weiss" })], oberflaeche: "strukturiert", dickeMm: 10 };
  const w = pruefeWandKonfiguration(e);
  assert.ok(w.ok);
  assert.ok(w.wert.rabattCent > 0);
  const r = berechneWarenkorb([{ slug: "wandbuchstaben", menge: 1, wand: e }], ctx(), "dhl");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.wert.positionen.length, 2);
  assert.equal(r.wert.summeWarenCent, w.wert.gesamtCent);
  assert.equal(wandZeilenPreise(w.wert).reduce((a, b) => a + b, 0), w.wert.gesamtCent);
  assert.equal(r.wert.positionen[1].farbeName, "Weiß");
  assert.ok(r.wert.positionen.every((p) => p.text!.length <= 40 && JSON.stringify(p.optionen).length < 500));
});

test("Wand-Warenkorb: manipulierte Eingaben werden abgelehnt", () => {
  const nein = (p: unknown) => { const r = berechneWarenkorb([p], ctx(), "hermes"); assert.ok(!r.ok); return r.ok ? null : r.fehler; };
  nein({ slug: "wandbuchstaben", menge: 1 });
  nein(pos({}, { menge: 2 }));
  nein(pos({ oberflaeche: "gold" }));
  nein(pos({ dickeMm: 3 }));
  nein(pos({ zeilen: [zeile({ hoeheCm: 24 })] }));
  nein(pos({ zeilen: [zeile({ farbe: "pink" })] }));
  nein(pos({ zeilen: [zeile({ text: "Hitler" })] }));
  assert.equal(nein(pos({ zeilen: [zeile({ text: "Wand", hoeheCm: 20 })] }))!.code, "text_passt_nicht");
  const preisManipuliert = berechneWarenkorb([pos({}, { preisCent: 1, einzelpreisCent: 1 })], ctx(), "hermes");
  assert.ok(preisManipuliert.ok && preisManipuliert.wert.summeWarenCent === 4 * 612, "Client-Preis wird ignoriert");
});

test("Wand-Warenkorb: Farbsperre mit Vorsatz wand-, Bubble-Sperre gleicher ID trifft nicht", () => {
  const aus = berechneWarenkorb([pos()], ctx({ farbenAus: ["wand-schwarz"] }), "hermes");
  assert.ok(!aus.ok && aus.fehler.code === "farbe_ungueltig");
  assert.ok(berechneWarenkorb([pos()], ctx({ farbenAus: ["schwarz"] }), "hermes").ok);
});

test("Wand-Versand: immer Paket, nie Brief; mehr Buchstaben und Größe kosten nicht weniger", () => {
  const klein = berechneWarenkorb([pos({ zeilen: [zeile({ text: "I", hoeheCm: 5 })] })], ctx(), "hermes");
  assert.ok(klein.ok);
  assert.notEqual(klein.wert.versandart, "brief");
  const gross = berechneWarenkorb([pos({ zeilen: [zeile({ text: "Hallo Leute", hoeheCm: 20 })] })], ctx(), "hermes");
  assert.ok(gross.ok, JSON.stringify(gross));
  assert.ok(gross.wert.versandCent >= klein.wert.versandCent);
  const opt = versandOptionen([{ slug: "wandbuchstaben", menge: 1, optionen: { wand: (pruefeWandKonfiguration(pos().wand) as { wert: unknown }).wert as Record<string, unknown> } }]);
  assert.deepEqual(opt.map((o) => o.art), ["hermes", "dhl"]);
});

test("Wand-Warenkorb: im Live-Shop nicht sichtbar, solange Entwurf (VERCEL_ENV=production)", async () => {
  const { sichtbareProdukte, istBestellbar } = await import("@/lib/shop/produkte");
  const alt = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    assert.ok(!sichtbareProdukte().some((p) => p.slug === "wandbuchstaben"));
    assert.equal(istBestellbar(PRODUKTE.find((p) => p.slug === "wandbuchstaben")!), false);
  } finally { if (alt === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = alt; }
});

test("Wand-Warenkorb: Client-Auswahl -> Bestellung -> Server ergibt denselben Preis wie die Anzeige", async () => {
  const { baueBestellung } = await import("@/lib/shop/client");
  const { einzelpreisCent } = await import("@/lib/shop/produkte");
  const { versandOptionenFuerKorb } = await import("@/lib/shop/versand");
  const eingabe = { zeilen: [zeile({ text: "Willkommen", hoeheCm: 15 }), zeile({ text: "Zuhause", hoeheCm: 10 })], oberflaeche: "strukturiert", dickeMm: 10, schreibweise: "eingabe" };
  const a = { slug: "wandbuchstaben", farbeId: null, optionen: { wand: JSON.stringify(eingabe) }, text: "", schriftId: null, menge: 1 };
  const p = PRODUKTE.find((x) => x.slug === "wandbuchstaben")!;
  const anzeige = einzelpreisCent(p, a.optionen);
  assert.ok(anzeige && anzeige > 0);
  const body = baueBestellung({ token: "t", idempotenzKey: "k".repeat(20), auswahl: [a], kunde: { name: "A B", strasse: "x 1", plz: "86663", ort: "O", email: "a@b.de", hinweis: "" }, agb: true, verzicht: true, versandart: "hermes" });
  const r = berechneWarenkorb(body.positionen, ctx(), "hermes");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.wert.summeWarenCent, anzeige);
  assert.ok(versandOptionenFuerKorb([a]).length === 2, "Versandanzeige im Browser funktioniert");
});
