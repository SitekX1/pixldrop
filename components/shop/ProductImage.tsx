import type { Form } from "@/lib/shop/produkte";
import { umbrechen } from "@/lib/shop/umbruch";

// Mehrzeiliger, zentrierter SVG-Text (Mittelpunkt cy), Zeilenabstand 1,15.
function Zeilen({ zeilen, size, x, cy, fill, family, weight = 700 }: { zeilen: string[]; size: number; x: number; cy: number; fill: string; family: string; weight?: number }) {
  const lh = size * 1.15;
  const y0 = cy - ((zeilen.length - 1) * lh) / 2 + size * 0.35;
  return (
    <text textAnchor="middle" fontSize={size} fontWeight={weight} fill={fill} style={{ fontFamily: family }}>
      {zeilen.map((z, i) => <tspan key={i} x={x} y={y0 + i * lh}>{z}</tspan>)}
    </text>
  );
}

// Bildplatzhalter bis echte Fotos da sind: Honig-Fläche, Objekt in der Produktfarbe, Typ-Badge
// (§ 5 UWG: Muster/Render/Foto muss gekennzeichnet sein). Keine Stockbilder.
const DUNKEL = "#1f1428";
const LICHT = "#ffe9a8";

function Schild({ c, text, family }: { c: string; text?: string; family?: string }) {
  const [klein, gross] = (text ?? "Teamleiter\nSabine").split("\n");
  const f = family ?? "sans-serif";
  const u = umbrechen((gross ?? "").replace(/\n/g, " "), 66, 15, 8, 3, 30);
  return (
    <g>
      <rect x="10" y="28" width="80" height="46" rx="7" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <text x="16" y="39" fontSize="5.2" fill="rgba(255,255,255,.8)" style={{ fontFamily: f }}>{klein}</text>
      <Zeilen zeilen={u.zeilen} size={u.size} x={50} cy={58} fill="#fff" family={f} />
      <rect x="22" y="74" width="56" height="5" rx="2" fill="rgba(0,0,0,.25)" />
    </g>
  );
}

function Kuerbis({ c, gesicht, offen }: { c: string; gesicht?: boolean; offen?: boolean }) {
  return (
    <g>
      <ellipse cx="30" cy="56" rx="20" ry="27" fill={c} />
      <ellipse cx="70" cy="56" rx="20" ry="27" fill={c} />
      <ellipse cx="50" cy="56" rx="22" ry="29" fill={c} stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
      <rect x="46" y="20" width="8" height="12" rx="3" fill="#3f5a2a" />
      {gesicht && (
        <g fill={LICHT}>
          <path d="M36 48 L46 48 L41 40 Z" />
          <path d="M54 48 L64 48 L59 40 Z" />
          <path d="M36 64 Q50 78 64 64 L58 62 L54 67 L50 62 L46 67 L42 62 Z" />
        </g>
      )}
      {offen && (
        <g>
          <ellipse cx="50" cy="34" rx="15" ry="5" fill={DUNKEL} opacity=".75" />
          <circle cx="50" cy="33" r="4" fill={LICHT} />
        </g>
      )}
    </g>
  );
}

function Geist({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 34 V14 A14 14 0 0 1 14 14 V34 L9 29 L4.5 34 L0 29 L-4.5 34 L-9 29 Z" fill={c} stroke="rgba(0,0,0,.22)" strokeWidth="1.2" />
      <circle cx="-5" cy="16" r="2.4" fill={DUNKEL} />
      <circle cx="5" cy="16" r="2.4" fill={DUNKEL} />
    </g>
  );
}

function Motiv({ form, c, text, family }: { form: Form; c: string; text?: string; family?: string }) {
  switch (form) {
    case "rund":
      return (
        <g>
          <circle cx="50" cy="50" r="35" fill={c} stroke="rgba(0,0,0,.2)" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="27" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
          {text ? (() => {
            const u = umbrechen(text.replace(/\n/g, " "), 46, 11, 6.5, 4, 40);
            return <Zeilen zeilen={u.zeilen} size={u.size} x={50} cy={50} fill="rgba(0,0,0,.65)" family={family ?? "sans-serif"} />;
          })() : (
            <rect x="30" y="46" width="40" height="8" rx="4" fill="rgba(0,0,0,.22)" />
          )}
        </g>
      );
    case "set":
      return (
        <g stroke="rgba(0,0,0,.2)" strokeWidth="1.2">
          {[18, 34, 50, 66, 82].map((x, i) => (
            <circle key={x} cx={x} cy={50} r={20} fill={c} fillOpacity={0.55 + i * 0.11} />
          ))}
        </g>
      );
    case "pegel":
      return (
        <g>
          <rect x="32" y="16" width="36" height="68" rx="7" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="38" y={26 + i * 11} width={10 + i * 4} height="6" rx="3" fill="rgba(255,255,255,.7)" />
          ))}
          <circle cx="60" cy="48" r="5" fill="#f0bb55" stroke="#2e1c0f" strokeWidth="1.5" />
        </g>
      );
    case "schild":
      return <Schild c={c} text={text} family={family} />;
    case "laterne":
      return <Kuerbis c={c} gesicht />;
    case "geister":
      return (
        <g>
          <Geist x={26} y={34} s={1.05} c={c} />
          <Geist x={74} y={34} s={1.05} c={c} />
          <Geist x={50} y={42} s={1.25} c={c} />
        </g>
      );
    case "teelicht":
      return <Kuerbis c={c} offen />;
    case "untersetzer-kuerbis":
      return (
        <g>
          <circle cx="50" cy="50" r="35" fill={c} stroke="rgba(0,0,0,.2)" strokeWidth="1.5" />
          <g transform="translate(50 52) scale(.42) translate(-50 -56)" opacity=".9">
            <Kuerbis c={DUNKEL} gesicht />
          </g>
        </g>
      );
  }
}

export default function ProductImage({
  form, farbe, typ = "Illustration", breit = false, text, family,
}: { form: Form; farbe: string; typ?: string; breit?: boolean; text?: string; family?: string }) {
  return (
    <div className={`shop-img ${breit ? "shop-img--wide" : ""}`} role="img" aria-label={`Produktillustration: ${typ}`}>
      <svg className="motiv" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d="M70 92C86 86 96 70 94 54" fill="none" stroke="rgba(107,68,35,.28)" strokeWidth="5" strokeLinecap="round" />
        <Motiv form={form} c={farbe} text={text} family={family} />
      </svg>
      <span className="shop-placeholder-tag">{typ}</span>
    </div>
  );
}
