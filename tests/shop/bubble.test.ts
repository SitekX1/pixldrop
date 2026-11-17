import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE, einzelpreisCent } from "@/lib/shop/produkte";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";
import { normalisiere } from "@/lib/shop/server/einstellungen";
import { versandOptionen } from "@/lib/shop/versand";

const p = PRODUKTE.find((x) => x.slug === "bubble-buchstabe")!;
const ctx = (extra: Partial<Kontext> = {}): Kontext => ({ produkte: PRODUKTE, farben: [{ id: "x", name: "x", hex: "#000000" }], bestellbar: () => true, ...extra });
const pos = (o: Record<string, string> = {}, extra: Record<string, unknown> = {}) => ({
  slug: "bubble-buchstabe", menge: 1, farbeId: null,
  optionen: { hoehe: "h3", zeichen: "a", oberflaeche: "glatt", farbkombi: "weiss", ...o }, ...extra,
});

test("Bubble: 39 Zeichen, 6 Höhen, 24 Farben", () => {
  assert.equal(p.optionen.find((g) => g.id === "zeichen")!.optionen.length, 39);
  assert.equal(p.optionen.find((g) => g.id === "hoehe")!.optionen.length, 6);
  assert.equal(p.kombinationen!.length, 24);
});
test("Bubble: Preise je Höhe wie Etsy, Oberfläche kostet nichts extra", () => {
  const erw = { h3: 150, h5: 250, h8: 350, h10: 450, h12: 550, h15: 750 };
  for (const [h, c] of Object.entries(erw)) {
    assert.equal(einzelpreisCent(p, { hoehe: h, zeichen: "a", oberflaeche: "struktur" }), c);
    const r = berechneWarenkorb([pos({ hoehe: h, oberflaeche: "struktur" })], ctx(), "hermes");
    assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.wert.summeWarenCent, c);
  }
});
test("Bubble: gesperrte Farbe wird serverseitig abgelehnt, andere gehen", () => {
  const aus = berechneWarenkorb([pos({ farbkombi: "gold-silk" })], ctx({ farbenAus: ["gold-silk"] }), "hermes");
  assert.ok(!aus.ok && aus.fehler.code === "farbe_ungueltig");
  assert.ok(berechneWarenkorb([pos({ farbkombi: "weiss" })], ctx({ farbenAus: ["gold-silk"] }), "hermes").ok);
});
test("Bubble: unbekanntes Zeichen / Farbe abgelehnt", () => {
  assert.ok(!berechneWarenkorb([pos({ zeichen: "ä" })], ctx(), "hermes").ok);
  assert.ok(!berechneWarenkorb([pos({ farbkombi: "neon" })], ctx(), "hermes").ok);
});
test("Bubble: Einstellung bubble_farben_aus wird gelesen und bereinigt", () => {
  assert.deepEqual(normalisiere({ bubble_farben_aus: "Gold-Silk, braun ,,<x>" }).farbenAus, ["gold-silk", "braun"]);
  assert.deepEqual(normalisiere({}).farbenAus, []);
});
test("Bubble: nie Brief, immer Paket mit Hermes/DHL", () => {
  for (const h of ["h3", "h15"]) {
    const o = versandOptionen([{ slug: "bubble-buchstabe", menge: 1, optionen: { hoehe: h } }]);
    assert.deepEqual(o.map((x) => x.art), ["hermes", "dhl"]);
  }
});
