// Umfärben für den Kürbis-Teelichthalter (schwarzes, gerilltes Foto mit leuchtendem LED-Teelicht).
// Eigene Variante statt umfaerben(): Schattierung als Multiplikator der Zielfarbe (Farbton bleibt, Rillen bleiben sichtbar),
// Weiß wird nicht überstrahlt, und der Rand bekommt die Schattierung von innen (kein dunkler Saum aus dem schwarzen Originalfoto).
import type { Vorbereitet } from "@/lib/shop/umfaerben";

const klemme = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);

function box3(src: Float32Array, w: number, h: number): Float32Array {
  const t = new Float32Array(src.length), o = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w; t[i + x] = (src[i + Math.max(0, x - 1)] + src[i + x] + src[i + Math.min(w - 1, x + 1)]) / 3; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { o[y * w + x] = (t[Math.max(0, y - 1) * w + x] + t[y * w + x] + t[Math.min(h - 1, y + 1) * w + x]) / 3; }
  return o;
}

export function teelichtFaerben(v: Vorbereitet, ziel: [number, number, number] | null, dest: Uint8ClampedArray) {
  const { w, h, orig, maske } = v, n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (0.2126 * orig[i * 4] + 0.7152 * orig[i * 4 + 1] + 0.0722 * orig[i * 4 + 2]) / 255;
  const lumS = box3(box3(lum, w, h), w, h);
  // Perzentile (3 % / 97 %) der Helligkeit im sicheren Inneren des Objekts
  const hist = new Uint32Array(256); let tot = 0;
  for (let i = 0; i < n; i++) if (maske[i] > 0.95) { hist[Math.min(255, (lumS[i] * 255) | 0)]++; tot++; }
  let lo = 0, hi = 1;
  if (tot > 50) {
    let acc = 0;
    for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= tot * 0.03) { lo = k / 255; break; } }
    acc = 0;
    for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= tot * 0.97) { hi = k / 255; break; } }
    hi = Math.max(hi, lo + 0.06);
  }
  const vN = new Float32Array(n);
  for (let i = 0; i < n; i++) vN[i] = klemme((lumS[i] - lo) / (hi - lo));
  // Rand: Saumpixel (Maske < 0,95) übernehmen die Schattierung des nächsten sicheren Nachbarn (3 Durchgänge, je 1 px)
  const ok = new Uint8Array(n);
  for (let i = 0; i < n; i++) ok[i] = maske[i] > 0.95 ? 1 : 0;
  for (let pass = 0; pass < 4; pass++) {
    const ok2 = ok.slice(), v2 = vN.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (ok[i] || maske[i] <= 0.003) continue;
      let s = 0, c = 0;
      for (const d of [-1, 1, -w, w]) if (ok[i + d]) { s += vN[i + d]; c++; }
      if (c) { v2[i] = s / c; ok2[i] = 1; }
    }
    ok.set(ok2); vN.set(v2);
  }
  const t = ziel;
  const lt = t ? (0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]) / 255 : 0;
  const lift = klemme((lt - 0.6) / 0.3);
  for (let i = 0; i < n; i++) {
    const o = i * 4, m = maske[i];
    if (!t || m <= 0.003) { dest[o] = orig[o]; dest[o + 1] = orig[o + 1]; dest[o + 2] = orig[o + 2]; dest[o + 3] = 255; continue; }
    const s = vN[i];
    const g = (0.36 + 0.64 * Math.pow(s, 0.8)) * (1 - 0.1 * lift); // Weiß: höchstens ca. 90 %, Rillen bleiben als Grau sichtbar
    const gl = klemme((s - 0.82) / 0.18) * 0.16 * (1 - lift); // dezenter Glanz auf den Lichtkanten (nicht bei Weiß)
    for (let c = 0; c < 3; c++) {
      const col = t[c] * g * (1 - gl) + 255 * gl;
      dest[o + c] = orig[o + c] * (1 - m) + col * m;
    }
    dest[o + 3] = 255;
  }
}
