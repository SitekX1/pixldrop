// Schneefall rein per CSS (kein Canvas): transform-Animationen laufen auf dem Compositor. Werte fest (kein Math.random, sonst Hydration-Mismatch).
// Desktop 29 Flocken, mobil 15 (Flocken mit Klasse "d" erscheinen erst ab 900 px). Hinten/Mitte liegen hinter dem Inhalt, vorn davor.
type Flocke = { x: number; d: number; delay: number; s: number; w: number; nur?: "d" };

function liste(n: number, nMobil: number, dMin: number, dMax: number, s: number, w: number, versatz: number): Flocke[] {
  return Array.from({ length: n }, (_, i) => ({
    x: (i * 37 + versatz * 11 + (i % 3) * 7) % 100,
    d: dMin + ((i * 5 + versatz) % 7) * ((dMax - dMin) / 6),
    delay: -(((i * 13 + versatz * 3) % 17) / 17) * dMax,
    s: s + (i % 3) - 1 >= 2 ? s + (i % 3) - 1 : s,
    w: w + (i % 4) * 2,
    nur: i >= nMobil ? "d" : undefined,
  }));
}

const EBENEN: { name: string; flocken: Flocke[] }[] = [
  { name: "hinten", flocken: liste(14, 8, 24, 30, 3, 8, 1) },
  { name: "mitte", flocken: liste(10, 5, 15, 20, 5, 10, 4) },
  { name: "vorn", flocken: liste(5, 2, 10, 13, 7, 8, 9) },
];

export default function Schneefall() {
  return (
    <div className="wn-schnee" aria-hidden="true">
      {EBENEN.map((e) => (
        <div key={e.name} className={`wn-ebene wn-ebene--${e.name}`}>
          {e.flocken.map((f, i) => (
            <span
              key={i}
              className={f.nur ? "wn-flocke d" : "wn-flocke"}
              style={{ "--x": `${f.x}vw`, "--d": `${f.d}s`, "--delay": `${f.delay.toFixed(1)}s`, "--s": `${f.s}px`, "--w": `${f.w}px` } as React.CSSProperties}
            ><i /></span>
          ))}
        </div>
      ))}
    </div>
  );
}
