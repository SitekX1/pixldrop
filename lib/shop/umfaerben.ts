// Foto-Umfärben: das Foto behält Licht, Schatten und Struktur, nur die Farbe wird getauscht.
// Reine Pixel-Mathematik (ohne Browser-APIs), damit sie testbar ist. Maske = Freisteller des Objekts (<n>.m.webp).
//
// Modi:
//  "farbe"  : das ganze Objekt bekommt die gewählte Farbe (Geister, Kürbisse, Becher, Halter)
//  "kombi"  : Wochentags-Untersetzer, drei Bereiche (Grund dunkel / Akzent blau / Schrift weiß) -> farben[0..2]
//  "schild" : Namensschild, zwei Bereiche (Platte dunkel / Schrift blau) -> Plattenfarbe, Schriftfarbe
//  "untersetzer": Individueller Untersetzer, zwei Bereiche (Untersetzer dunkel / Zierlinien hell). Die Linien kommen aus dem
//                 G-Kanal der Maske (R = Untersetzer-Freisteller), nicht aus der Farbe -> Untersetzerfarbe, Linienfarbe
//  "grund"  : Halloween-Untersetzer: nur der dunkle Grund wird umgefärbt, das Motiv bleibt
//  "teile"  : Kürbis: zwei Teile (Körper orange / Stiel schwarz), getrennt über den G-Kanal der Maske (R = Freisteller ohne Gesichtsöffnungen, G = Stiel) -> Körperfarbe, Stielfarbe
//  "becher" : wie "farbe", aber fürs dunkle Becherfoto: Schattierung aus entrauschter Helligkeit (kein Körnungs-/Pigment-Rauschen), 5. bis 95. Perzentil, leicht aufgehellt (kein Grauschleier)
export type UmfaerbModus = "farbe" | "kombi" | "schild" | "grund" | "untersetzer" | "becher" | "teile";

export interface UmfaerbZiel { farbe?: string; farben?: string[]; textfarbe?: string; linienfarbe?: string; /** teilId -> Hex (koerper, stiel) */ teile?: Record<string, string> }

export function hexZuRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const KLASSEN: Record<UmfaerbModus, number> = { farbe: 1, kombi: 3, schild: 2, grund: 1, untersetzer: 2, becher: 1, teile: 2 };
const MIN_BEREICH = 0.24;
const klemme = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

/** Zielfarben je Klasse (null = Klasse bleibt unverändert). */
export function zielFarben(modus: UmfaerbModus, z: UmfaerbZiel): ([number, number, number] | null)[] {
  const h = (s?: string) => (s ? hexZuRgb(s) : null);
  switch (modus) {
    case "farbe": return [h(z.farbe)];
    case "grund": return [h(z.farbe)];
    case "becher": return [h(z.farbe)];
    case "schild": return [h(z.farbe), h(z.textfarbe)];
    case "untersetzer": return [h(z.farbe), h(z.linienfarbe)];
    case "teile": return [h(z.teile?.koerper ?? z.farbe), h(z.teile?.stiel)];
    case "kombi": return [h(z.farben?.[0]), h(z.farben?.[1]), h(z.farben?.[2])];
  }
}

/** Gewichte je Klasse aus der Originalfarbe (0..1 je Kanal). Summe der Gewichte <= 1. */
function klassen(modus: UmfaerbModus, r: number, g: number, b: number, l: number, out: number[], lin = 0) {
  switch (modus) {
    case "farbe": case "becher": out[0] = 1; return;
    case "grund": {
      // nur der dunkle, unbunte Grund: dunkle Motivfarben (Orange im Schatten) und Weiß bleiben unberührt
      const mx = Math.max(r, g, b), sat = ((mx - Math.min(r, g, b)) / (mx + 0.02)) * klemme((l - 0.08) / 0.1); // sehr dunkle Pixel: Farbrauschen ignorieren
      out[0] = klemme((0.3 - l) / 0.12) * (1 - klemme((sat - 0.22) / 0.18)); return;
    }
    case "untersetzer": case "teile": out[1] = lin; out[0] = 1 - lin; return;
    case "schild": {
      const bl = klemme((b - r - 0.1) / 0.15);
      out[1] = bl; out[0] = 1 - bl; return;
    }
    case "kombi": {
      const bl = klemme((b - r - 0.1) / 0.15);
      const wh = klemme((l - 0.32) / 0.12) * (1 - bl); // Schrift im Foto ist körnig/schattig (l ab ca. 0,4): niedrige Schwelle, sonst dunkle Flecken im Text
      out[1] = bl; out[2] = wh; out[0] = Math.max(0, 1 - bl - wh); return;
    }
  }
}

export interface Vorbereitet {
  w: number; h: number;
  orig: Uint8ClampedArray;      // RGBA des Fotos
  maske: Float32Array;          // 0..1
  klasseGew: Float32Array[];    // je Klasse Gewicht je Pixel
  schatten: Float32Array[];     // je Klasse normierte Helligkeit 0..1
}

/** Schattierung einer Klasse (0..1) aus der normierten Helligkeit v. Helle Akzentklassen (Schrift/Linien) bleiben hell (kein Grauschleier),
 *  die Untersetzerfläche wird flach gehalten (Körnung), flächige Objekte behalten Licht und Schatten. */
function kurve(modus: UmfaerbModus, c: number, v: number): number {
  if ((modus === "kombi" || modus === "untersetzer") && c >= 1) return 0.78 + 0.22 * v;
  if (modus === "untersetzer" || modus === "grund") return 0.6 + 0.3 * v;
  return 0.16 + 0.72 * Math.pow(v, 0.7); // max. 0,88: Weiß wird nicht überstrahlt
}

/** Mittelwert 5 x 5 (getrennt, Rand wird geklemmt). */
function glaette(src: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let d = -2; d <= 2; d++) a += src[y * w + Math.min(w - 1, Math.max(0, x + d))]; tmp[y * w + x] = a / 5; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let d = -2; d <= 2; d++) a += tmp[Math.min(h - 1, Math.max(0, y + d)) * w + x]; out[y * w + x] = a / 5; }
  return out;
}

/** Einmal je Foto: Klassengewichte und je Klasse normierte Helligkeit (2. bis 98. Perzentil). */
export function bereiten(modus: UmfaerbModus, rgba: Uint8ClampedArray, maskeR: Uint8ClampedArray | Uint8Array, w: number, h: number): Vorbereitet {
  const n = w * h, k = KLASSEN[modus];
  const maske = new Float32Array(n);
  const lum = new Float32Array(n);
  // Alle Modi außer "schild": entrauschte Schattierung und milde Kurve (kein Grauschleier, keine Körnung); "becher"/"farbe" glätten stärker (flächige Objekte)
  const weich = modus !== "schild";
  const becher = modus === "becher" || modus === "farbe" || modus === "untersetzer" || modus === "grund" || modus === "teile";
  const klasseGew = Array.from({ length: k }, () => new Float32Array(n));
  const tmp = new Array<number>(k).fill(0);
  for (let i = 0; i < n; i++) {
    maske[i] = maskeR[i * 4] / 255;
    const r = rgba[i * 4] / 255, g = rgba[i * 4 + 1] / 255, b = rgba[i * 4 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[i] = l;
    tmp.fill(0);
    klassen(modus, r, g, b, l, tmp, maskeR[i * 4 + 1] / 255);
    for (let c = 0; c < k; c++) klasseGew[c][i] = tmp[c];
  }
  // Becher: Schattierung aus entrauschter Helligkeit (2 x Mittelwert 5 x 5), damit weiße Pigmente/Körnung nicht mitgefärbt werden
  const lumS = becher ? glaette(glaette(lum, w, h), w, h) : weich ? glaette(lum, w, h) : lum;
  const pLo = weich ? 0.05 : 0.02, pHi = weich ? 0.95 : 0.98, minB = weich ? 0.14 : MIN_BEREICH;
  const schatten: Float32Array[] = [];
  for (let c = 0; c < k; c++) {
    const hist = new Uint32Array(256); let tot = 0;
    for (let i = 0; i < n; i++) if (maske[i] > 0.5 && klasseGew[c][i] > 0.6) { hist[Math.min(255, (lumS[i] * 255) | 0)]++; tot++; }
    let lo = 0, hi = 1;
    if (tot > 50) {
      let acc = 0, a = 0, b = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= tot * pLo) { a = v; break; } }
      acc = 0;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= tot * pHi) { b = v; break; } }
      // Kontrastarme Fotos (z. B. weiss auf hellem Grund) nicht zu stark spreizen: sonst werden Kompressionsbloecke sichtbar.
      hi = Math.max(b / 255, 0.04); lo = Math.min(a / 255, hi - minB);
    }
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = klemme((lumS[i] - lo) / (hi - lo)); s[i] = weich ? kurve(modus, c, v) : v; }
    schatten.push(s);
  }
  return { w, h, orig: rgba, maske, klasseGew, schatten };
}

/** Zielfarbe mit Schattierung s (0..1): dunkel bis leicht aufgehellte Lichter. */
function faerbe(t: [number, number, number], s: number, out: [number, number, number]) {
  // Helle Zielfarben (Weiß): Mitteltöne anheben, sonst wirkt Weiß auf dem dunklen Ausgangsfoto nur hellgrau. Dunkle Farben bleiben unverändert.
  const lt = (0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]) / 255;
  const lift = klemme((lt - 0.6) / 0.25);
  const s2 = s + lift * (1 - s) * 0.5;
  const b = 0.32 + 0.8 * s2;
  const f = b < 1 ? b : 1;
  const hl = b > 1 ? klemme((b - 1) / 0.12) * 0.35 : 0;
  for (let c = 0; c < 3; c++) out[c] = (t[c] * f * (1 - hl) + 255 * hl);
}

/** Schreibt das umgefärbte Bild in dest (RGBA, gleiche Größe). */
export function umfaerben(v: Vorbereitet, ziele: ([number, number, number] | null)[], dest: Uint8ClampedArray) {
  const n = v.w * v.h, k = ziele.length;
  const col: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const m = v.maske[i];
    const o = i * 4;
    if (m <= 0.003) { dest[o] = v.orig[o]; dest[o + 1] = v.orig[o + 1]; dest[o + 2] = v.orig[o + 2]; dest[o + 3] = 255; continue; }
    let rest = 1, r = 0, g = 0, b = 0;
    for (let c = 0; c < k; c++) {
      const t = ziele[c]; const gw = v.klasseGew[c][i];
      if (!t || gw <= 0) continue;
      faerbe(t, v.schatten[c][i], col);
      r += col[0] * gw; g += col[1] * gw; b += col[2] * gw; rest -= gw;
    }
    if (rest > 0) { r += v.orig[o] * rest; g += v.orig[o + 1] * rest; b += v.orig[o + 2] * rest; }
    dest[o] = v.orig[o] * (1 - m) + r * m;
    dest[o + 1] = v.orig[o + 1] * (1 - m) + g * m;
    dest[o + 2] = v.orig[o + 2] * (1 - m) + b * m;
    dest[o + 3] = 255;
  }
}
