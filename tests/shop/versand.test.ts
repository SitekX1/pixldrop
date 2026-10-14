import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUKTE } from "@/lib/shop/produkte";
import {
  VERSAND_BRIEF, VERSAND_PREISE, VERSAND_PRODUKTE,
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

const labelDe = (l: { art: string; label: string }[], art: string) => l.find((o) => o.art === art)?.label;

test("Volumenmodell: einzelne Artikel passen in die kleinste Stufe (Paeckchen)", () => {
  for (const slug of ["namensschild", "stiftebecher-tasse", "kuerbis-laterne", "geister-set", "geister-set-klein", "kuerbis-klein-set", "kuerbis-teelichthalter"]) {
    const o = versandOptionen([{ slug, menge: 1 }]);
    assert.deepEqual(arten(o), ["hermes", "dhl"], slug);
    assert.equal(cent(o, "hermes"), VERSAND_PREISE.hermes.klein.cent, slug);
    assert.equal(cent(o, "hermes"), 410);
    assert.equal(cent(o, "dhl"), 510);
    assert.equal(VERSAND_PRODUKTE[slug].versandStufe, "klein", slug);
  }
});

test("Volumenmodell: mehr Ware => groessere Stufe, ganz viel => mehrere Pakete, nie leer", () => {
  const tasse = (n: number) => versandOptionen([{ slug: "stiftebecher-tasse", menge: n }]);
  assert.equal(cent(tasse(1), "hermes"), 410);
  assert.equal(cent(tasse(6), "hermes"), 500, "6 Tassen: Paket S");
  assert.equal(cent(tasse(20), "hermes"), 600, "20 Tassen: Paket M");
  const viele = tasse(120);
  assert.deepEqual(arten(viele), ["hermes", "dhl"]);
  assert.match(labelDe(viele, "hermes") ?? "", /Pakete/);
  assert.ok((cent(viele, "hermes") ?? 0) > 600, "mehrere Pakete kosten mehr als eines");
  // monoton: mehr Menge nie billiger
  let letzte = 0;
  for (let n = 1; n <= 150; n++) {
    const c = cent(tasse(n), "hermes") ?? 0;
    assert.ok(c >= letzte, `Menge ${n}`);
    letzte = c;
  }
});

test("Volumenmodell: Mischkorb rechnet das Gesamtvolumen, nicht die groesste Stufe", () => {
  const klein = versandOptionen([{ slug: "namensschild", menge: 1 }, { slug: "stiftebecher-tasse", menge: 1 }]);
  assert.equal(cent(klein, "hermes"), 410);
  const mehr = versandOptionen([{ slug: "kuerbis-laterne", menge: 2 }, { slug: "geister-set", menge: 1 }, { slug: "stiftebecher-tasse", menge: 1 }]);
  assert.ok((cent(mehr, "hermes") ?? 0) >= 500);
});

test("Volumenmodell: Untersetzer-Set mit Box ist ein Paeckchen, DHL ab 2 kg Gewicht teurer", () => {
  const box = versandOptionen([{ slug: "wochentags-untersetzer-set", menge: 1, optionen: { box: "mit" } }]);
  assert.equal(cent(box, "hermes"), 410);
  // 15 Sets mit Box = 2,5 kg: DHL "Paket 2 kg" reicht nicht mehr, wird auf die 5-kg-Stufe gehoben
  const schwer = versandOptionen([{ slug: "wochentags-untersetzer-set", menge: 15, optionen: { box: "mit" } }]);
  assert.equal(cent(schwer, "dhl"), VERSAND_PREISE.dhl.gross.cent);
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
  assert.ok((cent(u, "hermes") ?? 0) >= 410, "unbekannt = grosszuegiger Quader, nie Brief");
});

test("versandOptionenFuerKorb ist tolerant gegenueber Muell", () => {
  const o = versandOptionenFuerKorb([null, 5, { slug: 3 }, { slug: "spruch-untersetzer", menge: 1, optionen: "x", text: "hi" }]);
  assert.deepEqual(arten(o), ["brief"]);
  assert.deepEqual(versandOptionenFuerKorb([]), []);
});
