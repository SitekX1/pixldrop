import type { Form } from "@/lib/shop/produkte";
import { umbrechen, passtInFlaeche, FLAECHE_RUND, FLAECHE_UNTERSETZER, FLAECHE_BECHER, type Flaeche } from "@/lib/shop/umbruch";
import { FETT_FAKTOR } from "@/lib/shop/schriften";
import type { TextFormat } from "@/lib/shop/textformat";
import NamensschildSvg from "./NamensschildSvg";

// Textformat der Vorschau (Fett/Kursiv je Zeile, Größenstufe) und Zeichenbreite der Schrift für den Umbruch.
export interface VorschauFormat { fmt: TextFormat; breite: number; /** Namensschild: eigene Schrift der Titelzeile */ titel?: { schriftId: string; breite: number; family: string }; /** Schrift-ID (für Kappenhöhe, Namensschild) */ schriftId?: string }

// Mehrzeiliger, zentrierter SVG-Text (Mittelpunkt cy), Zeilenabstand 1,15.
function Zeilen({ zeilen, size, x, cy, fill, family, weight = 700, kursiv = false }: { zeilen: string[]; size: number; x: number; cy: number; fill: string; family: string; weight?: number; kursiv?: boolean }) {
  const lh = size * 1.15;
  const y0 = cy - ((zeilen.length - 1) * lh) / 2 + size * 0.35;
  return (
    <text textAnchor="middle" fontSize={size} fontWeight={weight} fontStyle={kursiv ? "italic" : "normal"} fill={fill} style={{ fontFamily: family }}>
      {zeilen.map((z, i) => <tspan key={i} x={x} y={y0 + i * lh}>{z}</tspan>)}
    </text>
  );
}

// Bildplatzhalter bis echte Fotos da sind: Honig-Fläche, Objekt in der Produktfarbe, Typ-Badge
// (§ 5 UWG: Muster/Render/Foto muss gekennzeichnet sein). Keine Stockbilder.
const DUNKEL = "#1f1428";

// WCAG-Kontrast: Textfarbe (dunkel/hell) nach Untergrund wählen, damit >= 4,5:1 erreicht wird.
function leuchtdichte(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const k = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
export function textfarbeFuer(hex: string) {
  const l = leuchtdichte(hex);
  const kDunkel = (l + 0.05) / (leuchtdichte(DUNKEL) + 0.05);
  const kHell = 1.05 / (l + 0.05);
  return kDunkel >= kHell ? DUNKEL : "#ffffff";
}
const LICHT = "#ffe9a8";

function Schild({ c, text, family, format, tc: tcWahl }: { c: string; text?: string; family?: string; format?: VorschauFormat; tc?: string }) {
  const tc = tcWahl ?? textfarbeFuer(c);
  const [name, titel] = (text ?? "Eddie Pixldrop\nContent Creator").split("\n");
  const fm = format?.fmt;
  return (
    <NamensschildSvg
      name={name ?? ""} titel={titel ?? ""} schriftId={format?.schriftId ?? "montserrat"} family={family ?? "sans-serif"}
      platte={c} schrift={tc} breiteEm={format?.breite ?? 0.6} titelSchriftId={format?.titel?.schriftId} titelFamily={format?.titel?.family} titelBreiteEm={format?.titel?.breite}
      fmtName={{ fett: fm?.fett[0] === true, kursiv: fm?.kursiv[0] === true }}
      fmtTitel={{ fett: fm?.fett[1] === true, kursiv: fm?.kursiv[1] === true }}
    />
  );
}

const STIEL = "#3f5a2a";

/**
 * EINSTIEGSPUNKT für echte Produktfotos mit Teile-Masken (noch nicht gebaut):
 * Später hier statt der SVG-Fläche ein Foto rendern und je Teil (teileFarben: teilId -> hex) eine Maske
 * (z. B. Alpha-Maske als CSS mask-image oder SVG <mask>) in der gewählten Farbe darüberlegen.
 * Die Aufrufer (ProductBuy, Warenkorb, Bon) übergeben teileFarben bereits, sie müssen dafür nicht geändert werden.
 */
function Kuerbis({ c, gesicht, offen, teileFarben }: { c: string; gesicht?: boolean; offen?: boolean; teileFarben?: Record<string, string> }) {
  const stiel = teileFarben?.stiel ?? STIEL;
  c = teileFarben?.koerper ?? c;
  return (
    <g>
      <ellipse cx="30" cy="56" rx="20" ry="27" fill={c} />
      <ellipse cx="70" cy="56" rx="20" ry="27" fill={c} />
      <ellipse cx="50" cy="56" rx="22" ry="29" fill={c} stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
      <rect x="46" y="20" width="8" height="12" rx="3" fill={stiel} stroke="rgba(0,0,0,.22)" strokeWidth="1" />
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

// Stiftebecher in Tassenform: Tassenkörper, Henkel, Textfläche wie beim Tischschild.
function Tasse({ c, text, family, format, tc: tcWahl }: { c: string; text?: string; family?: string; format?: VorschauFormat; tc?: string }) {
  const tc = tcWahl ?? textfarbeFuer(c);
  const t = (text ?? "Stifte").replace(/\n/g, " ");
  const fm = format?.fmt;
  const fit = format && fm ? passtInFlaeche({ text: t, flaeche: FLAECHE_BECHER, groesse: fm.groesse, breite: format.breite, fett: fm.fett[0] === true, fettFaktor: FETT_FAKTOR }) : null;
  const u = fit?.passt ? fit : umbrechen(t, 36, fit ? fit.size : 6, 4, 2, 21);
  return (
    <g>
      <path d="M72 38 H82 a9 9 0 0 1 9 9 v12 a9 9 0 0 1 -9 9 H70" fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <path d="M17 26 H73 V70 a14 14 0 0 1 -14 14 H31 a14 14 0 0 1 -14 -14 Z" fill={c} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <rect x="17" y="26" width="56" height="6" rx="2" fill="rgba(0,0,0,.18)" />
      <g transform="translate(45 56) scale(0.66) translate(-45 -56)"><Zeilen zeilen={u.zeilen} size={u.size} x={45} cy={56} fill={tc} family={family ?? "sans-serif"} weight={fm?.fett[0] ? 900 : 700} kursiv={fm?.kursiv[0] === true} /></g>
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

const TAGE = ["Mo", "Di", "Mi", "Do", "Fr"];

// Wochentags-Untersetzer mit fertiger Farbkombination: [Grund, Akzent (Ring), Schrift].
function KombiUntersetzer({ x, y, r, kf, label, size }: { x: number; y: number; r: number; kf: string[]; label: string; size: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={kf[0]} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
      <circle cx={x} cy={y} r={r * 0.78} fill="none" stroke={kf[1]} strokeWidth={r * 0.1} />
      <text x={x} y={y + size * 0.35} textAnchor="middle" fontSize={size} fontWeight={800} fill={kf[2]} style={{ fontFamily: "system-ui, sans-serif" }}>{label}</text>
    </g>
  );
}

/** Wunschtext der runden Fläche (Untersetzer), mittig bei (50|50) in einer 100er-Zeichnung; Größe und Umbruch wie die Passt-Prüfung (FLAECHE_RUND). */
export function RundText({ text, family, format, tc, flaeche = FLAECHE_RUND }: { flaeche?: Flaeche; text: string; family?: string; format?: VorschauFormat; tc: string }) {
  const t = text.replace(/\n/g, " ");
  const fm = format?.fmt;
  const fit = format && fm ? passtInFlaeche({ text: t, flaeche, groesse: fm.groesse, breite: format.breite, fett: fm.fett[0] === true, fettFaktor: FETT_FAKTOR }) : null;
  const u = fit?.passt ? fit : umbrechen(t, flaeche.breite, fit ? fit.size : 11, 6.5, 4, 40);
  return <Zeilen zeilen={u.zeilen} size={u.size} x={50} cy={50} fill={tc} family={family ?? "sans-serif"} weight={fm?.fett[0] ? 900 : 700} kursiv={fm?.kursiv[0] === true} />;
}

// Zierlinien am Rand des Individuellen Untersetzers (Winkel in Grad, 0 = rechts, im Uhrzeigersinn), wie auf dem Foto: oben und unten lang, an den Seiten kurze Stücke.
const LINIEN_BOGEN: [number, number][] = [[226, 347], [-4, 16], [36, 142], [162, 188], [196, 208]];
export function linienPfad(cx: number, cy: number, r: number): string {
  const pt = (w: number) => `${(cx + r * Math.cos((w * Math.PI) / 180)).toFixed(2)} ${(cy + r * Math.sin((w * Math.PI) / 180)).toFixed(2)}`;
  return LINIEN_BOGEN.map(([a, b]) => `M${pt(a)} A${r} ${r} 0 ${((b - a + 360) % 360) > 180 ? 1 : 0} 1 ${pt(b)}`).join(" ");
}

function Motiv({ form, c, text, family, format, tc: tcWahl, lc, kf, tag, teileFarben }: { lc?: string; form: Form; tag?: string; teileFarben?: Record<string, string>; c: string; text?: string; family?: string; format?: VorschauFormat; tc?: string; kf?: string[] }) {
  const tc = tcWahl ?? textfarbeFuer(c);
  if (kf && kf.length >= 3 && form === "rund") return <KombiUntersetzer x={50} y={50} r={35} kf={kf} label={tag ?? "Mo"} size={20} />;
  if (kf && kf.length >= 3 && form === "set") {
    return (
      <g>
        {TAGE.map((t, i) => <KombiUntersetzer key={t} x={10 + i * 20} y={50} r={9.5} kf={kf} label={t} size={6.5} />)}
      </g>
    );
  }
  switch (form) {
    case "rund":
      return (
        <g>
          <circle cx="50" cy="50" r="35" fill={c} stroke="rgba(0,0,0,.2)" strokeWidth="1.5" />
          {lc
            ? <path d={linienPfad(50, 50, 31.5)} fill="none" stroke={lc} strokeWidth="0.9" strokeLinecap="round" />
            : <circle cx="50" cy="50" r="27" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />}
          {text ? <RundText text={text} family={family} format={format} tc={tc} flaeche={lc ? FLAECHE_UNTERSETZER : FLAECHE_RUND} /> : (
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
      return <Schild c={c} text={text} family={family} format={format} tc={tc} />;
    case "laterne":
      return <Kuerbis c={c} gesicht teileFarben={teileFarben} />;
    case "tasse":
      return <Tasse c={c} text={text} family={family} format={format} tc={tc} />;
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
  form, farbe, typ = "Illustration", breit = false, text, family, format, textfarbe, linienfarbe, farben, tag, teileFarben,
}: { /** Linienfarbe (Hex) der Zierlinien, nur Individueller Untersetzer */ linienfarbe?: string; form: Form; tag?: string; /** Mehrteilige Artikel: teilId -> Hex (z. B. koerper, stiel) */ teileFarben?: Record<string, string>; /** Farbkombination (Grund, Akzent, Schrift) fuer Wochentags-Untersetzer */ farben?: string[]; farbe: string; typ?: string; breit?: boolean; text?: string; family?: string; format?: VorschauFormat; /** gewählte Schriftfarbe (Hex); ohne Angabe automatisch kontrastreich */ textfarbe?: string }) {
  return (
    <div className={`shop-img ${breit ? "shop-img--wide" : ""}`} role="img" aria-label={`Produktillustration: ${typ}`}>
      <svg className="motiv" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d="M70 92C86 86 96 70 94 54" fill="none" stroke="rgba(107,68,35,.28)" strokeWidth="5" strokeLinecap="round" />
        <Motiv form={form} c={farbe} text={text} family={family} format={format} tc={textfarbe} lc={linienfarbe} kf={farben} tag={tag} teileFarben={teileFarben} />
      </svg>
      <span className="shop-placeholder-tag">{typ}</span>
    </div>
  );
}
