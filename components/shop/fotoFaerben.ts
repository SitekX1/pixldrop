// Gemeinsame Foto-Umfärbung für Galerie (720 px) und Warenkorb-Miniatur (kleine Auflösung): Foto + Maske laden, vorbereiten, im Cache halten.
import { bereiten, type UmfaerbModus, type Vorbereitet } from "@/lib/shop/umfaerben";

// Je Foto in 720 px ca. 10-16 MB (RGBA, Maske, Klassengewichte): nur die zuletzt benutzten behalten (Handy-Speicher). Miniaturen sind winzig.
const caches = new Map<number, Map<string, Promise<Vorbereitet | null>>>();

function ladeBild(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = src; });
}
function pixel(i: HTMLImageElement, g: number) {
  const c = document.createElement("canvas"); c.width = c.height = g;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) throw new Error("kein Canvas");
  x.drawImage(i, 0, 0, g, g);
  const d = x.getImageData(0, 0, g, g).data;
  c.width = c.height = 0; // Canvas-Speicher sofort freigeben (Handy)
  return d;
}

/** Foto + Maske laden und für das Umfärben vorbereiten (einmal je Foto und Auflösung, danach aus dem Cache). */
export function vorbereiteFoto(src: string, modus: UmfaerbModus, groesse: number, max: number): Promise<Vorbereitet | null> {
  let cache = caches.get(groesse);
  if (!cache) { cache = new Map(); caches.set(groesse, cache); }
  const key = `${modus}|${src}`;
  let p = cache.get(key);
  if (p) { cache.delete(key); cache.set(key, p); return p; } // zuletzt benutzt nach hinten
  const c = cache;
  p = Promise.all([ladeBild(src), ladeBild(src.replace(/\.webp$/, ".m.webp"))])
    .then(([f, m]) => bereiten(modus, pixel(f, groesse), pixel(m, groesse), groesse, groesse))
    .catch(() => null)
    .then((v) => { if (v === null) c.delete(key); return v; }); // Fehler nicht dauerhaft merken
  c.set(key, p);
  while (c.size > max) c.delete(c.keys().next().value as string);
  return p;
}

export function farbAbstand(a: string, b: string): number {
  const n = (h: string) => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const [x, y] = [n(a), n(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
