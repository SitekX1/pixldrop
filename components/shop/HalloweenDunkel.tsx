import { Kuerbis, Geist } from "./HalloweenSvgs";

// Dunkler Halloween-Look fuer die Shop-Hauptseite (data-saison="halloween-dark"): eigene SVG-/CSS-Grafiken, kein Bild.
// Dekorativ: aria-hidden, pointer-events:none, hinter dem Inhalt. Bewegung nur transform/opacity, bei prefers-reduced-motion statisch (shop.css "hwd-").

function Netz({ className }: { className: string }) {
  return (
    <svg className={`hwd-web ${className}`} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M0 0 L160 0 M0 0 L0 160 M0 0 L146 84 M0 0 L84 146 M0 0 L158 40 M0 0 L40 158 M0 0 L120 120" />
        <path d="M22 0 Q18 18 0 22 M46 0 Q36 36 0 46 M72 0 Q56 56 0 72 M100 0 Q78 78 0 100 M132 0 Q104 104 0 132 M158 0 Q128 128 0 158" />
      </g>
    </svg>
  );
}

function Fledermaus({ className }: { className: string }) {
  return (
    <svg className={`hwd-bat ${className}`} viewBox="0 0 44 24" aria-hidden="true" focusable="false">
      <g className="hwd-wings">
        <path d="M22 22 L19 14 C15 17 9 16 6 11 C4 14 2 14 0 12 C2 8 3 4 4 1 C8 5 12 5 16 6 L19 4 L22 9 L25 4 L28 6 C32 5 36 5 40 1 C41 4 42 8 44 12 C42 14 40 14 38 11 C35 16 29 17 25 14 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

function Spinne({ className, faden }: { className: string; faden: number }) {
  const y = faden;
  return (
    <svg className={`hwd-spider ${className}`} viewBox={`0 0 40 ${y + 30}`} aria-hidden="true" focusable="false">
      <path d={`M20 0 L20 ${y}`} stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <g transform={`translate(20 ${y + 10})`}>
        <ellipse cx="0" cy="4" rx="6" ry="7.5" fill="#050d0d" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="0" cy="-4.5" r="3.6" fill="#050d0d" stroke="currentColor" strokeWidth="0.8" />
        <path d="M-5 0 L-13 -6 M-5 3 L-15 3 M-5 6 L-13 12 M-4 8 L-9 16 M5 0 L13 -6 M5 3 L15 3 M5 6 L13 12 M4 8 L9 16" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="-1.4" cy="-4.8" r="0.9" fill="#5cf5d3" />
        <circle cx="1.4" cy="-4.8" r="0.9" fill="#5cf5d3" />
      </g>
    </svg>
  );
}

// Mond: Randabdunkelung, Maria, Krater, Koernung (feTurbulence einmal, statisch, kleines Element), Wolkenschleier ziehen langsam vorbei.
function Mond() {
  return (
    <div className="hwd-moon">
      <svg className="hwd-moon-svg" viewBox="0 0 200 200" focusable="false">
        <defs>
          <radialGradient id="hwd-m-base" cx="40%" cy="36%" r="72%">
            <stop offset="0" stopColor="#e4fbf4" /><stop offset="0.55" stopColor="#a9e4d6" /><stop offset="1" stopColor="#6fbfb0" />
          </radialGradient>
          <radialGradient id="hwd-m-limb" cx="50%" cy="50%" r="50%">
            <stop offset="0.62" stopColor="#0a3a36" stopOpacity="0" /><stop offset="1" stopColor="#06201f" stopOpacity="0.62" />
          </radialGradient>
          <radialGradient id="hwd-m-kr" cx="35%" cy="35%" r="70%">
            <stop offset="0" stopColor="#3d8b80" stopOpacity="0.55" /><stop offset="0.7" stopColor="#5aa89b" stopOpacity="0.3" /><stop offset="1" stopColor="#e4fbf4" stopOpacity="0.5" />
          </radialGradient>
          <filter id="hwd-m-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" /></filter>
          <filter id="hwd-m-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.35  0 0 0 0 0.32  0 0 0 0.55 -0.12" />
          </filter>
          <clipPath id="hwd-m-clip"><circle cx="100" cy="100" r="98" /></clipPath>
        </defs>
        <g clipPath="url(#hwd-m-clip)">
          <circle cx="100" cy="100" r="98" fill="url(#hwd-m-base)" />
          <g filter="url(#hwd-m-blur)" fill="#3f8f84" opacity="0.5">
            <ellipse cx="72" cy="66" rx="26" ry="20" /><ellipse cx="116" cy="58" rx="20" ry="15" />
            <ellipse cx="92" cy="112" rx="30" ry="22" /><ellipse cx="136" cy="100" rx="16" ry="20" />
            <ellipse cx="60" cy="128" rx="14" ry="10" />
          </g>
          <g fill="url(#hwd-m-kr)">
            <circle cx="46" cy="96" r="9" /><circle cx="130" cy="140" r="14" /><circle cx="150" cy="74" r="7" />
            <circle cx="108" cy="150" r="6" /><circle cx="88" cy="38" r="8" /><circle cx="64" cy="152" r="5" /><circle cx="160" cy="112" r="5" />
          </g>
          <rect width="200" height="200" filter="url(#hwd-m-grain)" opacity="0.7" />
          <circle cx="100" cy="100" r="98" fill="url(#hwd-m-limb)" />
        </g>
      </svg>
      <span className="hwd-wolke hwd-wolke--1" />
      <span className="hwd-wolke hwd-wolke--2" />
    </div>
  );
}

function Gluehwuermchen() {
  return (
    <>
      <span className="hwd-ff hwd-ff--1" /><span className="hwd-ff hwd-ff--2" /><span className="hwd-ff hwd-ff--3" />
      <span className="hwd-ff hwd-ff--4" /><span className="hwd-ff hwd-ff--5" /><span className="hwd-ff hwd-ff--6" />
    </>
  );
}

function Grab({ x, y, r = 0, kreuz = false }: { x: number; y: number; r?: number; kreuz?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      {kreuz
        ? <path d="M-3 4 V-30 H-11 V-37 H-3 V-48 H4 V-37 H12 V-30 H4 V4 Z" />
        : <path d="M-13 4 V-30 Q-13 -46 0 -46 Q13 -46 13 -30 V4 Z" />}
    </g>
  );
}

function Rabe({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <ellipse cx="0" cy="-8" rx="11" ry="7" transform="rotate(-18)" />
      <circle cx="10" cy="-17" r="5" />
      <path d="M14 -18 L23 -15 L14 -14 Z" />
      <path d="M-8 -4 L-26 4 L-9 -1 Z" />
    </g>
  );
}

// Friedhofs-Silhouette am Seitenende: Spukschloss, kahle Baeume, Graeber, Zaun, Raben, Kerzen, Totenkopf. Fast schwarz, minimaler Mint-Rand.
function Friedhof() {
  return (
    <svg className="hwd-yard" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" focusable="false">
      <defs>
        <pattern id="hwd-zaun" width="15" height="46" patternUnits="userSpaceOnUse"><path d="M3 46 V12 L7.5 4 L12 12 V46 Z" fill="#020707" stroke="#5ff0d0" strokeOpacity="0.28" strokeWidth="0.7" /></pattern>
        <radialGradient id="hwd-kerze" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffb347" stopOpacity="0.55" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <radialGradient id="hwd-fenster" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffb347" stopOpacity="0.35" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
      </defs>
      <g fill="#020707" stroke="#5ff0d0" strokeOpacity="0.3" strokeWidth="0.8" strokeLinejoin="round">
        <path d="M0 300 V248 Q150 226 300 244 T600 240 T900 246 T1200 238 V300 Z" />
        <g>
          <rect x="560" y="128" width="150" height="120" />
          <path d="M556 128 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h6 v6 h-158 Z" />
          <rect x="518" y="92" width="52" height="156" /><path d="M514 92 L544 36 L574 92 Z" />
          <rect x="694" y="100" width="56" height="148" /><path d="M690 100 L722 44 L754 100 Z" />
          <rect x="606" y="62" width="50" height="70" /><path d="M600 62 L631 6 L662 62 Z" />
          <path d="M631 6 V-14 M631 -14 L646 -9 L631 -4" fill="none" />
          <path d="M600 248 V216 Q631 196 662 216 V248 Z" />
        </g>
        <g fill="none" stroke="#020707" strokeWidth="7" strokeLinecap="round">
          <path d="M168 252 L170 176 M170 196 L138 160 L116 128 M170 180 L204 146 L222 112 M138 160 L110 160 M204 146 L238 150 M170 170 L168 124 L158 96" />
          <path d="M1030 252 L1028 170 M1028 192 L1060 156 L1086 120 M1028 176 L998 144 L980 108 M1060 156 L1090 158 M998 144 L968 146 M1028 166 L1030 118 L1040 90" />
        </g>
        <Rabe x={222} y={112} />
        <Rabe x={980} y={108} flip />
        <rect x="0" y="214" width="470" height="38" fill="url(#hwd-zaun)" stroke="none" />
        <rect x="0" y="226" width="470" height="3" /><rect x="0" y="240" width="470" height="3" />
        <rect x="790" y="216" width="410" height="38" fill="url(#hwd-zaun)" stroke="none" />
        <rect x="790" y="228" width="410" height="3" /><rect x="790" y="242" width="410" height="3" />
        <Grab x={60} y={252} r={-6} /><Grab x={250} y={254} r={5} kreuz /><Grab x={330} y={250} r={-4} />
        <Grab x={430} y={252} r={7} kreuz /><Grab x={820} y={252} r={-7} /><Grab x={890} y={254} r={4} kreuz />
        <Grab x={1110} y={250} r={6} /><Grab x={1165} y={252} r={-3} kreuz /><Grab x={765} y={258} r={3} />
        <g transform="translate(496 252)">
          <path d="M-14 4 L14 -2 M-14 -2 L14 4" stroke="#0e2321" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="0" cy="-9" rx="8" ry="8" fill="#0e2321" /><rect x="-5" y="-4" width="10" height="7" fill="#0e2321" />
          <circle cx="-3" cy="-9" r="2" fill="#020707" stroke="none" /><circle cx="3" cy="-9" r="2" fill="#020707" stroke="none" />
        </g>
      </g>
      <g fill="#ffb347">
        <circle className="hwd-fen hwd-fen--1" cx="544" cy="124" r="22" fill="url(#hwd-fenster)" />
        <path className="hwd-fen hwd-fen--1" d="M540 134 V120 Q544 112 548 120 V134 Z" />
        <path className="hwd-fen hwd-fen--2" d="M627 98 V82 Q631 74 635 82 V98 Z" />
        <path className="hwd-fen hwd-fen--3" d="M718 128 V112 Q722 104 726 112 V128 Z" />
        <path className="hwd-fen hwd-fen--2" d="M590 176 V162 Q594 155 598 162 V176 Z" />
        <path className="hwd-fen hwd-fen--4" d="M668 178 V164 Q672 157 676 164 V178 Z" />
        <path className="hwd-fen hwd-fen--3" d="M627 40 V30 Q631 24 635 30 V40 Z" />
      </g>
      <g>
        <circle className="hwd-flamme" cx="365" cy="238" r="18" fill="url(#hwd-kerze)" />
        <rect x="362" y="242" width="6" height="12" fill="#1b2e2c" /><ellipse className="hwd-flamme" cx="365" cy="238" rx="2.2" ry="4" fill="#ffb347" />
        <circle className="hwd-flamme hwd-flamme--b" cx="855" cy="242" r="18" fill="url(#hwd-kerze)" />
        <rect x="852" y="246" width="6" height="12" fill="#1b2e2c" /><ellipse className="hwd-flamme hwd-flamme--b" cx="855" cy="242" rx="2.2" ry="4" fill="#ffb347" />
      </g>
    </svg>
  );
}

export default function HalloweenDunkel() {
  return (
    <div className="hwd" aria-hidden="true">
      <div className="hwd-blitz" />
      <Mond />
      <div className="hwd-fog hwd-fog--1" />
      <div className="hwd-fog hwd-fog--2" />
      <div className="hwd-fog hwd-fog--3" />
      <Netz className="hwd-web--tl" />
      <Netz className="hwd-web--tr" />
      <Netz className="hwd-web--bl" />
      <Netz className="hwd-web--br" />
      <Spinne className="hwd-spider--1" faden={120} />
      <Spinne className="hwd-spider--2" faden={70} />
      <Spinne className="hwd-spider--3" faden={90} />
      <Fledermaus className="hwd-bat--1" />
      <Fledermaus className="hwd-bat--2" />
      <Fledermaus className="hwd-bat--3" />
      <Gluehwuermchen />
      <div className="hwd-bodennebel" />
      <Friedhof />
      <Kuerbis className="hwd-fl hwd-k1" />
      <Kuerbis className="hwd-fl hwd-k2" />
      <Kuerbis className="hwd-fl hwd-k3" />
      <Kuerbis className="hwd-fl hwd-k4" />
      <Geist className="hwd-fl hwd-g1" />
      <Geist className="hwd-fl hwd-g2" />
      <Geist className="hwd-fl hwd-g3" />
      <Geist className="hwd-fl hwd-g4" />
    </div>
  );
}
