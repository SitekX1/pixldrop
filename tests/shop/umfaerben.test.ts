import test from "node:test";
import assert from "node:assert/strict";
import { bereiten, umfaerben, zielFarben, hexZuRgb } from "@/lib/shop/umfaerben";

// 4x4-Testbild: linke Haelfte Objekt (grau, Verlauf), rechte Haelfte Hintergrund
function bild(w: number, h: number, f: (x: number, y: number) => [number, number, number, number]) {
  const rgba = new Uint8ClampedArray(w * h * 4); const maske = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, m] = f(x, y); const i = (y * w + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; maske[i] = m; maske[i + 3] = 255;
  }
  return { rgba, maske };
}

test("hexZuRgb liest #rrggbb und lehnt Unsinn ab", () => {
  assert.deepEqual(hexZuRgb("#ff6a13"), [255, 106, 19]);
  assert.equal(hexZuRgb("rot"), null);
});

test("farbe: Objekt bekommt die Zielfarbe, Hintergrund bleibt unveraendert", () => {
  const w = 40, h = 4;
  const { rgba, maske } = bild(w, h, (x) => (x < 20 ? [60 + x * 8, 60 + x * 8, 60 + x * 8, 255] : [200, 190, 180, 0]));
  const v = bereiten("farbe", rgba, maske, w, h);
  const out = new Uint8ClampedArray(w * h * 4);
  umfaerben(v, zielFarben("farbe", { farbe: "#2e7d32" }), out);
  const i = (2 * w + 30) * 4; // Hintergrund
  assert.deepEqual([out[i], out[i + 1], out[i + 2]], [200, 190, 180]);
  const j = (2 * w + 10) * 4; // Objekt: gruen dominiert
  assert.ok(out[j + 1] > out[j] && out[j + 1] > out[j + 2], "Gruenanteil dominiert");
  // Helle Stelle heller als dunkle Stelle (Schattierung bleibt)
  const hell = out[(2 * w + 19) * 4 + 1], dunkel = out[(2 * w + 0) * 4 + 1];
  assert.ok(hell > dunkel);
});

test("ohne Zielfarbe bleibt das Bild unveraendert", () => {
  const w = 8, h = 2;
  const { rgba, maske } = bild(w, h, () => [100, 120, 140, 255]);
  const v = bereiten("farbe", rgba, maske, w, h);
  const out = new Uint8ClampedArray(w * h * 4);
  umfaerben(v, zielFarben("farbe", {}), out);
  assert.deepEqual(Array.from(out.slice(0, 4)), [100, 120, 140, 255]);
});

test("kombi: blauer Bereich wird zur Akzentfarbe, dunkler zur Grundfarbe", () => {
  const w = 40, h = 2;
  const { rgba, maske } = bild(w, h, (x) => (x < 20 ? [15 + x, 15 + x, 18 + x, 255] : [40 + (x - 20), 150 + (x - 20), 220, 255]));
  const v = bereiten("kombi", rgba, maske, w, h);
  const out = new Uint8ClampedArray(w * h * 4);
  umfaerben(v, zielFarben("kombi", { farben: ["#1c1c1c", "#ff6a13", "#f4f1ea"] }), out);
  const dunkel = (0 * w + 5) * 4, blau = (0 * w + 30) * 4;
  assert.ok(out[blau] > out[blau + 2], "Akzent wird orange (R > B)");
  assert.ok(out[dunkel] < 80, "Grund bleibt dunkel");
});

test("Modus untersetzer: Linien aus dem G-Kanal der Maske, Untersetzer aus R", async () => {
  const { bereiten, umfaerben, zielFarben } = await import("@/lib/shop/umfaerben");
  const w = 8, h = 8, n = w * h;
  const rgba = new Uint8ClampedArray(n * 4), maske = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const linie = i % w === 3;
    rgba.set(linie ? [200, 200, 200, 255] : [30, 30, 30, 255], i * 4);
    maske.set([255, linie ? 255 : 0, 0, 255], i * 4);
  }
  const v = bereiten("untersetzer", rgba, maske, w, h);
  assert.equal(v.klasseGew.length, 2);
  assert.equal(v.klasseGew[1][3], 1);
  assert.equal(v.klasseGew[0][3], 0);
  const ziele = zielFarben("untersetzer", { farbe: "#0000ff", linienfarbe: "#ff0000" });
  assert.deepEqual(ziele, [[0, 0, 255], [255, 0, 0]]);
  const out = new Uint8ClampedArray(n * 4);
  umfaerben(v, ziele, out);
  assert.ok(out[3 * 4] > out[3 * 4 + 2] * 2, "Linie rot");
  assert.ok(out[0 * 4 + 2] > out[0 * 4] * 2, "Untersetzer blau");
});

test("Modus teile: Koerper und Stiel getrennt gefaerbt (G-Kanal der Maske = Stiel), Oeffnung bleibt", async () => {
  const { bereiten, umfaerben, zielFarben } = await import("@/lib/shop/umfaerben");
  const w = 6, h = 1;
  // Pixel 0: Koerper (orange), 1: Stiel (schwarz), 2: Gesichtsoeffnung (ausserhalb der Maske)
  const rgba = new Uint8ClampedArray([240, 130, 40, 255, 20, 20, 20, 255, 120, 0, 10, 255, 240, 130, 40, 255, 20, 20, 20, 255, 240, 130, 40, 255]);
  const maske = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255, 255, 255, 0, 255, 255, 0, 0, 255]);
  const v = bereiten("teile", rgba, maske, w, h);
  const out = new Uint8ClampedArray(w * h * 4);
  umfaerben(v, zielFarben("teile", { teile: { koerper: "#0000ff", stiel: "#00ff00" } }), out);
  assert.ok(out[2] > out[0] && out[2] > out[1], "Koerper blau");
  assert.ok(out[5] > out[4] && out[5] > out[6], "Stiel gruen");
  assert.deepEqual([out[8], out[9], out[10]], [120, 0, 10], "Oeffnung unveraendert");
});

test("Teile-Foto: Originalfarben (orange/schwarz) zeigen das unveraenderte Foto", async () => {
  const { istOriginalTeile } = await import("@/lib/shop/fotos");
  assert.equal(istOriginalTeile("kuerbis-laterne", { koerper: "#f57c1a", stiel: "#1c1c1c" }), true);
  assert.equal(istOriginalTeile("kuerbis-laterne", { koerper: "#f4f1ea", stiel: "#1c1c1c" }), false);
  assert.equal(istOriginalTeile("kuerbis-laterne", { koerper: "#f57c1a", stiel: "#2f6b2a" }), false);
  assert.equal(istOriginalTeile("kuerbis-laterne", undefined), false);
});
