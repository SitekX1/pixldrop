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

// Mond: klare Krater mit Rand und Schattierung, dunklere Meere (Maria), Randabdunkelung, KEINE Koernung/Turbulenz. Ein duenner Wolkenschleier.
function Krater({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#3a8a7e" fillOpacity="0.55" stroke="#2c7468" strokeOpacity="0.75" strokeWidth="0.8" />
      <circle cx={x + r * 0.22} cy={y + r * 0.22} r={r * 0.78} fill="#a9e6d9" fillOpacity="0.85" />
      <path d={`M${x - r} ${y} A${r} ${r} 0 0 1 ${x} ${y - r}`} fill="none" stroke="#f2fffb" strokeOpacity="0.7" strokeWidth="0.9" />
    </g>
  );
}

function Mond() {
  return (
    <div className="hwd-moon">
      <svg className="hwd-moon-svg" viewBox="0 0 200 200" focusable="false">
        <defs>
          <radialGradient id="hwd-m-base" cx="40%" cy="36%" r="72%">
            <stop offset="0" stopColor="#eafff9" /><stop offset="0.55" stopColor="#b4eadd" /><stop offset="1" stopColor="#7cc9ba" />
          </radialGradient>
          <radialGradient id="hwd-m-limb" cx="50%" cy="50%" r="50%">
            <stop offset="0.7" stopColor="#0a3a36" stopOpacity="0" /><stop offset="1" stopColor="#06201f" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="hwd-m-kr" cx="32%" cy="32%" r="75%">
            <stop offset="0" stopColor="#2f7d72" stopOpacity="0.8" /><stop offset="0.6" stopColor="#58a89b" stopOpacity="0.55" /><stop offset="1" stopColor="#d9fff6" stopOpacity="0.45" />
          </radialGradient>
          <filter id="hwd-m-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.8" /></filter>
          <clipPath id="hwd-m-clip"><circle cx="100" cy="100" r="98" /></clipPath>
        </defs>
        <g clipPath="url(#hwd-m-clip)">
          <circle cx="100" cy="100" r="98" fill="url(#hwd-m-base)" />
          <g filter="url(#hwd-m-soft)" fill="#4a9c8f" opacity="0.5">
            <path d="M48 52 C62 40 84 44 90 58 C96 72 80 84 66 82 C50 80 38 64 48 52 Z" />
            <path d="M104 44 C118 36 136 42 138 56 C140 68 124 72 112 68 C102 64 96 52 104 44 Z" />
            <path d="M84 104 C100 94 124 100 128 116 C132 132 110 142 92 138 C74 134 70 114 84 104 Z" />
            <path d="M136 90 C146 86 156 94 154 106 C152 116 140 118 134 110 C130 102 130 94 136 90 Z" />
            <path d="M44 120 C52 114 62 118 62 128 C62 136 52 140 46 134 C40 130 40 124 44 120 Z" />
          </g>
          <Krater x={46} y={92} r={10} /><Krater x={128} y={146} r={15} /><Krater x={152} y={70} r={8} />
          <Krater x={106} y={158} r={7} /><Krater x={86} y={34} r={9} /><Krater x={62} y={156} r={6} />
          <Krater x={164} y={112} r={6} /><Krater x={118} y={96} r={5} /><Krater x={30} y={130} r={5} /><Krater x={70} y={104} r={3} /><Krater x={140} y={52} r={3.5} /><Krater x={96} y={70} r={3} /><Krater x={150} y={126} r={3} /><Krater x={36} y={66} r={4} /><Krater x={120} y={176} r={3.5} />
          <circle cx="100" cy="100" r="98" fill="url(#hwd-m-limb)" />
        </g>
      </svg>
      <span className="hwd-wolke hwd-wolke--1" />
    </div>
  );
}

function Wolke({ className }: { className: string }) {
  return (
    <svg className={`hwd-cloud ${className}`} viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <path d="M10 52 Q0 52 4 43 Q8 33 20 35 Q24 20 41 22 Q52 8 68 20 Q84 13 92 30 Q108 30 108 43 Q116 52 104 52 Z" fill="#051616" stroke="#5ff0d0" strokeOpacity="0.16" strokeWidth="1" />
      <path d="M14 52 Q40 47 104 52" fill="none" stroke="#5ff0d0" strokeOpacity="0.22" strokeWidth="1.2" />
    </svg>
  );
}

function Laterne({ className, faden }: { className: string; faden: number }) {
  return (
    <svg className={`hwd-lat ${className}`} viewBox={`0 0 30 ${faden + 40}`} aria-hidden="true" focusable="false">
      <path d={`M15 0 L15 ${faden}`} stroke="#8fd9c9" strokeOpacity="0.6" strokeWidth="1" />
      <circle cx="15" cy={faden + 14} r="13" fill="url(#hwd-lat-g)" />
      <rect x="10" y={faden + 4} width="10" height="16" rx="2" fill="#2a1a08" stroke="#8fd9c9" strokeOpacity="0.5" strokeWidth="0.8" />
      <rect x="12" y={faden + 7} width="6" height="10" rx="1.5" fill="#ffb347" />
    </svg>
  );
}

function Sterne() {
  return <><div className="hwd-sterne hwd-sterne--a" /><div className="hwd-sterne hwd-sterne--b" /></>;
}

function Kuerbisgruppe() {
  return (
    <div className="hwd-kg">
      <Kuerbis className="hwd-kgp hwd-kgp--1" />
      <Kuerbis className="hwd-kgp hwd-kgp--2" />
      <Kuerbis className="hwd-kgp hwd-kgp--3" />
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

// Friedhofs-Szenerie am Seitenende: Spukschloss auf Huegel mit Grashalmen, kahle Baeume mit Mint-Rand, Vogelscheuche, Graeber, Zaun, Raben, Kerzen, Totenkopf.
function Vogelscheuche({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-1.8" y="-90" width="3.6" height="90" />
      <path d="M-40 -66 L-14 -62 L14 -62 L40 -66 L40 -61 L14 -56 L-14 -56 L-40 -61 Z" />
      <path d="M-14 -64 L14 -64 L11 -30 L-11 -30 Z" />
      <path d="M-40 -61 l-4 12 l5 -3 l2 8 l4 -14 Z M40 -61 l4 12 l-5 -3 l-2 8 l-4 -14 Z M-9 -30 l-3 10 l6 -4 l2 8 l3 -14 Z M9 -30 l3 10 l-6 -4 l-2 8 l-3 -14 Z" />
      <circle cx="0" cy="-77" r="9" />
      <path d="M-19 -82 H19 L9 -85 L5 -106 H-5 L-9 -85 Z" />
      <path d="M-4.5 -78 l2.4 2.4 M2 -78 l2.4 2.4" stroke="#ffb347" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function Friedhof() {
  const T = "translate(635 246) scale(0.7) translate(-635 -246)";
  return (
    <svg className="hwd-yard" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" focusable="false">
      <defs>
        <pattern id="hwd-zaun" width="15" height="46" patternUnits="userSpaceOnUse"><path d="M3 46 V12 L7.5 4 L12 12 V46 Z" fill="#020707" stroke="#5ff0d0" strokeOpacity="0.32" strokeWidth="0.7" /></pattern>
        <pattern id="hwd-gras" width="9" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 L2 3 L4 16 M4 16 L6.5 6 L9 16" fill="#020707" /></pattern>
        <radialGradient id="hwd-kerze" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffb347" stopOpacity="0.55" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <radialGradient id="hwd-fenster" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffb347" stopOpacity="0.4" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <radialGradient id="hwd-lat-g" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffb347" stopOpacity="0.5" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
      </defs>
      {/* Baeume: Mint-Rand (breiter, darunter) + schwarzer Kern */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#5ff0d0" strokeOpacity="0.5" strokeWidth="9.5">
          <path d="M168 252 L170 176 M170 196 L138 160 L116 128 M170 180 L204 146 L222 112 M138 160 L110 160 M204 146 L238 150 M170 170 L168 124 L158 96" />
          <path d="M1030 252 L1028 170 M1028 192 L1060 156 L1086 120 M1028 176 L998 144 L980 108 M1060 156 L1090 158 M998 144 L968 146 M1028 166 L1030 118 L1040 90" />
        </g>
        <g stroke="#020707" strokeWidth="7">
          <path d="M168 252 L170 176 M170 196 L138 160 L116 128 M170 180 L204 146 L222 112 M138 160 L110 160 M204 146 L238 150 M170 170 L168 124 L158 96" />
          <path d="M1030 252 L1028 170 M1028 192 L1060 156 L1086 120 M1028 176 L998 144 L980 108 M1060 156 L1090 158 M998 144 L968 146 M1028 166 L1030 118 L1040 90" />
        </g>
      </g>
      <g fill="#020707" stroke="#5ff0d0" strokeOpacity="0.4" strokeWidth="0.9" strokeLinejoin="round">
        <path d="M0 300 V248 Q150 228 300 244 T600 242 T900 246 T1200 238 V300 Z" />
        {/* Huegel unter dem Schloss */}
        <path d="M400 252 Q500 214 635 208 Q770 214 880 250 Z" />
        <g transform={T}>
          <rect x="560" y="128" width="150" height="120" />
          <path d="M556 128 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h6 v6 h-158 Z" />
          <rect x="518" y="92" width="52" height="156" /><path d="M514 92 L544 36 L574 92 Z" />
          <rect x="694" y="100" width="56" height="148" /><path d="M690 100 L722 44 L754 100 Z" />
          <rect x="606" y="62" width="50" height="70" /><path d="M600 62 L631 6 L662 62 Z" />
          <path d="M600 248 V216 Q631 196 662 216 V248 Z" />
        </g>
        <rect x="0" y="214" width="440" height="38" fill="url(#hwd-zaun)" stroke="none" />
        <rect x="0" y="226" width="440" height="3" /><rect x="0" y="240" width="440" height="3" />
        <rect x="860" y="216" width="340" height="38" fill="url(#hwd-zaun)" stroke="none" />
        <rect x="860" y="228" width="340" height="3" /><rect x="860" y="242" width="340" height="3" />
        <Grab x={60} y={252} r={-6} /><Grab x={250} y={254} r={5} kreuz /><Grab x={330} y={250} r={-4} />
        <Grab x={420} y={254} r={7} kreuz /><Grab x={900} y={252} r={-7} /><Grab x={955} y={254} r={4} kreuz />
        <Grab x={1110} y={250} r={6} /><Grab x={1165} y={252} r={-3} kreuz />
        <Rabe x={222} y={112} /><Rabe x={980} y={108} flip />
        <Vogelscheuche x={790} y={250} />
        <g transform="translate(486 254)">
          <path d="M-14 4 L14 -2 M-14 -2 L14 4" stroke="#0e2321" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="0" cy="-9" rx="8" ry="8" fill="#0e2321" /><rect x="-5" y="-4" width="10" height="7" fill="#0e2321" />
          <circle cx="-3" cy="-9" r="2" fill="#020707" stroke="none" /><circle cx="3" cy="-9" r="2" fill="#020707" stroke="none" />
        </g>
        <rect x="0" y="232" width="1200" height="16" fill="url(#hwd-gras)" stroke="none" />
        <rect x="380" y="200" width="520" height="16" fill="url(#hwd-gras)" stroke="none" opacity="0" />
      </g>
      <g transform={T} fill="#ffb347">
        <circle className="hwd-fen hwd-fen--1" cx="544" cy="124" r="22" fill="url(#hwd-fenster)" />
        <path className="hwd-fen hwd-fen--1" d="M540 134 V120 Q544 112 548 120 V134 Z" />
        <path className="hwd-fen hwd-fen--2" d="M627 98 V82 Q631 74 635 82 V98 Z" />
        <path className="hwd-fen hwd-fen--3" d="M718 128 V112 Q722 104 726 112 V128 Z" />
        <path className="hwd-fen hwd-fen--2" d="M590 176 V162 Q594 155 598 162 V176 Z" />
        <path className="hwd-fen hwd-fen--4" d="M668 178 V164 Q672 157 676 164 V178 Z" />
        <path className="hwd-fen hwd-fen--3" d="M627 40 V30 Q631 24 635 30 V40 Z" />
        <path className="hwd-fen hwd-fen--4" d="M608 236 V226 Q631 214 654 226 V236 Z" opacity="0.8" />
      </g>
      <g>
        <circle className="hwd-flamme" cx="365" cy="238" r="18" fill="url(#hwd-kerze)" />
        <rect x="362" y="242" width="6" height="12" fill="#1b2e2c" /><ellipse className="hwd-flamme" cx="365" cy="238" rx="2.2" ry="4" fill="#ffb347" />
        <circle className="hwd-flamme hwd-flamme--b" cx="1000" cy="242" r="18" fill="url(#hwd-kerze)" />
        <rect x="997" y="246" width="6" height="12" fill="#1b2e2c" /><ellipse className="hwd-flamme hwd-flamme--b" cx="1000" cy="242" rx="2.2" ry="4" fill="#ffb347" />
      </g>
    </svg>
  );
}

export default function HalloweenDunkel() {
  return (
    <div className="hwd" aria-hidden="true">
      <div className="hwd-blitz" />
      <Sterne />
      <Wolke className="hwd-cloud--1" />
      <Wolke className="hwd-cloud--2" />
      <Wolke className="hwd-cloud--3" />
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
      <Fledermaus className="hwd-bat--4" />
      <Fledermaus className="hwd-bat--5" />
      <Fledermaus className="hwd-bat--6" />
      <Laterne className="hwd-lat--1" faden={70} />
      <Laterne className="hwd-lat--2" faden={50} />
      <Laterne className="hwd-lat--3" faden={100} />
      <Gluehwuermchen />
      <div className="hwd-bodennebel" />
      <Friedhof />
      <Kuerbisgruppe />
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
