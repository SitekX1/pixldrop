import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";
import KachelLichter from "@/components/KachelLichter";
import { SchlittenGrafik, SchichtMuster, Tannen } from "@/components/shop/WeihnachtenSvgs";
import { SAISONEN } from "@/lib/shop/saison";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });
const serif = Fraunces({ subsets: ["latin"], weight: ["600"], style: ["italic"], display: "swap", preload: false });

// Weihnachtskachel der Startseite ("Lichter gehen an", Coming soon). Dieselbe Welt wie der Shop-Hero in klein, ohne Eddie und Logo.
// Schlitten steht still (keine Bewegung in der Kachel), nur die Birnen gehen einmalig an (KachelLichter), Flocken per CSS.
const FARBEN = ["#F0BB55", "#FFD98F", "#F0BB55", "#FFE7B3", "#F0BB55", "#FFD98F", "#F0BB55"];
const P0 = [920, 10], P1 = [560, 150], P2 = [-10, 175];
const punkt = (t: number): [number, number] => [
  (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
  (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
];
const BIRNEN = FARBEN.map((f, i) => ({ f, p: punkt(0.28 + i * 0.105) }));
const FLOCKEN = [8, 22, 38, 55, 70, 88].map((x, i) => ({ x, d: 9 + i * 1.1, delay: -i * 1.7 }));

export default function ShopPromoCardWeihnachten({ modus }: { modus: "preview" | "sale" }) {
  const t = SAISONEN.weihnachten.texte;
  return (
    <TrackedLink href="/3d-druck" className="card spc" event="shop-click">
      <div className="card-glow" />
      <div className="spc-bild" aria-hidden="true">
        <svg className="spc-szene" viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs><SchichtMuster id="spc-schicht" /></defs>
          <circle cx="845" cy="72" r="50" fill="#F6EAD0" opacity=".12" />
          <circle cx="845" cy="72" r="32" fill="#F6EAD0" />
          <path d="M0 420 Q220 372 470 408 T900 392 V500 H0 Z" fill="#1A3442" />
          <Tannen liste={[[560, 410, 1.5], [640, 414, 1.1], [330, 416, 1], [250, 420, .7]]} fill="#1A3442" muster="spc-schicht" />
          <path d="M0 458 Q260 430 520 452 T900 444 V500 H0 Z" fill="#E6F1F5" />
        </svg>
        <div className="spc-sled"><SchlittenGrafik idp="spc" /></div>
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
          <span key={i} className="spc-flocke" style={{ left: `${f.x}%`, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }} />
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
