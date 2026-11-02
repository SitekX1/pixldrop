import Schlitten from "./Schlitten";
import { SchlittenGrafik, SchichtMuster, Tannen } from "./WeihnachtenSvgs";

// Hero-Szene des Weihnachts-Themes (Server-Komponente, nur SVG/CSS): Nachthimmel, Mond, Sterne, hinterer Hügel mit Tannen,
// der gelandete Schlitten und der vordere Schneehügel. Dekorativ (aria-hidden), nur der Steuerknopf ist bedienbar.
const STERNE: [number, number, number, number][] = [
  [40, 30, 1.6, 0.7], [120, 70, 1.2, 0.5], [210, 24, 1.8, 0.6], [300, 84, 1.2, 0.4], [380, 40, 1.6, 0.7], [470, 96, 1.2, 0.5], [540, 28, 1.4, 0.6],
  [610, 70, 1.8, 0.5], [90, 120, 1.2, 0.4], [250, 140, 1.4, 0.45], [430, 150, 1.2, 0.35], [690, 36, 1.4, 0.6], [740, 110, 1.2, 0.5], [770, 60, 1.8, 0.7],
];
const TANNEN: [number, number, number][] = [[470, 262, 1.15], [520, 266, 0.85], [90, 270, 0.7], [250, 268, 0.95], [310, 272, 0.6]];

export default function WeihnachtenHimmel() {
  return (
    <div className="wn-szene">
      <Schlitten>
        <svg className="wn-bg" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
          <defs><SchichtMuster id="wn-hg-schicht" /></defs>
          {STERNE.map(([x, y, r, o], i) => (
            <circle key={i} className={i % 5 === 0 ? `wn-stern wn-stern-${(i / 5) | 0}` : undefined} cx={x} cy={y} r={r} fill="var(--wn-snow)" opacity={o} />
          ))}
          <circle cx="650" cy="110" r="78" fill="var(--wn-moon)" opacity=".13" />
          <circle cx="650" cy="110" r="50" fill="var(--wn-moon)" />
          <circle cx="634" cy="96" r="9" fill="#E7D6B2" opacity=".6" /><circle cx="668" cy="124" r="6" fill="#E7D6B2" opacity=".6" /><circle cx="662" cy="90" r="4" fill="#E7D6B2" opacity=".6" />
          <path d="M0 262 Q130 226 290 256 T560 244 T800 258 V300 H0 Z" fill="var(--wn-ridge-back)" />
          <Tannen liste={TANNEN} fill="var(--wn-ridge-back)" muster="wn-hg-schicht" />
        </svg>
        <div className="wn-sled" aria-hidden="true">
          <SchlittenGrafik idp="wn" />
        </div>
        <svg className="wn-fg" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 24 Q120 2 260 18 T560 12 T800 22 V60 H0 Z" fill="var(--wn-ridge-front)" />
        </svg>
      </Schlitten>
    </div>
  );
}
