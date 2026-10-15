import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE } from "@/lib/shop/produkte";
import { SCHRIFTEN, fehlendeZeichen, fehlendeZeichenMeldung, umlauteErsetzen, unerlaubteZeichen } from "@/lib/shop/schriften";
import { berechneWarenkorb, type Kontext } from "@/lib/shop/server/preise";
import { versandOptionenFuerKorb } from "@/lib/shop/versand";

const NEU = ["artsy-morning", "bulbear", "oldwest", "rosemartin", "roundex", "start-story", "street-year", "the-sally", "travellia", "vegan-days", "welcome-drama", "winter-draw", "wood-dragon"];
const OHNE_ALLE = ["artsy-morning", "oldwest", "rosemartin", "start-story", "street-year", "the-sally", "vegan-days", "welcome-drama", "winter-draw", "wood-dragon"];
const UMLAUTE = "ÄÖÜäöüß";
const katalog = PRODUKTE.map((p) => ({ ...p, preisCent: 1290 }));
const ctx = (): Kontext => ({ produkte: katalog, farben: [{ id: "schwarz", name: "Schwarz", hex: "#1c1c1c" }], bestellbar: () => true });
const bestell = (text: string, schriftId: string, optionen?: Record<string, unknown>) =>
{
  const korb = [{ slug: "spruch-untersetzer", menge: 1, farbeId: "schwarz", text, schriftId, ...(optionen ? { optionen } : {}) }];
  return berechneWarenkorb(korb, ctx(), versandOptionenFuerKorb(korb)[0]?.art ?? "hermes");
};

test("13 neue Schriften vorhanden, Pflichtfelder gesetzt", () => {
  for (const id of NEU) {
    const s = SCHRIFTEN.find((x) => x.id === id);
    assert.ok(s, id);
    assert.ok(s.breite > 0.3 && s.breite < 0.8, id);
    assert.ok(s.family.startsWith("var(--font-sf-"), id);
    assert.equal(s.hatFett, false);
    assert.equal(s.hatKursiv, false);
  }
  assert.equal(SCHRIFTEN.find((x) => x.id === "montague"), undefined); // Lizenz unklar, entfernt
  assert.equal(new Set(SCHRIFTEN.map((s) => s.id)).size, SCHRIFTEN.length);
});

test("fehlendeZeichen je Schrift (laut cmap)", () => {
  for (const id of NEU) {
    const erwartet = OHNE_ALLE.includes(id) ? UMLAUTE : id === "bulbear" ? "ß" : "";
    assert.equal(SCHRIFTEN.find((x) => x.id === id)!.fehlendeZeichen, erwartet, id);
    assert.deepEqual(fehlendeZeichen("Müller Straße", id).sort(), Array.from(new Set(Array.from("Müller Straße").filter((c) => erwartet.includes(c)))).sort(), id);
    // fehlende Zeichen sind alle im erlaubten Zeichensatz
    assert.equal(unerlaubteZeichen(erwartet).length, 0, id);
  }
  assert.deepEqual(fehlendeZeichen("Müller Straße", "roundex"), []);
  assert.deepEqual(fehlendeZeichen("Müller Straße", "oldwest").sort(), ["ß", "ü"].sort());
  assert.deepEqual(fehlendeZeichen("Müller Straße", "bulbear"), ["ß"]);
  assert.deepEqual(fehlendeZeichen("Müller", "montserrat"), []);
  assert.deepEqual(fehlendeZeichen("Müller", "gibt-es-nicht"), []);
});

test("Umlaute ersetzen und Meldung", () => {
  assert.equal(umlauteErsetzen("Müller Straße ÄÖÜ äö"), "Mueller Strasse AeOeUe aeoe");
  assert.equal(umlauteErsetzen("Müller Straße", "ß"), "Müller Strasse");
  assert.deepEqual(fehlendeZeichen(umlauteErsetzen("Müller Straße"), "oldwest"), []);
  assert.match(fehlendeZeichenMeldung("Bär", "oldwest")!, /Die Schrift Old West hat kein „ä“/);
  assert.equal(fehlendeZeichenMeldung("Bar", "oldwest"), null);
});

test("Server lehnt fehlende Zeichen ab, ersetzte Texte gehen durch", () => {
  const r = bestell("Müller Straße", "oldwest");
  assert.ok(!r.ok);
  assert.equal(r.fehler.code, "schrift_zeichen_fehlen");
  assert.match(r.fehler.meldung ?? "", /Old West/);
  assert.ok(bestell("Mueller", "oldwest", { groesse: "s" }).ok);
  assert.ok(bestell("Müller Straße", "roundex").ok);
  const b = bestell("Müller Straße", "bulbear");
  assert.ok(!b.ok && b.fehler.code === "schrift_zeichen_fehlen");
});
