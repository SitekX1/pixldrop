import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE } from "@/lib/shop/produkte";
import {
  VERSAND_BRIEF, VERSAND_PREISE, VERSAND_PRODUKTE, VERSAND_STUFE_HOEHER_UEBER_STUECK,
  istVersandArt, versandOptionen, versandOptionenFuerKorb,
} from "@/lib/shop/versand";

import { gueltigeVersandart } from "@/lib/shop/auswahl";

test("gueltigeVersandart: keine Vorauswahl bei mehreren Optionen", () => {
  const opt = [{ art: "hermes", cent: 499 }, { art: "dhl", cent: 549 }];
  assert.equal(gueltigeVersandart(opt, null), null);
  assert.equal(gueltigeVersandart(opt, "brief"), null); // ungueltige gespeicherte Art
  assert.equal(gueltigeVersandart(opt, "quatsch"), null);
  assert.equal(gueltigeVersandart(opt, "dhl")?.art, "dhl");
  assert.equal(gueltigeVersandart(opt, "hermes")?.art, "hermes");
});
test("gueltigeVersandart: Brief (eine Option) ist fest zugewiesen, leer => null", () => {
  const brief = [{ art: "brief", cent: 120 }];
  assert.equal(gueltigeVersandart(brief, null)?.art, "brief");
  assert.equal(gueltigeVersandart(brief, "dhl")?.art, "brief");
  assert.equal(gueltigeVersandart([], "dhl"), null);
});

const arten = (l: { art: string }[]) => l.map((o) => o.art);
const cent = (l: { art: string; cent: number }[], art: string) => l.find((o) => o.art === art)?.cent;

test("Jedes Produkt hat eine Versandkonfiguration", () => {
  for (const p of PRODUKTE) assert.ok(VERSAND_PRODUKTE[p.slug], p.slug);
});

test("Whitelist der Versandarten", () => {
  assert.ok(istVersandArt("hermes") && istVersandArt("dhl") && istVersandArt("brief"));
  for (const v of ["ups", "", null, undefined, 1, "Hermes"]) assert.equal(istVersandArt(v), false);
});

test("Stufen klein / mittel / gross: Hermes und DHL", () => {
  // klein: tischschild, mittel: stiftebecher; gross: eine Stufe hoeher ab > 4 Stueck
  const klein = versandOptionen([{ slug: "tischschild-erster-kaffee", menge: 1 }]);
  assert.deepEqual(arten(klein), ["hermes", "dhl"]);
  assert.equal(cent(klein, "hermes"), VERSAND_PREISE.hermes.klein.cent);
  assert.equal(cent(klein, "hermes"), 399);
  assert.equal(cent(klein, "dhl"), 419);
  const mittel = versandOptionen([{ slug: "stiftebecher-tasse", menge: 1 }]);
  assert.equal(cent(mittel, "hermes"), 489);
  assert.equal(cent(mittel, "dhl"), 519);
  const gross = versandOptionen([{ slug: "stiftebecher-tasse", menge: VERSAND_STUFE_HOEHER_UEBER_STUECK + 1 }]);
  assert.equal(cent(gross, "hermes"), 590);
  assert.equal(cent(gross, "dhl"), 769);
  // gedeckelt: noch mehr Stueck bleibt bei gross
  assert.equal(cent(versandOptionen([{ slug: "stiftebecher-tasse", menge: 20 }]), "hermes"), 590);
});

test("Hoechste Stufe der Positionen gewinnt; Schwelle erst ab mehr als 4 Stueck", () => {
  const gemischt = versandOptionen([{ slug: "tischschild-erster-kaffee", menge: 1 }, { slug: "stiftebecher-tasse", menge: 1 }]);
  assert.equal(cent(gemischt, "hermes"), 489);
  const vier = versandOptionen([{ slug: "tischschild-erster-kaffee", menge: 4 }]);
  assert.equal(cent(vier, "hermes"), 399, "genau 4 Stueck: keine hoehere Stufe");
  const fuenf = versandOptionen([{ slug: "tischschild-erster-kaffee", menge: 5 }]);
  assert.equal(cent(fuenf, "hermes"), 489, "5 Stueck: eine Stufe hoeher");
});

test("Brief: nur flache Untersetzer ohne Box, automatisch nach Stueckzahl", () => {
  const einzeln = (menge: number, optionen?: Record<string, unknown>) =>
    versandOptionen([{ slug: "wochentags-untersetzer-einzeln", menge, optionen }]);
  for (const m of [1, VERSAND_BRIEF.grossbrief.maxStueck]) {
    const o = einzeln(m, { box: "ohne" });
    assert.deepEqual(arten(o), ["brief"], "keine Auswahl: nur Brief");
    assert.equal(o[0].cent, 180);
    assert.match(o[0].label, /Großbrief/);
  }
  for (const m of [VERSAND_BRIEF.grossbrief.maxStueck + 1, VERSAND_BRIEF.maxibrief.maxStueck]) {
    const o = einzeln(m);
    assert.deepEqual(arten(o), ["brief"]);
    assert.equal(o[0].cent, 290);
    assert.match(o[0].label, /Maxibrief/);
  }
  // darueber: Paket
  assert.deepEqual(arten(einzeln(VERSAND_BRIEF.maxibrief.maxStueck + 1)), ["hermes", "dhl"]);
});

test("Brief: Box, nicht brieffaehige Artikel und Mischkorb schliessen Brief aus", () => {
  assert.deepEqual(arten(versandOptionen([{ slug: "wochentags-untersetzer-einzeln", menge: 1, optionen: { box: "mit" } }])), ["hermes", "dhl"]);
  assert.deepEqual(arten(versandOptionen([{ slug: "stiftebecher-tasse", menge: 1 }])), ["hermes", "dhl"]);
  assert.deepEqual(arten(versandOptionen([
    { slug: "wochentags-untersetzer-einzeln", menge: 1 }, { slug: "stiftebecher-tasse", menge: 1 },
  ])), ["hermes", "dhl"]);
  // Kork aendert nichts
  assert.deepEqual(arten(versandOptionen([{ slug: "spruch-untersetzer", menge: 1, optionen: { kork: "mit" } }])), ["brief"]);
});

test("Set zaehlt mit seinen Stuecken (5 Untersetzer = Maxibrief)", () => {
  const o = versandOptionen([{ slug: "wochentags-untersetzer-set", menge: 1, optionen: { box: "ohne" } }]);
  assert.deepEqual(arten(o), ["brief"]);
  assert.equal(o[0].cent, 290);
});

test("Leerer Korb und unbekannter Slug", () => {
  assert.deepEqual(versandOptionen([]), []);
  assert.deepEqual(versandOptionen([{ slug: "x", menge: 0 }]), []);
  const u = versandOptionen([{ slug: "gibt-es-nicht", menge: 1 }]);
  assert.deepEqual(arten(u), ["hermes", "dhl"]);
  assert.equal(cent(u, "hermes"), 489, "unbekannt = mittel, nie Brief");
});

test("versandOptionenFuerKorb ist tolerant gegenueber Muell", () => {
  const o = versandOptionenFuerKorb([null, 5, { slug: 3 }, { slug: "spruch-untersetzer", menge: 1, optionen: "x", text: "hi" }]);
  assert.deepEqual(arten(o), ["brief"]);
  assert.deepEqual(versandOptionenFuerKorb([]), []);
});
