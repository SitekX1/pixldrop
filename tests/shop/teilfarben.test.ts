import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE, istIndividuell, holeProdukt } from "@/lib/shop/produkte";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";
import { standardTeilFarben, teilFarbenText, teilHexe } from "@/lib/shop/teilfarben";
import { gleichePosition } from "@/lib/shop/auswahl";

const farben = [
  { id: "schwarz", name: "Schwarz", hex: "#1c1c1c" },
  { id: "weiss", name: "Weiß", hex: "#f4f1ea" },
  { id: "orange", name: "Orange", hex: "#f57c1a" },
  { id: "gruen", name: "Grün", hex: "#2f6b2a" },
];
const laterne = holeProdukt("kuerbis-laterne")!;
const ctx: Kontext = { produkte: PRODUKTE.map((p) => ({ ...p, preisCent: 1290 })), farben, bestellbar: () => true };
const opt = { gesicht: "a" };

test("Standardfarben: Körper orange-ähnlich, Stiel grün-ähnlich", () => {
  assert.deepEqual(standardTeilFarben(laterne.teile!, farben), { koerper: "orange", stiel: "gruen" });
});
test("Standardfarben ohne passende Farbe: ähnlichste vorhandene, nie leer", () => {
  const r = standardTeilFarben(laterne.teile!, [farben[0], farben[1]]);
  assert.ok(r.koerper && r.stiel);
});
test("Anzeigetext und Hex je Teil, alte Warenkörbe ohne teilFarben bekommen Standard", () => {
  const a = { teilFarben: { koerper: "weiss", stiel: "schwarz" } };
  assert.equal(teilFarbenText(laterne, a, farben), "Kürbis: Weiß · Stiel: Schwarz");
  assert.deepEqual(teilHexe(laterne, a, farben), { koerper: "#f4f1ea", stiel: "#1c1c1c" });
  assert.equal(teilFarbenText(laterne, {}, farben), "Kürbis: Orange · Stiel: Grün");
});
test("gleichePosition unterscheidet Teilfarben", () => {
  const b = { slug: "x", farbeId: null, optionen: {}, text: "", schriftId: null, menge: 1 };
  assert.equal(gleichePosition({ ...b, teilFarben: { koerper: "a" } }, { ...b, teilFarben: { koerper: "b" } }), false);
  assert.equal(gleichePosition({ ...b, teilFarben: { koerper: "a" } }, { ...b, teilFarben: { koerper: "a" } }), true);
});
test("Server: Laterne mit gültigen Teilfarben ok, unbekannte Farbe -> farbe_ungueltig", () => {
  const ok = berechneWarenkorb([{ slug: "kuerbis-laterne", menge: 1, farbeId: null, optionen: opt, teilFarben: { koerper: "orange", stiel: "gruen" } }], ctx, "hermes");
  assert.ok(ok.ok);
  const bad = berechneWarenkorb([{ slug: "kuerbis-laterne", menge: 1, farbeId: null, optionen: opt, teilFarben: { koerper: "pink", stiel: "gruen" } }], ctx, "hermes");
  assert.ok(!bad.ok);
  if (!bad.ok) assert.equal(bad.fehler.code, "farbe_ungueltig");
});
test("Stiftetasse: Text 14 Zeichen ok, 15 zu lang, eigener Text = individuell (kein Widerruf)", () => {
  const t = holeProdukt("stiftebecher-tasse")!;
  assert.equal(t.personalisierung?.maxLaenge, 14);
  assert.equal(istIndividuell(t, "Stifte"), true);
  const p = (text: string) => berechneWarenkorb([{ slug: t.slug, menge: 1, farbeId: "schwarz", text, schriftId: "montserrat" }], ctx, "hermes");
  assert.ok(p("Stifte").ok);
  assert.ok(!p("12345678901234567").ok);
});
