import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";
import KachelLichter from "@/components/KachelLichter";
import { SAISONEN } from "@/lib/shop/saison";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });
const serif = Fraunces({ subsets: ["latin"], weight: ["600"], style: ["italic"], display: "swap", preload: false });

// Weihnachtskachel der Startseite ("Lichter gehen an", Coming soon): echte Nachtlandschaft, der gelandete Santa (freigestellt, Hufe im Schnee),
// Lichterkette (geht beim Sichtbarwerden einmalig nacheinander an) und echte Schneekristalle (Sprite-Atlas) als Flocken. Kein Eddie, kein Logo.
// Bilder: /public/shop/weihnachten (Gemini-Assets von Alex, rembg-freigestellt); die SVG-Szene der ersten Fassung wird nicht mehr verwendet.
const BG = "/shop/weihnachten/hintergrund-nacht.webp";
const FARBEN = ["#F0BB55", "#FFD98F", "#F0BB55", "#FFE7B3", "#F0BB55", "#FFD98F", "#F0BB55"];
const P0 = [920, 10], P1 = [560, 150], P2 = [-10, 175];
const punkt = (t: number): [number, number] => [
  (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
  (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
];
const BIRNEN = FARBEN.map((f, i) => ({ f, p: punkt(0.28 + i * 0.105) }));
const FLOCKEN = [8, 22, 38, 55, 70, 88].map((x, i) => ({ x, d: 9 + i * 1.1, delay: -i * 1.7, k: (i * 3) % 8, s: 14 + (i % 3) * 7 }));

export default function ShopPromoCardWeihnachten({ modus }: { modus: "preview" | "sale" }) {
  const t = SAISONEN.weihnachten.texte;
  return (
    <TrackedLink href="/3d-druck" className="card spc" event="shop-click">
      <div className="card-glow" />
      <div className="spc-bild" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-bg" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-sled" src="/shop/weihnachten/santa-gelandet.webp" alt="" width={950} height={268} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-bg spc-bg-vorn" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        <span className="spc-dunkel" />
        <KachelLichter>
          <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" focusable="false">
            <path d="M920 10 Q560 150 -10 175" fill="none" stroke="#3b5566" strokeWidth="3" />
            {BIRNEN.map(({ f, p }, i) => (
              <g key={i} className="spc-birne" style={{ "--i": i } as React.CSSProperties} transform={`translate(${p[0].toFixed(0)} ${(p[1] + 2).toFixed(0)})`}>
                <circle className="spc-hof" cy="20" r="34" fill={f} />
                <path d="M0 0 L0 8" stroke="#3b5566" strokeWidth="3" />
                <path className="spc-glas" d="M-8 8 L8 8 L8 14 Q15 28 0 38 Q-15 28 -8 14 Z" fill={f} />
              </g>
            ))}
          </svg>
        </KachelLichter>
        {FLOCKEN.map((f, i) => (
          <span key={i} className="spc-flocke" style={{ left: `${f.x}%`, width: f.s, height: f.s, ["--k" as string]: f.k, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }} />
        ))}
        <span className={`spc-badge ${serif.className}`}>{t.kachelBadge[modus]}</span>
        <span className={`spc-titel ${titel.className}`}>Weihnachten<br />aus dem 3D-Drucker</span>
      </div>
      <div className="eyebrow-small">Advent 2026 &middot; selbst gedruckt</div>
      <h3>Weihnachten aus dem 3D-Drucker</h3>
      <p>
        {modus === "preview"
          ? "Teelichthalter, Deko und Kleinigkeiten, gerade frisch im Druck. Der Verkauf startet bald, stöbern kannst du schon."
          : "Teelichthalter, Deko und Kleinigkeiten für den Advent, frisch gedruckt und jetzt im Shop."}
      </p>
      <span className="pill-btn spc-btn">{t.kachelButton[modus]}</span>
    </TrackedLink>
  );
}
