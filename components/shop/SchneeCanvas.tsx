"use client";

import { useEffect, useRef } from "react";

// Seitenweiter Schneefall (Canvas 2D, ein fixed Layer, pointer-events: none). Echte Kristalle aus dem Flocken-Atlas
// (public/shop/weihnachten/flocken-atlas.webp: 8 Kristalle je 128 px, obere Reihe scharf, untere leicht unscharf).
// Drei Tiefenebenen: hinten klein/scharf/langsam, Mitte, vorn groß + weich + schneller. Partikelzahl mobil halbiert.
// Pausiert bei verstecktem Tab und bei "Bewegung anhalten" (Attribut data-ruhe am .shop-Wrapper); bei prefers-reduced-motion
// wird nur ein ruhiges Standbild mit weniger Flocken gezeichnet. Kein Layout-Shift (fixed, ohne Einfluss auf den Fluss).
const ATLAS = "/shop/weihnachten/flocken-atlas.webp";

interface P { x: number; y: number; vy: number; vx: number; f: number; ph: number; amp: number; r: number; vr: number; s: number; k: number; row: number; a: number }
const EBENEN = [
  { n: [36, 18], s: [10, 18], vy: [18, 32], a: [0.5, 0.8], row: 0 },
  { n: [18, 9], s: [22, 36], vy: [38, 62], a: [0.6, 0.85], row: 0 },
  { n: [7, 3], s: [60, 100], vy: [90, 140], a: [0.3, 0.5], row: 1 },
] as const;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function SchneeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const mobil = window.innerWidth < 900;
    let reduziert = false;
    try { reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignorieren */ }
    const dpr = Math.min(window.devicePixelRatio || 1, mobil ? 1.25 : 1.5);
    let w = 0, h = 0, raf = 0, last = 0, t = 0, laeuft = false, bereit = false;
    const atlas = new Image();
    const teile: P[] = [];

    const neu = (e: (typeof EBENEN)[number], anfang: boolean): P => {
      const s = rnd(e.s[0], e.s[1]);
      return { x: rnd(-0.05, 1.05) * w, y: anfang ? rnd(-0.1, 1.1) * h : -s, vy: rnd(e.vy[0], e.vy[1]), vx: rnd(4, 14) * (e.row ? 1.6 : 1), f: rnd(0.3, 0.9), ph: rnd(0, 6.28), amp: rnd(6, 18) * (e.row ? 1.8 : 1), r: rnd(0, 6.28), vr: rnd(-0.5, 0.5), s, k: Math.floor(rnd(0, 8)), row: e.row, a: rnd(e.a[0], e.a[1]) };
    };
    const fuellen = () => {
      teile.length = 0;
      EBENEN.forEach((e) => {
        let n: number = e.n[mobil ? 1 : 0];
        if (reduziert) n = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) teile.push(neu(e, true));
      });
    };
    const zeichnen = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of teile) {
        const cos = Math.cos(p.r) * dpr, sin = Math.sin(p.r) * dpr;
        ctx.globalAlpha = p.a;
        ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
        ctx.drawImage(atlas, p.k * 128, p.row * 128, 128, 128, -p.s / 2, -p.s / 2, p.s, p.s);
      }
    };
    const schritt = (jetzt: number) => {
      raf = requestAnimationFrame(schritt);
      const dt = Math.min(0.05, (jetzt - last) / 1000 || 0.016);
      last = jetzt; t += dt;
      for (let i = 0; i < teile.length; i++) {
        const p = teile[i];
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(t * p.f + p.ph) * p.amp) * dt;
        p.r += p.vr * dt;
        if (p.y - p.s > h || p.x - p.s > w * 1.1) teile[i] = neu(EBENEN[p.row === 1 ? 2 : p.s > 18 ? 1 : 0], false);
      }
      zeichnen();
    };
    const start = () => { if (laeuft || reduziert || !bereit) return; laeuft = true; last = performance.now(); raf = requestAnimationFrame(schritt); };
    const stopp = () => { laeuft = false; cancelAnimationFrame(raf); };
    const shop = c.closest(".shop");
    const pruefen = () => {
      const ruhe = shop?.getAttribute("data-ruhe") === "an";
      if (document.hidden || ruhe) stopp(); else start();
    };
    const groesse = () => {
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      if (bereit && !laeuft) zeichnen();
    };

    groesse();
    fuellen();
    atlas.onload = () => { bereit = true; zeichnen(); pruefen(); };
    atlas.src = ATLAS;
    window.addEventListener("resize", groesse);
    document.addEventListener("visibilitychange", pruefen);
    const mo = shop ? new MutationObserver(pruefen) : null;
    if (shop && mo) mo.observe(shop, { attributes: true, attributeFilter: ["data-ruhe"] });
    return () => {
      stopp();
      window.removeEventListener("resize", groesse);
      document.removeEventListener("visibilitychange", pruefen);
      mo?.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="wn-schnee-c" aria-hidden="true" />;
}
