import test from "node:test";
import assert from "node:assert/strict";
import { holeProdukt } from "@/lib/shop/produkte";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { echtPasst, standardFormat, groessteDiePasst, type Messer } from "@/lib/shop/textformat";

const schrift = SCHRIFTEN.find((s) => s.id === "montserrat")!;
const schild = holeProdukt("namensschild")!.personalisierung!;
const tasse = holeProdukt("stiftebecher-tasse")!.personalisierung!;
// Messer: jedes Zeichen gleich breit (em), W doppelt so breit
const messer = (em: number): Messer => (t) => [...t].reduce((a, c) => a + (c === "W" ? em * 2 : em), 0);

test("Namensschild: Name, der die Mindesthoehe unterschreitet, wird mit echter Breite abgelehnt", () => {
  const f = standardFormat(2);
  // 20 breite Zeichen: Schaetzung (Durchschnitt) laesst es durch, echte Breite nicht
  const e = echtPasst(schild, ["WWWWWWWWWWWWWWWWWWWW", "Titel"], schrift, f, messer(0.64));
  assert.equal(e?.passt, false);
  assert.match(e?.meldung ?? "", /Name.*zu lang.*8 mm/);
});

test("Namensschild: normaler Name passt, zu langer Titel meldet den Titel", () => {
  const f = standardFormat(2);
  assert.equal(echtPasst(schild, ["Alexander Sitek", "Content Creator"], schrift, f, messer(0.64))?.passt, true);
  const e = echtPasst(schild, ["Alex", "W".repeat(28)], schrift, f, messer(0.64));
  assert.equal(e?.passt, false);
  assert.match(e?.meldung ?? "", /Titel.*4 mm/);
});

test("nicht messbar -> null (dann gilt nur die Schaetzung)", () => {
  assert.equal(echtPasst(schild, ["Alex", "Titel"], schrift, standardFormat(2), () => null), null);
});

test("Tasse: Zeile, die die Schaetzung besteht, aber real zu breit ist, wird abgelehnt; Auto-Groesse nimmt kleinere Stufe", () => {
  const f = standardFormat(1);
  const breit = (t: string) => t.length * 0.9; // breite Schrift: Schaetzung (0,64 em) ist zu optimistisch
  assert.equal(echtPasst(tasse, ["Stifte"], schrift, f, () => 0.4)?.passt, true);
  assert.equal(echtPasst(tasse, ["Stifte"], schrift, { ...f, groesse: "l" }, breit)?.passt, false);
  assert.equal(echtPasst(tasse, ["Stifte"], schrift, { ...f, groesse: "s" }, breit)?.passt, true);
  const g = groessteDiePasst(tasse, ["Stifte"], schrift, f, (gr) => echtPasst(tasse, ["Stifte"], schrift, { ...f, groesse: gr }, breit)?.passt !== false);
  assert.equal(g, "s");
});
